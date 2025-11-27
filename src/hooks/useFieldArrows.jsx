import * as THREE from 'three';
import calculateField from '../utils/calculateField.js';
import Arrow from '../components/models/Arrow.jsx';
import getFieldVector3 from '../utils/getFieldVectors.js';
import React, { useMemo, useRef, useEffect } from 'react';
import { Instance, Instances } from '@react-three/drei';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import vertexShaderSource from '../shaders/arrowVertex.glsl';
import fragmentShaderSource from '../shaders/arrowFragment.glsl';
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
    slicePlaneFlip
}) {
    
    const vectorsUnfiltered = useMemo( 
        () => getFieldVector3(objects, gridSize, step, showOnlyPlane, showOnlyGaussianField, minThreshold, planeFilter),
        [objects, gridSize, step, showOnlyPlane, showOnlyGaussianField, minThreshold, planeFilter]
    );
    const vectors = vectorsUnfiltered.filter(({position, field}) => 
        sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)
    );
    
    // No transition / propagation: show field instantly. No previousVectors handling.

    const MAX_L = useMemo(() => {
        let maxL = 0;
        for (const {field} of vectors) {
            const mag = field.length();
            if (mag > maxL) maxL = mag;
        }
        return maxL;
    }, [vectors]);

    // avoid divide-by-zero / NaN if no field
    const logMax = MAX_L > 0 ? Math.log1p(MAX_L) : 1;
    
    const arrowGeometry = useMemo(() => { 
        const s = scaleMultiplier || 1;
        const shaft = new THREE.CylinderGeometry(0.01, 0.01, 0.8 * s, 6);
        const head = new THREE.ConeGeometry(0.05, 0.2, 8);
        head.translate(0, 0.4 * s, 0);
        const merged = BufferGeometryUtils.mergeGeometries([shaft, head]);
        merged.computeVertexNormals();
        merged.translate(0, 0.4 * s, 0);
        merged.computeBoundingSphere();
        return merged;
    }, [scaleMultiplier]);

    // Função helper para criar os atributos instanciados
    const createInstancedAttributes = React.useCallback((vectorList, isOld = false) => {
        // Deduplicate nearby positions (to avoid multiple arrows at the exact same point)
        // We'll quantize positions to a small grid and accumulate fields for duplicates.
        const quant = 1e-2; // quantization for dedupe (adjust if needed)
        const map = new Map();
        for (const { position, field } of vectorList) {
            const key = `${Math.round(position.x / quant)}|${Math.round(position.y / quant)}|${Math.round(position.z / quant)}`;
            const entry = map.get(key);
            if (!entry) {
                map.set(key, { position: position.clone(), field: field.clone(), count: 1 });
            } else {
                entry.field.add(field);
                entry.count++;
            }
        }

        const unique = [];
        for (const v of map.values()) {
            // average the accumulated field to avoid bias
            v.field.divideScalar(v.count);
            unique.push({ position: v.position, field: v.field });
        }

        const positions = new Float32Array(unique.length * 3);
        const directions = new Float32Array(unique.length * 3);
        const scales = new Float32Array(unique.length);
        const colors = new Float32Array(unique.length * 3);
        const delays = new Float32Array(unique.length);

        // compute object centers and max distance for delay normalization
        const objectCenters = (objects && objects.length)
            ? objects.map(o => new THREE.Vector3(...(o.position || [0, 0, 0])))
            : [new THREE.Vector3(0, 0, 0)];

        let maxDist = 0;
        for (const { position } of unique) {
            let minD = Infinity;
            for (const c of objectCenters) {
                const d = position.distanceTo(c);
                if (d < minD) minD = d;
            }
            if (!isFinite(minD)) minD = position.length();
            if (minD > maxDist) maxDist = minD;
        }

        let i = 0;
        for (const { position, field } of unique) {
            const mag = field.length();
            if (mag <= fieldThreshold) continue;
            const logMag = Math.log1p(mag);
            const normalized = logMax > 0 ? Math.min(Math.max(logMag / logMax, 0), 1) : 0;
            const hue = (1 - normalized) * 0.66;
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            const dir = field.clone().normalize();

            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            directions[i * 3] = dir.x;
            directions[i * 3 + 1] = dir.y;
            directions[i * 3 + 2] = dir.z;

            const parameter = 1 - Math.exp(-logMag);
            scales[i] = (Math.min(Math.max(parameter, 0), 1.0));

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            let minDistToObject = Infinity;
            for (const c of objectCenters) {
                const d = position.distanceTo(c);
                if (d < minDistToObject) minDistToObject = d;
            }
            if (!isFinite(minDistToObject)) minDistToObject = position.length();
            const dist = minDistToObject;
            delays[i] = maxDist > 0 ? dist / maxDist : 0;

            i++;
        }

        return { positions, directions, scales, colors, delays, count: i };
    }, [objects, fieldThreshold, logMax]);

    // Criar geometria e material para os vetores atuais
    const currentGeometry = useMemo(() => {
        const geom = arrowGeometry.clone();
        const attrs = createInstancedAttributes(vectors);
        
        geom.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(attrs.positions, 3));
        geom.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(attrs.directions, 3));
        geom.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(attrs.scales, 1));
        geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(attrs.colors, 3));
        geom.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(attrs.delays, 1));
        geom.instanceCount = attrs.count;
        
        return geom;
    }, [vectors, arrowGeometry, createInstancedAttributes]);

    // Criar geometria para vetores antigos (se existirem)
    // no previous geometry — immediate rendering only

    // shader material: no propagation uniforms, render fully visible
    const materialRef = useRef();
    const meshRef = useRef();
    const startTimeRef = useRef(0);

    const material = useMemo(() => {
        const m = new THREE.ShaderMaterial({
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource,
            vertexColors: true,
            transparent: true
        });
        return m;
    }, [vertexShaderSource, fragmentShaderSource]);

    // keep ref to material
    materialRef.current = material;

    // Track if animation is complete
    const animationCompleteRef = useRef(false);
    
    // Create stable key for vectors to prevent re-runs
    const vectorsKey = useMemo(() => {
        return JSON.stringify(vectors.map(v => [
            Math.round(v.position.x * 100) / 100,
            Math.round(v.position.y * 100) / 100,
            Math.round(v.position.z * 100) / 100,
            Math.round(v.field.length() * 100) / 100
        ]));
    }, [vectors]);

    // Setup geometry once when vectors change - ORDER BY DISTANCE TO OBJECTS
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) {
            return;
        }

        // Compute attributes fresh
        const attrs = createInstancedAttributes(vectors);
        const maxCount = attrs.count || 0;

        if (maxCount === 0) {
            console.warn('[FieldArrows] No instances to render');
            mesh.count = 0;
            return;
        }

        console.log('[FieldArrows] Setting up geometry with', maxCount, 'instances');

        // Build distance list - special handling for planes
        const vectorsWithDist = [];
        
        for (let i = 0; i < maxCount; i++) {
            const px = attrs.positions[i * 3];
            const py = attrs.positions[i * 3 + 1];
            const pz = attrs.positions[i * 3 + 2];
            const pos = new THREE.Vector3(px, py, pz);
            
            // Calculate distance differently for planes
            let minDist = Infinity;
            
            for (const obj of objects) {
                const objPos = new THREE.Vector3(...(obj.position || [0, 0, 0]));
                
                if (obj.type === 'plane') {
                    // For planes: distance is measured along the field direction (perpendicular to plane)
                    const planeNormal = new THREE.Vector3(...(obj.direction || [0, 1, 0])).normalize();
                    const toPoint = pos.clone().sub(objPos);
                    // Distance along normal direction (field propagates perpendicular to plane)
                    const distAlongNormal = Math.abs(toPoint.dot(planeNormal));
                    if (distAlongNormal < minDist) minDist = distAlongNormal;
                } else {
                    // For point charges/wires/spheres: radial distance
                    const d = pos.distanceTo(objPos);
                    if (d < minDist) minDist = d;
                }
            }
            
            if (!isFinite(minDist)) minDist = pos.length();
            vectorsWithDist.push({ index: i, dist: minDist });
        }

        // SORT by distance (propagate from objects outward)
        vectorsWithDist.sort((a, b) => a.dist - b.dist);

        // Setup geometry with SORTED attributes
        const geom = arrowGeometry.clone();
        const posArray = new Float32Array(maxCount * 3);
        const dirArray = new Float32Array(maxCount * 3);
        const scaleArray = new Float32Array(maxCount);
        const colorArray = new Float32Array(maxCount * 3);
        const delayArray = new Float32Array(maxCount);

        for (let i = 0; i < maxCount; i++) {
            const srcIdx = vectorsWithDist[i].index;
            posArray[i * 3] = attrs.positions[srcIdx * 3];
            posArray[i * 3 + 1] = attrs.positions[srcIdx * 3 + 1];
            posArray[i * 3 + 2] = attrs.positions[srcIdx * 3 + 2];
            dirArray[i * 3] = attrs.directions[srcIdx * 3];
            dirArray[i * 3 + 1] = attrs.directions[srcIdx * 3 + 1];
            dirArray[i * 3 + 2] = attrs.directions[srcIdx * 3 + 2];
            scaleArray[i] = attrs.scales[srcIdx];
            colorArray[i * 3] = attrs.colors[srcIdx * 3];
            colorArray[i * 3 + 1] = attrs.colors[srcIdx * 3 + 1];
            colorArray[i * 3 + 2] = attrs.colors[srcIdx * 3 + 2];
            delayArray[i] = attrs.delays[srcIdx];
        }

        geom.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(posArray, 3));
        geom.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(dirArray, 3));
        geom.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scaleArray, 1));
        geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colorArray, 3));
        geom.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(delayArray, 1));

        mesh.geometry = geom;
        mesh.frustumCulled = false;
        mesh.count = 0; // start with nothing visible

        // Reset animation state
        startTimeRef.current = Date.now();
        animationCompleteRef.current = false;

        console.log('[FieldArrows] Geometry setup complete, starting animation from objects outward');

        return () => {
            geom.dispose();
        };
    }, [vectorsKey, arrowGeometry]);

    // Get maxCount for useFrame
    const attrs = useMemo(() => createInstancedAttributes(vectors), [vectors, createInstancedAttributes]);
    const maxCount = attrs.count || 0;

    // Animate instance count ONCE (no loop) - stop when complete
    useFrame(() => {
        const mesh = meshRef.current;
        if (!mesh || !mesh.material || maxCount === 0) return;

        // Skip if animation already complete
        if (animationCompleteRef.current) return;

        const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
        const animDuration = (gridSize / step) * .07; // 50ms per ring

        const progress = Math.min(elapsed / animDuration, 1.0);
        const targetCount = Math.floor(progress * maxCount);
        
        if (progress < 1.0) {
            // Animation in progress
            if (mesh.count !== targetCount) {
                mesh.count = targetCount;
            }
        } else {
            // Animation complete - set final count and mark as done
            if (mesh.count !== maxCount) {
                mesh.count = maxCount;
            }
            animationCompleteRef.current = true;
            console.log('[FieldArrows] Animation complete - showing all', maxCount, 'instances');
        }
    });

    if (maxCount === 0) {
        console.warn('[FieldArrows] Rendering nothing (maxCount=0)');
        return null;
    }

    return <instancedMesh ref={meshRef} args={[arrowGeometry, material, maxCount]} />;
}