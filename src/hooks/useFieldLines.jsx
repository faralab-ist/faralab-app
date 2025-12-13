import * as THREE from 'three';
import { useMemo } from 'react';
import calculateFieldAtPoint from '../utils/calculateField.js';

// returns true if point is 'after' the plane
function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip){
    if(!useSlice) return true;
    switch(slicePlane){
        case 'xy':
            return slicePlaneFlip ^ point.z > slicePos;
        case 'yz':
            return slicePlaneFlip ^ point.x > slicePos;
        case 'xz':
            return slicePlaneFlip ^ point.y > slicePos;
    }
}

const generatePlaneStartPoints = (plane, linesPerPlane) => {
    const points = [];
    const planePos = new THREE.Vector3(...plane.position);
    const planeNormal = new THREE.Vector3(...(plane.direction || [0, 1, 0])).normalize();
        
    // Create tangent vectors to the plane
    const tangent1 = new THREE.Vector3();
    if (Math.abs(planeNormal.y) > 0.9) {
        tangent1.set(1, 0, 0);
    } else {
        tangent1.set(0, 1, 0).cross(planeNormal);
    }
    const tangent2 = new THREE.Vector3().crossVectors(planeNormal, tangent1).normalize();
        
        // Generate points in a grid on the plane
    const size = 5; // Adjust based on plane size
    const gridSize = Math.sqrt(linesPerPlane);
    const steps = Math.floor(gridSize);
        
    for (let u = -size; u <= size; u += (2 * size) / steps) {
        for (let v = -size; v <= size; v += (2 * size) / steps) {
            const point = planePos.clone()
                .add(tangent1.clone().multiplyScalar(u))
                .add(tangent2.clone().multiplyScalar(v));
            points.push(point);
        }
    }
    
    return points;
};

// Generate start points for wires (points along and around the wire)
const generateWireStartPoints = (wire, linesPerWire) => {
    const points = [];
    const wirePos = new THREE.Vector3(...wire.position);
    const wireDir = new THREE.Vector3(...(wire.direction || [0, 1, 0])).normalize();
    
    // Determine if wire is finite or infinite
    const isFinite = !wire.infinite;
    const wireLength = isFinite ? (wire.length || 10) : 20;
    
    // Fixed number of points along the wire (independent of linesPerWire)
    const stepsAlongWire = 10;

    // linesPerWire controls how many radii we add
    const numAdditionalRadii = Math.max(0, Math.floor(linesPerWire / 8));
    const radii = [0, ...Array.from({length: numAdditionalRadii}, (_, i) => 0.5 + (i * 0.5))];
    
    for (let i = 0; i < stepsAlongWire; i++) {
        const t = (i / (stepsAlongWire - 1)) * wireLength - wireLength / 2;
        const pointAlongWire = wirePos.clone().add(wireDir.clone().multiplyScalar(t));
        
        // Generate points at different radii with different angular densities
        radii.forEach((radius,radiusIndex) => {

            let angularDensity;
            if (isFinite) {
                const distanceFromCenter = Math.abs(t); // Current position along wire
                const centerRegion = wireLength * 0.15; // 15% from center (30% total center region)
                const middleRegion = wireLength * 0.35; // 35% from center (70% total middle region)
                
                // If radius extends beyond wire end, reduce density
                if (distanceFromCenter <= centerRegion) {
                    angularDensity = 16; // Center region: 16 lines
                } else if (distanceFromCenter <= middleRegion) {
                    angularDensity = 8;  // Middle region: 8 lines
                } else {
                    angularDensity = 4;  // End regions: 4 lines
                }

            } else { 
                angularDensity = 16;
            } 
                
                // Add points around the circumference at this radius
            if (radius === 0) {
                // For center radius, only create ONE point (no angular variation)
                const point = pointAlongWire.clone();
                points.push(point);
            } else {
                // For other radii, create multiple angular points
                const tangent = new THREE.Vector3();
                if (Math.abs(wireDir.y) > 0.9) {
                    tangent.set(1, 0, 0);
                } else {
                    tangent.set(0, 1, 0).cross(wireDir);
                }
                const bitangent = new THREE.Vector3().crossVectors(wireDir, tangent).normalize();

                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI * 2 / angularDensity) {
                    const point = pointAlongWire.clone()
                        .add(tangent.clone().multiplyScalar(Math.cos(angle) * radius))
                        .add(bitangent.clone().multiplyScalar(Math.sin(angle) * radius));
                    points.push(point);
                }
            }
        });
    }
    
    return points;
};

