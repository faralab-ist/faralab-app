import * as THREE from 'three';
import { EPSILON_0 } from './constants';

export default function infiniteWireField(position, chargeDensity, targPoint, direction = [0, 1, 0]) {
    const multiplier = EPSILON_0;
    direction = new THREE.Vector3(...direction).normalize()
    const rVec = new THREE.Vector3().subVectors(targPoint, position)
    const rPerp = rVec.clone().projectOnPlane(new THREE.Vector3(...direction).normalize())
    const rPerpMag = rPerp.length()
    if (rPerpMag < 1e-6) return new THREE.Vector3(0, 0, 0)
    const fieldMagnitude = chargeDensity / (2 * rPerpMag * Math.PI * multiplier)
    return rPerp.normalize().multiplyScalar(fieldMagnitude)
}