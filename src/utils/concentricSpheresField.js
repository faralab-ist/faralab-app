import * as THREE from 'three';
import { K_E } from './constants';
import { EPSILON_0 } from './constants';
import chargePerSphereSurface from './chargePerSphereSurface';

export default function concentricSpheresField(spherePos, radiuses, materials, dielectrics, charges, targetPos){
    const rVec = new THREE.Vector3().subVectors(targetPos, spherePos);
    const rVecLength = rVec.length();
    const rVecLengthSq = rVec.lengthSq();
    if (rVecLength === 0) return new THREE.Vector3(0,0,0);

    const totalCharge = charges.reduce(((a,b) => a+b),0);

    // determine layer the point is on
    let layer = -1;
    for(let i = 0; i < radiuses.length; i++){
        if (rVecLength === radiuses [i]){
            if (materials[i] === 'dielectric' && i === radiuses.length -1) continue;
            return new THREE.Vector3(0,0,0);
        } else if (rVecLength < radiuses[i]){
            layer = i;
            break;
        }
    }
    
    // point is outside system:
    if (layer === -1){
        const field = K_E * totalCharge / rVecLengthSq;
        return rVec.clone().normalize().multiplyScalar(field);
    }

    // point is inside conductor material
    // maybe not needed but just in case
    // no
    /* if(materials[layer] === 'conductor'){
        return new THREE.Vector3(0,0,0);
    }*/

    // gauss law thanks
    
    let enclosedCharge = 0;
    const chargesPerSurface = chargePerSphereSurface(radiuses, charges, materials);
    for (let i = 1; i <= layer; i++){
        enclosedCharge += chargesPerSurface[i-1];
    }

    const dielectricConst = dielectrics[layer];
    const field = (K_E * enclosedCharge) / (dielectricConst * rVecLengthSq);
    return rVec.clone().normalize().multiplyScalar(field);
}