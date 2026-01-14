import * as THREE from 'three';

import { MU_0 } from '../physics/constants';

function normalizeArray(a){
    const vec = new THREE.Vector3(...a);
    vec.normalize();
    return [vec.x, vec.y, vec.z];
}

function dataToSquareTexture(data, components = 4){
    const count = Math.ceil(data.length / components);
    const texSize = Math.ceil(Math.sqrt(count));
    const totalTexels = texSize * texSize;
    const padded = new Float32Array(totalTexels * 4);

    const src = (data instanceof Float32Array) ? data : new Float32Array(data);

    for (let i = 0; i < count; i++){
        const scrOffset = i * components;
        const dstOffset = i * 4;
        for (let c = 0; c < components; c++){
            padded[dstOffset + c] = src[scrOffset + c] ?? 0.0;
        }
    }

    const tex = new THREE.DataTexture(padded, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;

    return {tex, texSize, padded, count};
}

function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip){
    if(!useSlice) return true;
    switch(slicePlane){
        case 'xy':
            return slicePlaneFlip ^ (point.z > slicePos);
        case 'yz':
            return slicePlaneFlip ^ (point.x > slicePos);
        case 'xz':
            return slicePlaneFlip ^ (point.y > slicePos);
        default:
            return true;
    }
}

export function buildChargeTextures(objects){
    const chargePos = [];
    const tangent = [];
    const factor = [];
    const MU_04PI = MU_0 / (4 * Math.PI);

    for (const obj of objects){
        // only consider path-like current-carrying objects
        if (obj.type !== 'path' && obj.type !== 'coil' && obj.type !== 'barMagnet') continue;

        const basePos = Array.isArray(obj.position) ? obj.position : [0,0,0];
        const positions = Array.isArray(obj.charges) ? obj.charges : [];
        const tangents = Array.isArray(obj.tangents) ? obj.tangents : [];

        // unified API: use current (A)
        const current = Number.isFinite(obj.current) ? obj.current : 0.0;
        const chargeFactor = MU_04PI * current;

        for (let i = 0; i < positions.length; i++){
            const relPos = positions[i] || [0,0,0];
            const wPos = [basePos[0] + (relPos[0] ?? 0), basePos[1] + (relPos[1] ?? 0), basePos[2] + (relPos[2] ?? 0)];
            chargePos.push(wPos[0], wPos[1], wPos[2], 0.0);

            const tan = tangents[i] || [1,0,0];
            const nTan = normalizeArray(tan);
            tangent.push(nTan[0], nTan[1], nTan[2], 0.0);

            // store scaled current factor per segment
            factor.push(chargeFactor, 0.0, 0.0, 0.0);
        }
    }

    const count = Math.max(0, Math.floor(chargePos.length / 4));

    if (count === 0) {
        const empty = new Float32Array([0,0,0,0]);
        const tex = new THREE.DataTexture(empty, 1, 1, THREE.RGBAFormat, THREE.FloatType);
        tex.needsUpdate = true;
        return {
            posTex: tex, posSize: 1,
            tanTex: tex, tanSize: 1,
            factorTex: tex, factorSize: 1,
            count: 0
        };
    }

    const posPacked = dataToSquareTexture(new Float32Array(chargePos), 4);
    const tanPacked = dataToSquareTexture(new Float32Array(tangent), 4);
    const factorPacked = dataToSquareTexture(new Float32Array(factor), 4);

    return {
        posTex: posPacked.tex, posSize: posPacked.texSize,
        tanTex: tanPacked.tex, tanSize: tanPacked.texSize,
        factorTex: factorPacked.tex, factorSize: factorPacked.texSize,
        count: count
    };
}

export function buildGridPositions(
    gridSize = 10, 
    step = 1, 
    planeFilter = null,
    slicePlane = null,
    slicePos = 0,
    useSlice = false,
    slicePlaneFlip = false,
    ){
    const positions = [];
    const nSteps = Math.floor(gridSize / step);
    if (planeFilter === 'xy') {
        for (let ix = -nSteps; ix <= nSteps; ix++) {
            const x = ix * step;
            for (let iy = -nSteps; iy <= nSteps; iy++) {
                const y = iy * step;
                const z = 0;
                if (sliceByPlane({x,y,z}, slicePlane, slicePos, useSlice, slicePlaneFlip)) {
                    positions.push(x, y, z, 0);
                }
            }
        }
    } else if (planeFilter === 'xz') {
        for (let ix = -nSteps; ix <= nSteps; ix++) {
            const x = ix * step;
            for (let iz = -nSteps; iz <= nSteps; iz++) {
                const z = iz * step;
                const y = 0;
                if (sliceByPlane({x,y,z}, slicePlane, slicePos, useSlice, slicePlaneFlip)) {
                    positions.push(x, y, z, 0);
                }
            }
        }
    } else if (planeFilter === 'yz') {
        for (let iy = -nSteps; iy <= nSteps; iy++) {
            const y = iy * step;
            for (let iz = -nSteps; iz <= nSteps; iz++) {
                const z = iz * step;
                const x = 0;
                if (sliceByPlane({x,y,z}, slicePlane, slicePos, useSlice, slicePlaneFlip)) {
                    positions.push(x, y, z, 0);
                }
            }
        }
    } else {
        for (let ix = -nSteps; ix <= nSteps; ix++) {
            const x = ix * step;
            for (let iy = -nSteps; iy <= nSteps; iy++) {
                const y = iy * step;
                for (let iz = -nSteps; iz <= nSteps; iz++) {
                    const z = iz * step;
                    if (sliceByPlane({x,y,z}, slicePlane, slicePos, useSlice, slicePlaneFlip)) {
                        positions.push(x, y, z, 0);
                    }
                }
            }
        }
    }

    const count = Math.max(0, Math.floor(positions.length / 4));
    
    if (count === 0) {
        const empty = new Float32Array([0,0,0,0]);
        const tex = new THREE.DataTexture(empty, 1, 1, THREE.RGBAFormat, THREE.FloatType);
        tex.needsUpdate = true;
        return { positionsArr: empty, tex, count: 0, size: 1 };
    }

    const packed = dataToSquareTexture(new Float32Array(positions), 4);
    return { positionsArr: packed.padded, tex: packed.tex, count: count, size: packed.texSize };
}