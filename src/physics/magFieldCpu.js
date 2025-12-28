import { MU_0_REAL } from "./constants";
import * as THREE from 'three';

export function calculateMagFieldAtPoint(objects, point){
    let result = new THREE.Vector3(0, 0, 0);
    const MU_04PI = MU_0_REAL / (4 * Math.PI);
    for(const obj of objects){
        if(obj.type !== 'coil' && obj.type !== 'path') continue;
        const basePos = new THREE.Vector3(...obj.position);
        const charges = obj.charges || [];
        const tangents = obj.tangents || [];
        const velocity = obj.velocity || 0;
        const factor = MU_04PI * obj.charge * velocity;
        for(let i = 0; i < charges.length; i++){
            const chargePos = new THREE.Vector3(...charges[i]).add(basePos);
            const rVec = new THREE.Vector3().subVectors(point, chargePos);
            const r2 = rVec.lengthSq();
            if(r2 === 0) continue;
            const rHat = rVec.clone().normalize();
            const tangent = new THREE.Vector3(...tangents[i]);
            const dB = tangent.clone().cross(rHat).multiplyScalar(factor / (r2));
            result.add(dB);
        }
    }
    return result;
}
export function calculateMagFieldAtPoints(objects, points){
    const results = [];
    for(const pointArr of points){
        const point = new THREE.Vector3(...pointArr);
        const B = calculateMagFieldAtPoint(objects, point);
        results.push(B);
    }
    return results;
}

export function calculateMagFluxThroughCircularLoop(position, normal, radius, radialSamples, angularSamples, objects){
    // sample points on loop
    const dTheta = 2 * Math.PI / angularSamples;
    const dR = radius / radialSamples;
    const normalVec = new THREE.Vector3(...normal).normalize();
    // find two orthogonal vectors in the plane of the loop
    let u = new THREE.Vector3(1, 0, 0);
    if(Math.abs(normalVec.dot(u)) > 0.99){
        u = new THREE.Vector3(0, 1, 0);
    }
    const v = new THREE.Vector3().crossVectors(normalVec, u).normalize();
    u = new THREE.Vector3().crossVectors(v, normalVec).normalize();

    let flux = 0;

    for(let r = 0; r < radialSamples; r++){
        const currR = (r + 0.5) * dR;
        for(let t = 0; t < angularSamples; t++){
            const theta = t * dTheta;
            const point = new THREE.Vector3(...position)
                .add(u.clone().multiplyScalar(currR * Math.cos(theta)))
                .add(v.clone().multiplyScalar(currR * Math.sin(theta)));
            const B = calculateMagFieldAtPoint(objects, point);
            const dA = (dR * dTheta * currR);
            const dFlux = B.dot(normalVec) * dA;
            flux += dFlux;
        }
    }
    return flux;
}