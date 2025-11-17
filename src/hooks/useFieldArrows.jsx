import * as THREE from 'three';
import calculateField from '../utils/calculateField.js';
import Arrow from '../components/models/Arrow.jsx';
import getFieldVector3 from '../utils/getFieldVectors.js';
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import vertexShaderSource from '../shaders/arrowVertex.glsl';
import fragmentShaderSource from '../shaders/arrowFragment.glsl';

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
    const [previousVectors, setPreviousVectors] = React.useState([]);
    const [isTransitioning, setIsTransitioning] = React.useState(false);
    
    const vectorsUnfiltered = useMemo( 
        () => getFieldVector3(objects, gridSize, step, showOnlyPlane, showOnlyGaussianField, minThreshold, planeFilter),
        [objects, gridSize, step, showOnlyPlane, showOnlyGaussianField, minThreshold, planeFilter]
    );
    const vectors = vectorsUnfiltered.filter(({position, field}) => 
        sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)
    );
    
    // Detectar mudanças nos vetores
    useEffect(() => {
        if (previousVectors.length > 0 && vectors.length > 0) {
            // Há vetores antigos e novos - iniciar transição
            setIsTransitioning(true);
            // Após a duração da animação da onda, remover os vetores antigos
            const timeout = setTimeout(() => {
                setPreviousVectors(vectors);
                setIsTransitioning(false);
            }, 200); // Reduced from 600ms to 200ms
            return () => clearTimeout(timeout);
        } else if (previousVectors.length === 0 && vectors.length > 0) {
            // Primeira renderização - apenas salvar os vetores
            setPreviousVectors(vectors);
        }
    }, [vectors.length, slicePlane, slicePos, useSlice, slicePlaneFlip]);

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
        const positions = new Float32Array(vectorList.length * 3);
        const directions = new Float32Array(vectorList.length * 3);
        const scales = new Float32Array(vectorList.length);
        const colors = new Float32Array(vectorList.length * 3);
        const delays = new Float32Array(vectorList.length);

        // compute object centers and max distance for delay normalization
        const objectCenters = (objects && objects.length)
            ? objects.map(o => new THREE.Vector3(...(o.position || [0, 0, 0])))
            : [new THREE.Vector3(0, 0, 0)];

        let maxDist = 0;
        for (const { position } of vectorList) {
            let minD = Infinity;
            for (const c of objectCenters) {
                const d = position.distanceTo(c);
                if (d < minD) minD = d;
            }
            if (!isFinite(minD)) minD = position.length();
            if (minD > maxDist) maxDist = minD;
        }

        let i = 0;
        for (const { position, field } of vectorList) {
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
    const previousGeometry = useMemo(() => {
        if (!isTransitioning || previousVectors.length === 0) return null;
        
        const geom = arrowGeometry.clone();
        const attrs = createInstancedAttributes(previousVectors, true);
        
        geom.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(attrs.positions, 3));
        geom.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(attrs.directions, 3));
        geom.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(attrs.scales, 1));
        geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(attrs.colors, 3));
        geom.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(attrs.delays, 1));
        geom.instanceCount = attrs.count;
        
        return geom;
    }, [previousVectors, isTransitioning, arrowGeometry, createInstancedAttributes]);

    // shader material with time uniforms for reveal wave
    const materialRef = useRef();
    const previousMaterialRef = useRef();
    const meshRef = useRef();
    const previousMeshRef = useRef();

    const waveDuration = 0.1; // seconds per instance reveal (reduced from 0.3 for faster appearance)

    const material = useMemo(() => {
        const m = new THREE.ShaderMaterial({
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource,
            vertexColors: true,
            transparent: true,
            uniforms: {
                uTime: { value: 0.0 },
                uStartTime: { value: performance.now()},
                uWaveDuration: { value: waveDuration }
            }
        });
        return m;
    }, [vertexShaderSource, fragmentShaderSource]);

    const previousMaterial = useMemo(() => {
        if (!isTransitioning) return null;
        
        const m = new THREE.ShaderMaterial({
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource,
            vertexColors: true,
            transparent: true,
            uniforms: {
                uTime: { value: 0.0 },
                uStartTime: { value: -999. }, // Tempo muito antigo para que apareçam totalmente visíveis
                uWaveDuration: { value: waveDuration }
            }
        });
        return m;
    }, [isTransitioning, vertexShaderSource, fragmentShaderSource]);

    // keep ref to update uniforms each frame
    materialRef.current = material;
    previousMaterialRef.current = previousMaterial;

    useFrame((state) => {
        if (materialRef.current && materialRef.current.uniforms) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
        if (previousMaterialRef.current && previousMaterialRef.current.uniforms) {
            previousMaterialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    // restart wave when vectors or objects change
    useEffect(() => {
        if (materialRef.current && materialRef.current.uniforms) {
            materialRef.current.uniforms.uStartTime.value = performance.now() / 1000.0 - 0.15;
        }
    }, [vectorsUnfiltered.length, objects, showOnlyPlane, showOnlyGaussianField, planeFilter]);

    const currentInstanced = useMemo(() => {
        const attrs = createInstancedAttributes(vectors);
        const mesh = new THREE.InstancedMesh(currentGeometry, material, attrs.count);
        mesh.frustumCulled = false;
        return mesh;
    }, [currentGeometry, material, createInstancedAttributes, vectors]);

    const previousInstanced = useMemo(() => {
        if (!previousGeometry || !previousMaterial) return null;
        const attrs = createInstancedAttributes(previousVectors, true);
        const mesh = new THREE.InstancedMesh(previousGeometry, previousMaterial, attrs.count);
        mesh.frustumCulled = false;
        return mesh;
    }, [previousGeometry, previousMaterial, previousVectors, createInstancedAttributes]);

    return (
        <>
            <primitive ref={meshRef} object={currentInstanced} />
            {isTransitioning && previousInstanced && (
                <primitive ref={previousMeshRef} object={previousInstanced} />
            )}
        </>
    );
}