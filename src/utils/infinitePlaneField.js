import * as THREE from 'three';
import { EPSILON_0 } from './constants';

export default function infinitePlaneField(point, chargeDensity, targetPoint, normal) {
    const rVec = new THREE.Vector3().subVectors(targetPoint, point);
    const distance = rVec.dot(new THREE.Vector3(...normal).normalize());

    if (Math.abs(distance) < 1e-6) {
        return new THREE.Vector3(0, 0, 0);
    }

    const multiplier = EPSILON_0;

    const fieldMagnitude = chargeDensity / (2 * multiplier);

    const fieldDirection = new THREE.Vector3(...normal).normalize();
    if (distance < 0) {
        fieldDirection.negate();
    }

    const electricField = fieldDirection.multiplyScalar(fieldMagnitude);
    return electricField;
}