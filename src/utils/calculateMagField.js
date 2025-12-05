import * as THREE from 'three';
import { MU_0 } from "../physics/constants";

export default function calculateMagFieldAtPoint(objects, point) {
  let resultMagFieldAtPoint = new THREE.Vector3(0, 0, 0);

    for (const obj of objects) {
        if (obj.type === 'path') {
            const objPos = new THREE.Vector3(...obj.position);
            const chargePositions = Array.isArray(obj.charges) ? obj.charges : [];
            const tangents = Array.isArray(obj.tangents) ? obj.tangents : [];
            const velocity = obj.velocity || 0;
            for (let i = 0; i < chargePositions.length; i++) {
                const chargePosArr = chargePositions[i];
                const chargePos = objPos.clone().add(new THREE.Vector3(...chargePosArr));
                const rVec = new THREE.Vector3().subVectors(point, chargePos);
                const rMagSq = rVec.lengthSq();
                if (rMagSq < 1e-6) continue;
                const tangentArr = tangents[i] || [1, 0, 0];
                const bMag = (MU_0 / (4 * Math.PI)) * (obj.charge * velocity) / (rMagSq);
                const tangentVec = new THREE.Vector3(...tangentArr).normalize();
                const fieldFromPathCharge = new THREE.Vector3().crossVectors(tangentVec, rVec).normalize().multiplyScalar(bMag);
                resultMagFieldAtPoint.add(fieldFromPathCharge);
            }
        }
    }

  return resultMagFieldAtPoint;
}