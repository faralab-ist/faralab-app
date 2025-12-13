import * as THREE from 'three';
import getFieldVector3 from '../utils/getFieldVectors.js';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

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
    propagationSpeed = 2, // units per second
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
                new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z)
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
        for (const {position} of vectors) {
            // Find distance to nearest object
            let minDistToObject = Infinity;
            for (const obj of objects) {
                const objPos = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
                const dist = position.distanceTo(objPos);
                if (dist < minDistToObject) minDistToObject = dist;
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
            // Stop growing after max distance to prevent infinite growth
            return newRadius > maxDistance ? maxDistance : newRadius;
        });
        
        let updated = false;
        
        // Update vectors inside current radius from any object
        for (const newVector of vectors) {
            const key = `${newVector.position.x.toFixed(2)},${newVector.position.y.toFixed(2)},${newVector.position.z.toFixed(2)}`;
            
            // Skip if already updated
            if (updatedKeysRef.current.has(key)) continue;
            
            // Find distance to nearest object (cached positions)
            let minDistToObject = Infinity;
            for (const objPos of objectPositionsRef.current) {
                const dist = newVector.position.distanceTo(objPos);
                if (dist < minDistToObject) minDistToObject = dist;
            }
            
            // Update if inside radius
            if (minDistToObject <= propagationRadius) {
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
    
    const arrowGroup = useMemo(() => {
        const vectorsToRender = enablePropagation ? vectorsFilteredRef.current : vectors;
        
        // Find max magnitude for normalization
        let maxMag = 0;
        for (const {field} of vectorsToRender) {
            const mag = field.length();
            if (mag > maxMag) maxMag = mag;
        }
        const logMax = maxMag > 0 ? Math.log1p(maxMag) : 1;
        
        const group = new THREE.Group();
        
        for (const { position, field } of vectorsToRender) {
            const mag = field.length();
            if (mag <= fieldThreshold) continue;
            
            const logMag = Math.log1p(mag);
            
            // Color: red (strong) to blue (weak)
            const normalized = logMax > 0 ? logMag / logMax : 0;
            const hue = (1 - normalized) * 0.66;
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            
            // Scale based on magnitude
            const scale = (1 - Math.exp(-logMag));
            const length = scale * scaleMultiplier;
            const headLength = scale * 0.2;
            const headWidth = scale * 0.1;
            
            // Direction
            const dir = field.clone().normalize();
            
            // Create ArrowHelper
            const arrow = new THREE.ArrowHelper(
                dir,
                position,
                length,
                color,
                headLength,
                headWidth
            );
            
            // Make shaft thicker
            arrow.line.scale.set(10, 10, 10);
            
            group.add(arrow);
        }
        
        return group;
    }, [vectorsFilteredRef.current, vectors, enablePropagation, fieldThreshold, scaleMultiplier, updateTrigger]);

    return <primitive object={arrowGroup} />;
}