import * as THREE from 'three';
import calculateField from '../utils/calculateField.js';
import Arrow from '../components/models/Arrow.jsx';
import getFieldVector3 from '../utils/getFieldVectors.js';
import { useMemo } from 'react';
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
    const vectorsUnfiltered = useMemo( 
        () => getFieldVector3(objects, gridSize, step, showOnlyPlane, showOnlyGaussianField, minThreshold, planeFilter),
        [objects, showOnlyPlane, showOnlyGaussianField, planeFilter]
    );
    const vectors = vectorsUnfiltered.filter(({position, field}) => 
        sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)
    );

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
        const shaft = new THREE.CylinderGeometry(0.01, 0.01, 0.8* scaleMultiplier, 6)
        const head = new THREE.ConeGeometry(0.05, 0.2, 8)
        head.translate(0, 0.4* scaleMultiplier, 0)
        const merged = BufferGeometryUtils.mergeGeometries([shaft, head]);
        // ensure lighting/shaders that use normals work
        // howver they do not work
        merged.computeVertexNormals();
        // move the geometry so base is at y=0 (optional but often needed)
        merged.translate(0, 0.4* scaleMultiplier  , 0);
        merged.computeBoundingSphere();
        return merged;
    }, [])

    const positions = new Float32Array(vectors.length * 3);
    const directions = new Float32Array(vectors.length * 3);
    const scales = new Float32Array(vectors.length);
    const colors = new Float32Array(vectors.length * 3);

    let i = 0;
    for (const { position, field } of vectors) {
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

        i++;
    }

    arrowGeometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(positions, 3));
    arrowGeometry.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(directions, 3));
    arrowGeometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1));
    arrowGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3));

    arrowGeometry.instanceCount = i;

    const material = new THREE.ShaderMaterial({
         vertexShader: vertexShaderSource,
         fragmentShader: fragmentShaderSource,
         vertexColors: true,
    });
    const instanced = new THREE.InstancedMesh(arrowGeometry, material, i);
    return <primitive object={instanced} />;
}