// Generic field line tracer from a start point
const traceFieldLineFromPoint = (startPoint, sourceObj, allObjects, stepsPerLine, stepSize, minStrength, planeFilter = null) => {
    const points = [startPoint.clone()];
    let currentPos = startPoint.clone();

    for (let step = 0; step < stepsPerLine; step++) {
        const field = calculateFieldAtPoint(allObjects, currentPos);
        const fieldStrength = field.length();

        if (fieldStrength < minStrength) break;
        if (fieldStrength > 1000) break;

        const direction = field.normalize();
        // For negative charge density, reverse direction
        if (sourceObj.charge_density < 0) {
                direction.negate();
        }
            
        currentPos.add(direction.multiplyScalar(stepSize));
        
        // Apply plane filter - skip points not on the plane
        if (planeFilter === 'xy' && Math.abs(currentPos.z) > 0.1) break;
        if (planeFilter === 'yz' && Math.abs(currentPos.x) > 0.1) break;
        if (planeFilter === 'xz' && Math.abs(currentPos.y) > 0.1) break;
        
        points.push(currentPos.clone());

        // Stop if too close to another object
        const hitOtherObject = allObjects.some(otherObj => {
            if (otherObj.id === sourceObj.id) return false;
            const otherPos = new THREE.Vector3(...otherObj.position);
            return currentPos.distanceTo(otherPos) < 0.8;
        });

        if (hitOtherObject) break;
    }

    return points;
};

