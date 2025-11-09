import * as THREE from 'three';

import infinitePlaneField from './infinitePlaneField.js';
import infiniteWireField from './infiniteWireField.js';
import { K_E } from './constants.js';

// gets an array of charges {position: Vector3, charge: number} and a target
// position Vector3
export default function calculateField(objects, targetPos) {
  const multiplier = K_E;
  let resultField = new THREE.Vector3(0, 0, 0);
  for (const obj of objects) {
    const position = new THREE.Vector3(...obj.position);
    const charge = obj.charge;
    const chargeDensity = obj.charge_density;

    if (obj.type === 'charge') {
      const rVec = new THREE.Vector3().subVectors(targetPos, position);
      const rSq = rVec.lengthSq();
      if (rSq < 1e-6) continue;
      const fieldMagnitude = multiplier * charge / rSq;
      resultField.addScaledVector(rVec.normalize(), fieldMagnitude);
    } else if (obj.infinite) {
      switch (obj.type) {
        case 'wire':
          const fieldFromWire =
              infiniteWireField(position, chargeDensity, targetPos, obj.direction);
          resultField.add(fieldFromWire);
          break;
        case 'plane':
          const dist = new THREE.Vector3().subVectors(targetPos, position).dot(new THREE.Vector3(...obj.direction).normalize());
          if (Math.abs(dist) < 1e-6) {
            resultField = new THREE.Vector3(0, 0, 0);
            return resultField;
          }
          const fieldFromSheet =
              infinitePlaneField(position, chargeDensity, targetPos, obj.direction);
          resultField.add(fieldFromSheet);
          break;
      }
    } else {
      for (const c of obj.charges) {
        const chargePos = new THREE.Vector3(
            position.x + (c.position?.[0] || 0),
            position.y + (c.position?.[1] || 0),
            position.z + (c.position?.[2] || 0),
        );
        const rVec = new THREE.Vector3().subVectors(targetPos, chargePos);
        const rSq = rVec.lengthSq();
        if (rSq < 1e-6) continue;
        const fieldMagnitude = multiplier * c.charge / rSq;
        resultField.addScaledVector(rVec.normalize(), fieldMagnitude);
      }
    }
  }
  return resultField;
}