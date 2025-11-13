import { EPSILON_0, K_E } from "./constants";
import * as THREE from 'three';

export default function chargedSphereField(spherePos, radius, chargeDensity, isHollow, targetPos){
    const rVec = new THREE.Vector3().subVectors(targetPos, spherePos);
    const rVecLength = rVec.length();
    if (rVecLength === 0) return new THREE.Vector3(0,0,0);
    let mag = 0;
    if (isHollow){
        if (rVecLength < radius) return new THREE.Vector3(0,0,0);
        const totCharge = chargeDensity * 4 * Math.PI * radius ** 2;
        mag = K_E * totCharge / (rVecLength ** 2);
    }
    else{
        const totCharge = chargeDensity * (4/3) * Math.PI * radius ** 3;
        if (rVecLength < radius){
            mag = (K_E * totCharge * rVecLength) / (radius ** 3);
        }
        else{
            mag = K_E * totCharge / (rVecLength ** 2);
        }
    }
    return rVec.normalize().multiplyScalar(mag);
}