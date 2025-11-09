import * as THREE from 'three';

import infinitePlaneField from './infinitePlaneField.js';
import infiniteWireField from './infiniteWireField.js';

// gets an array of charges {position: Vector3, charge: number} and a target
// position Vector3
export default function calculatePotential(objects, targetPos) {
  const multiplier = 5;
  let result = 0;
  for (const obj of objects) {
    // position divided by 2
    const position = new THREE.Vector3(...obj.position).multiplyScalar(0.5);
    const charge = obj.charge;
    const chargeDensity = obj.charge_density;
    if (obj.type === 'charge') {
        const rVec = new THREE.Vector3().subVectors(targetPos, position);
        const r = rVec.length();
        if (r < 1e-4) continue;
        const pot = multiplier * charge / r;
        result += pot
    } else if (obj.infinite) {
        const e0 = 1 / (4 * Math.PI * 5)
        switch (obj.type) {
            case 'wire':
                const direction = new THREE.Vector3(...obj.direction).normalize()
                const rVec = new THREE.Vector3().subVectors(targetPos, position)
                const rPerp = rVec.clone().projectOnPlane(new THREE.Vector3(...direction).normalize())
                const distance = rPerp.length()
                if (rPerpMag < 1e-4) continue;
                const potential = (chargeDensity / (2 * Math.PI * e0)) * Math.log(distance);
                result += potential;
                break;
            case 'plane':
                const normal = new THREE.Vector3(...obj.direction).normalize();
                const dist = new THREE.Vector3().subVectors(targetPos, position).dot(normal);
                const potentialPlane = - (chargeDensity / (2 * e0)) * Math.abs(dist);
                result += potentialPlane;
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
        const r = rVec.length();
        if (r < 1e-4) continue;
        const pot = multiplier * c.charge / r;
        result += pot;
      }
    }
  }
  return result;
}