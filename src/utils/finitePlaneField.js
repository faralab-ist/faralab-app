import { EPSILON_0 } from "./constants";
import * as THREE from 'three';

// from https://arxiv.org/pdf/math-ph/0603051
export default function finitePlaneField(planePos, planeNormal, planeDimensions, chargeDensity, targPoint) {
    const width = planeDimensions[0];
    const height = planeDimensions[1];

    const normal = new THREE.Vector3(...planeNormal).normalize();

    const rVec = new THREE.Vector3().subVectors(targPoint, planePos);

    const uVec = new THREE.Vector3(1, 0, 0);
    if (Math.abs(normal.dot(uVec)) > 0.99) uVec.set(0, 1, 0); // avoid parallel
    const vVec = new THREE.Vector3().crossVectors(normal, uVec).normalize();
    uVec.crossVectors(vVec, normal).normalize();

    const xPrime = rVec.dot(uVec);
    const yPrime = rVec.dot(normal);
    const zPrime = rVec.dot(vVec);

    const xCorners = [-width / 2, width / 2];
    const zCorners = [-height / 2, height / 2];

    const D11 = Math.sqrt((xPrime - xCorners[0]) ** 2 + yPrime ** 2 + (zPrime - zCorners[0]) ** 2);
    const D12 = Math.sqrt((xPrime - xCorners[0]) ** 2 + yPrime ** 2 + (zPrime - zCorners[1]) ** 2);
    const D21 = Math.sqrt((xPrime - xCorners[1]) ** 2 + yPrime ** 2 + (zPrime - zCorners[0]) ** 2);
    const D22 = Math.sqrt((xPrime - xCorners[1]) ** 2 + yPrime ** 2 + (zPrime - zCorners[1]) ** 2);

    const Ex = Math.log((D11 - (zPrime - zCorners[0])) * (D22 - (zPrime - zCorners[1])) / ((D12 - (zPrime - zCorners[1])) * (D21 - (zPrime - zCorners[0]))));
    const Ez = Math.log((D11 - (xPrime - xCorners[0])) * (D22 - (xPrime - xCorners[1])) / ((D12 - (xPrime - xCorners[0])) * (D21 - (xPrime - xCorners[1]))));

    // compute Ey using real arctangent formula
    let Ey = 0;
    const ySign = Math.sign(yPrime) || 1; // handle exactly on-plane case
    const yAbs = Math.abs(yPrime);

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const sign = ((i + j) % 2 === 0) ? 1 : -1;
            const xi = xCorners[i];
            const zj = zCorners[j];
            Ey += sign * Math.atan2(
                (xi - xPrime) * (zj - zPrime),
                yAbs * Math.sqrt(yAbs * yAbs + (xi - xPrime) ** 2 + (zj - zPrime) ** 2)
            );
        }
    }

    Ey *= ySign;


    const coeff = chargeDensity / (4 * Math.PI * EPSILON_0);
    const fieldVec = new THREE.Vector3(Ex, Ey, Ez).multiplyScalar(coeff);

    const worldFieldVec = new THREE.Vector3()
        .addScaledVector(uVec, fieldVec.x)
        .addScaledVector(normal, fieldVec.y)
        .addScaledVector(vVec, fieldVec.z);

    return worldFieldVec;
}
