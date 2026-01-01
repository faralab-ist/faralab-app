import * as THREE from 'three';
import getFieldVector3 from '../utils/getFieldVectors.js';
import calculateFieldAtPoint from '../utils/calculateField.js';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// returns true if point is 'after' the plane
function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip){
    if(!useSlice) return true;
    switch(slicePlane){
        case 'xy':
            return slicePlaneFlip ^ point.z > slicePos; // i hope this works // check later
        case 'yz':
            return slicePlaneFlip ^ point.x > slicePos;
        case 'xz':
            return slicePlaneFlip ^ point.y > slicePos;
    }
}

export default function FieldArrows({ 
    objects, 
    showOnlyPlane = false, 
    showOnlyGaussianField = false, 
    fieldThreshold = 0.1, 
    gridSize = 10, 
    step = 1, 
    minThreshold, 
    scaleMultiplier,
    planeFilter = null,
    slicePlane,
    slicePos,
    useSlice,
    slicePlaneFlip,
    propagationSpeed = 10, // units per second
    enablePropagation = true
}) {
    const [propagationRadius, setPropagationRadius] = useState(0);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const vectorsFilteredRef = useRef([]);
    const vectorMapRef = useRef(new Map());
    const objectPositionsRef = useRef([]);
    const updatedKeysRef = useRef(new Set());
    const objectsKeyRef = useRef('');
    
    const vectorsUnfiltered = useMemo( 
        () => getFieldVector3(objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter),
        [objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter]
    );
    
    const vectors = vectorsUnfiltered.filter(({position, field}) => 
        sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)
    );
    
    // Reset propagation when objects change
    useEffect(() => {
        const objectsKey = JSON.stringify(objects);
        
        if (enablePropagation && objectsKey !== objectsKeyRef.current) {
            objectsKeyRef.current = objectsKey;
            
            // Keep existing vectors, will update them gradually
            if (vectorsFilteredRef.current.length === 0) {
                vectorsFilteredRef.current = vectors;
            }
            
            // Cache object positions as Vector3
            objectPositionsRef.current = objects.map(obj => 
                new THREE.Vector3(...obj.position)
            );
            
            // Build position map for fast lookup
            vectorMapRef.current.clear();
            updatedKeysRef.current.clear(); // CRITICAL: limpa o set para nova propagação
            vectorsFilteredRef.current.forEach((v, i) => {
                const key = `${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)}`;
                vectorMapRef.current.set(key, i);
            });
            
            setPropagationRadius(0);
        } else if (!enablePropagation) {
            vectorsFilteredRef.current = vectors;
        }
    }, [objects, vectors, enablePropagation]);
    
    // Calculate max distance for propagation
    const maxDistance = useMemo(() => {
        let max = 0;
        for (const {position, sourceObject} of vectors) {
            // Find distance to source object (or nearest object if no source)
            let minDistToObject = Infinity;
            
            if (sourceObject) {
                // For Gaussian surfaces, use a tiny fixed delay so all points appear together
                minDistToObject = 0.01;
            } else {
                // For grid vectors: calculate distance based on object type
                for (const obj of objects) {
                    const objPos = new THREE.Vector3(...obj.position);
                    let dist;
                    
                    if (obj.type === 'plane' || obj.type === 'stackedPlanes') {
                        // For planes: perpendicular distance to plane
                        const normal = new THREE.Vector3(...obj.direction).normalize();
                        const toPoint = new THREE.Vector3().subVectors(position, objPos);
                        dist = Math.abs(toPoint.dot(normal));
                    } else if (obj.type === 'wire' || obj.type === 'concentricInfWires') {
                        // For wires: radial distance from axis
                        const axis = new THREE.Vector3(...obj.direction).normalize();
                        const toPoint = new THREE.Vector3().subVectors(position, objPos);
                        const radialVec = toPoint.clone().projectOnPlane(axis);
                        dist = radialVec.length();
                    } else {
                        // For point charges, spheres, etc: spherical distance
                        dist = position.distanceTo(objPos);
                    }
                    
                    if (dist < minDistToObject) minDistToObject = dist;
                }
            }
            
            if (minDistToObject > max) max = minDistToObject;
        }
        return max;
    }, [vectors, objects]);
    
    // Animate propagation radius
    useFrame((state, delta) => {
        if (!enablePropagation) return;
        
        setPropagationRadius(prev => {
            const newRadius = prev + propagationSpeed * delta;
            // For Gaussian surfaces, we just need a small delay then show all at once
            // For grid vectors, grow normally
            return newRadius > maxDistance ? maxDistance : newRadius;
        });
        
        let updated = false;
        
        // First, check ALL existing vectors by recalculating their fields and remove those that don't meet threshold anymore
        for (let i = vectorsFilteredRef.current.length - 1; i >= 0; i--) {
            const existingVector = vectorsFilteredRef.current[i];
            if (!existingVector) continue;
            
            const key = `${existingVector.position.x.toFixed(2)},${existingVector.position.y.toFixed(2)},${existingVector.position.z.toFixed(2)}`;
            
            // Recalculate field for this position with current objects
            let recalculatedField;
            if (existingVector.sourceObject) {
                // For Gaussian surface vectors, calculate from source object only
                recalculatedField = calculateFieldAtPoint([existingVector.sourceObject], existingVector.position);
            } else {
                // For grid vectors, calculate from all objects
                recalculatedField = calculateFieldAtPoint(objects, existingVector.position);
            }
            
            // Remove if doesn't meet threshold anymore (but don't update the field yet - let propagation do it)
            if (recalculatedField.length() <= fieldThreshold) {
                vectorsFilteredRef.current.splice(i, 1);
                updated = true;
            }
        }
        
        // Rebuild map after removing invalid vectors
        if (updated) {
            vectorMapRef.current.clear();
            vectorsFilteredRef.current.forEach((v, i) => {
                const key = `${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)}`;
                vectorMapRef.current.set(key, i);
            });
        }
        
        // Then update vectors inside current radius from their source object
        for (const newVector of vectors) {
            const key = `${newVector.position.x.toFixed(2)},${newVector.position.y.toFixed(2)},${newVector.position.z.toFixed(2)}`;
            
            // Skip if already updated
            if (updatedKeysRef.current.has(key)) continue;
            
            // Find distance to source object (or nearest object if no source)
            let minDistToObject = Infinity;
            
            if (newVector.sourceObject) {
                // For Gaussian surfaces, use a tiny fixed delay so all points appear together
                // This gives a small initial delay but then shows the whole surface at once
                minDistToObject = 0.01;
            } else {
                // For grid vectors: calculate distance based on nearest object's type
                for (let i = 0; i < objectPositionsRef.current.length; i++) {
                    const objPos = objectPositionsRef.current[i];
                    const obj = objects[i];
                    let dist;
                    
                    if (obj.type === 'plane' || obj.type === 'stackedPlanes') {
                        // For planes: perpendicular distance to plane
                        const normal = new THREE.Vector3(...obj.direction).normalize();
                        const toPoint = new THREE.Vector3().subVectors(newVector.position, objPos);
                        dist = Math.abs(toPoint.dot(normal));
                    } else if (obj.type === 'wire' || obj.type === 'concentricInfWires') {
                        // For wires: radial distance from axis
                        const axis = new THREE.Vector3(...obj.direction).normalize();
                        const toPoint = new THREE.Vector3().subVectors(newVector.position, objPos);
                        const radialVec = toPoint.clone().projectOnPlane(axis);
                        dist = radialVec.length();
                    } else {
                        // For point charges, spheres, etc: spherical distance
                        dist = newVector.position.distanceTo(objPos);
                    }
                    
                    if (dist < minDistToObject) minDistToObject = dist;
                }
            }
            
            // Update if inside radius AND meets threshold
            if (minDistToObject <= propagationRadius && newVector.field.length() > fieldThreshold) {
                const index = vectorMapRef.current.get(key);
                
                if (index !== undefined) {
                    vectorsFilteredRef.current[index] = newVector;
                } else {
                    vectorsFilteredRef.current.push(newVector);
                    vectorMapRef.current.set(key, vectorsFilteredRef.current.length - 1);
                }
                updatedKeysRef.current.add(key);
                updated = true;
            }
        }
        
        if (updated) {
            setUpdateTrigger(prev => prev + 1);
        }
    });
    
    // Shared arrow geometry
    const arrowGeometry = useMemo(() => {
        const shaft = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6);
        const head = new THREE.ConeGeometry(0.12, 0.25, 8);
        head.translate(0, 0.475, 0);
        return BufferGeometryUtils.mergeGeometries([shaft, head]);
    }, []);
    
    const instancedMesh = useMemo(() => {
        const vectorsToRender = enablePropagation ? vectorsFilteredRef.current : vectors;
        
        // Find max magnitude for normalization
        let maxMag = 0;
        for (const {field} of vectorsToRender) {
            const mag = field.length();
            if (mag > maxMag) maxMag = mag;
        }
        const logMax = maxMag > 0 ? Math.log1p(maxMag) : 1;
        
        // Filter valid vectors
        const validVectors = vectorsToRender.filter(v => v.field.length() > fieldThreshold);
        if (validVectors.length === 0) return null;
        
        const mesh = new THREE.InstancedMesh(
            arrowGeometry,
            new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }),
            validVectors.length
        );
        
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        const yAxis = new THREE.Vector3(0, 1, 0);
        
        validVectors.forEach(({ position, field }, i) => {
            const mag = field.length();
            const logMag = Math.log1p(mag);
            
            // Color: red (strong) to blue (weak)
            const normalized = logMax > 0 ? logMag / logMax : 0;
            const hue = (1 - normalized) * 0.66;
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            
            // Scale based on magnitude
            const scale = (1 - Math.exp(-logMag)) * scaleMultiplier;
            
            // Rotation: align Y-axis with field direction
            const dir = field.clone().normalize();
            quaternion.setFromUnitVectors(yAxis, dir);
            
            // Build matrix
            matrix.compose(position, quaternion, new THREE.Vector3(1, scale, 1));
            
            mesh.setMatrixAt(i, matrix);
            mesh.setColorAt(i, color);
        });
        
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        
        return mesh;
    }, [vectorsFilteredRef.current, vectors, enablePropagation, fieldThreshold, scaleMultiplier, updateTrigger, arrowGeometry]);

    if (!instancedMesh) return null;
    return <primitive object={instancedMesh} />;
}