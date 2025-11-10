import * as THREE from 'three';
import { EPSILON_0 } from './constants';

// from https://arxiv.org/pdf/1410.1408
export default function finiteWireField(wirePos, wireDir, wireLength, wireRadius, chargeDensity, targetPos){

    const u = new THREE.Vector3(...wireDir).normalize();

    const rVec = new THREE.Vector3().subVectors(targetPos, wirePos);

    const z0 = rVec.dot(u);

    const rPerp = rVec.clone().sub(u.clone().multiplyScalar(z0));
    const rPerpMag = rPerp.length() + 1e-9;

    const z1 = -wireLength / 2 - z0;
    const z2 = wireLength / 2 - z0;

    const sqrt1 = Math.sqrt(rPerpMag ** 2 + z1 ** 2);
    const sqrt2 = Math.sqrt(rPerpMag ** 2 + z2 ** 2);

    const radialCoeff = (z2 / sqrt2 - z1 / sqrt1) / rPerpMag;

    const axialCoeff = -(1 / sqrt1 - 1 / sqrt2);

    const E = new THREE.Vector3()
        .add(rPerp.clone().normalize().multiplyScalar(radialCoeff))
        .add(u.clone().multiplyScalar(axialCoeff))
        .multiplyScalar(chargeDensity / (4 * Math.PI * EPSILON_0));

    return E;
}