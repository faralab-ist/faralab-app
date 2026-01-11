import calculateFieldAtPoint from '../utils/calculateField';
import * as THREE from 'three';

export function calculateEFieldAtPoints(objects, points){
    const results = [];
    for(const pointArr of points){
        const point = new THREE.Vector3(...pointArr);
        const B = calculateFieldAtPoint(objects, point);
        results.push(B);
    }
    return results;
}

export function calculateEFluxThroughCircularLoop(position, normal, radius, radialSamples, angularSamples, objects){
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
            const E = calculateFieldAtPoint(objects, point);
            const dA = (dR * dTheta * currR);
            const dFlux = E.dot(normalVec) * dA;
            flux += dFlux;
        }
    }
    return flux;
}