export default function FieldLines({ charges, stepsPerLine = 30, stepSize = 0.5, minStrength = 0.1, linesPerCharge = 20, planeFilter = null, slicePlane, slicePos, useSlice, slicePlaneFlip}) {
    
    const fieldLinesData = useMemo(() => {
        const lines = [];
        
        charges.forEach(obj => {
            // Handle regular charges
            if (obj.type === 'charge' && Math.abs(obj.charge) < 0.01) return;
            
            // Handle planes and wires (they use charge_density instead of charge)
            if ((obj.type === 'plane' || obj.type === 'wire') && Math.abs(obj.charge_density) < 0.01) return;

            // For planes: generate field lines from multiple points on the plane surface
            if (obj.type === 'plane') {
                // Generate field lines from various points on the plane
                const planePoints = generatePlaneStartPoints(obj, Math.max(4, linesPerCharge * 0.5));
                planePoints.forEach(planePoint => {
                    const points = traceFieldLineFromPoint(planePoint, obj, charges, 
                        stepsPerLine=stepsPerLine, stepSize=stepSize, minStrength=minStrength, planeFilter);
                    if (points.length > 1) {
                        lines.push({
                            points,
                            chargeType: obj.charge_density > 0 ? 'positive' : 'negative',
                            charge: obj
                        });
                    }
                });
            }
            // For wires: generate field lines from points along the wire
            else if (obj.type === 'wire') {
                const wirePoints = generateWireStartPoints(obj, Math.max(2, linesPerCharge * 0.3));
                wirePoints.forEach(wirePoint => {
                    const points = traceFieldLineFromPoint(wirePoint, obj, charges, 
                        stepsPerLine=stepsPerLine, stepSize=stepSize, minStrength=minStrength, planeFilter);
                    if (points.length > 1) {
                        lines.push({
                            points,
                            chargeType: obj.charge_density > 0 ? 'positive' : 'negative', 
                            charge: obj
                        });
                    }
                });
            }
            else {

                for (let i = 0; i < linesPerCharge; i++) {
                    const points = [];
                    const chargePos = new THREE.Vector3(...obj.position);
                    
                    // Direction based on charge type (usando Fibonacci sphere)
                    const goldenRatio = (1 + Math.sqrt(5)) / 2;
                    const theta = 2 * Math.PI * i / goldenRatio;
                    const phi = Math.acos(1 - 2 * (i + 0.5) / linesPerCharge);
                    
                    const startDir = new THREE.Vector3(
                        Math.sin(phi) * Math.cos(theta),
                        Math.sin(phi) * Math.sin(theta),
                        Math.cos(phi)
                    );
                    
                    if (obj.charge < 0) startDir.negate();

                    let currentPos = chargePos.clone().add(startDir.multiplyScalar(0.8));
                    points.push(currentPos.clone());

                    // Trace field line
                    for (let step = 0; step < stepsPerLine; step++) {
                        const field = calculateFieldAtPoint(charges, currentPos);
                        const fieldStrength = field.length();

                        if (fieldStrength < minStrength) break;
                        if (fieldStrength > 1000) break; // Evita explosão numérica

                        const direction = field.normalize();
                        if (obj.charge < 0) direction.negate();
                        
                        currentPos.add(direction.multiplyScalar(stepSize));
                        
                        // Apply plane filter
                        if (planeFilter === 'xy' && Math.abs(currentPos.z) > 0.1) break;
                        if (planeFilter === 'yz' && Math.abs(currentPos.x) > 0.1) break;
                        if (planeFilter === 'xz' && Math.abs(currentPos.y) > 0.1) break;
                        
                        points.push(currentPos.clone());

                        const hitOtherCharge = charges.some(otherCharge => {
                            if (otherCharge.id === obj.id) return false;
                            const otherPos = new THREE.Vector3(...otherCharge.position);
                            return currentPos.distanceTo(otherPos) < 0.8;
                        });

                        if (hitOtherCharge) break;
                    }

                    if (points.length > 1) {
                        lines.push({
                            points,
                            chargeType: obj.charge > 0 ? 'positive' : 'negative',
                            // Store the original charge for arrow direction
                            charge: obj
                        });
                    }
                }
            }
        });

        return lines.filter(line => line.points.some(p => sliceByPlane(p, slicePlane, slicePos, useSlice, slicePlaneFlip)))
                .map(line => ({
                    ...line,
                    points: line.points.filter(p => sliceByPlane(p, slicePlane, slicePos, useSlice, slicePlaneFlip))
                }))
    }, [charges, linesPerCharge, stepsPerLine, stepSize, minStrength, planeFilter, slicePlane, slicePos, useSlice, slicePlaneFlip]);

    // Create both lines AND arrow helpers like the original
    const linesAndArrows = useMemo(() => {
        const elements = [];
            
        fieldLinesData.forEach(lineData => {
            // Create the field line (YELLOW)
            const geometry = new THREE.BufferGeometry().setFromPoints(lineData.points);
            const material = new THREE.LineBasicMaterial({
                color: 0xffff00,
                linewidth: 3,
                transparent: true,
                opacity: 0.8
            });
            
            const fieldLine = new THREE.Line(geometry, material);
            elements.push(fieldLine);

            // Add arrowheads along the field line (ORIGINAL LOGIC)
            const arrowSpacing = Math.max(6, Math.floor(lineData.points.length / 5)); // Menos setas
            for (let i = 0; i < lineData.points.length - 1; i += arrowSpacing) {
                if (i + 1 < lineData.points.length) {
                    const start = lineData.points[i];
                    const end = lineData.points[i + 1];
                    const direction = new THREE.Vector3().subVectors(end, start).normalize();
                    if (lineData.charge.charge < 0) {
                        direction.negate();
                    }
                        
                    const length = Math.min(0.3, start.distanceTo(end) * 0.5);
                        
                    const arrowHelper = new THREE.ArrowHelper(
                        direction,
                        start,
                        length,
                        0xffff00, // YELLOW
                        0.15, // head length
                        0.1   // head width
                    );
                        
                    elements.push(arrowHelper);
                }
            }
        });

        return elements;
    }, [fieldLinesData]);

    // Render all elements
    return (
        <>
            {linesAndArrows.map((element, index) => (
                <primitive key={index} object={element} />
            ))}
        </>
    );
}
