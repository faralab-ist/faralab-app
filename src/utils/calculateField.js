import * as THREE from 'three';

import { K_E } from "../physics/constants";
import { efields } from '../physics';

// gets an array of objects and a target position Vector3
// superposition principle

export default function calculateFieldAtPoint(objects, targetPos) {
  const multiplier = K_E;
  const resultFieldAtPoint = new THREE.Vector3(0, 0, 0);

  if (!Array.isArray(objects) || !targetPos) return resultFieldAtPoint;

  for (const obj of objects) {
    if (!obj || !Array.isArray(obj.position)) continue;

    const sourcePosition = new THREE.Vector3(...obj.position);

    const charge = obj.charge;
    const chargeDensity = obj.charge_density;

    if (obj.type === 'charge') {
      const rVec = new THREE.Vector3().subVectors(targetPos, sourcePosition);
      const rSq = rVec.lengthSq();
      if (rSq < 1e-6) continue;

      const fieldMagnitude = multiplier * charge / rSq;
      resultFieldAtPoint.addScaledVector(rVec.normalize(), fieldMagnitude);
      continue;
    }

    // Infinite wire/plane special-case
    if (obj.infinite && (obj.type === 'plane' || obj.type === 'wire')) {
      switch (obj.type) {
        case 'wire': {
          const fieldFromWire =
            efields.infiniteWireEField(sourcePosition, chargeDensity, targetPos, obj.direction);
          resultFieldAtPoint.add(fieldFromWire);
          break;
        }
        case 'plane': {
          const normal = new THREE.Vector3(...obj.direction).normalize();
          const dist = new THREE.Vector3().subVectors(targetPos, sourcePosition).dot(normal);

          // On the plane: undefined/ambiguous direction -> choose zero
          if (Math.abs(dist) < 1e-6) {
            return new THREE.Vector3(0, 0, 0);
          }

          const fieldFromSheet =
            efields.infinitePlaneEField(sourcePosition, chargeDensity, targetPos, obj.direction);
          resultFieldAtPoint.add(fieldFromSheet);
          break;
        }
        default:
          break;
      }
      continue;
    }

    if (obj.type === 'plane') {
      const fieldFromFinitePlane =
        efields.finitePlaneEField(sourcePosition, obj.direction, obj.dimensions, chargeDensity, targetPos);
      resultFieldAtPoint.add(fieldFromFinitePlane);
      continue;
    }

    if (obj.type === 'wire') {
      const fieldFromFiniteWire =
        efields.finiteWireEField(sourcePosition, obj.direction, obj.height, obj.radius, chargeDensity, targetPos);
      resultFieldAtPoint.add(fieldFromFiniteWire);
      continue;
    }

    if (obj.type === 'chargedSphere') {
      const fieldFromSphere =
        efields.chargedSphereEField(sourcePosition, obj.radius, chargeDensity, obj.isHollow, targetPos);
      resultFieldAtPoint.add(fieldFromSphere);
      continue;
    }

    if (obj.type === 'concentricSpheres') {
      const fieldFromConcentricSpheres =
        efields.concentricSpheresField(sourcePosition, obj.radiuses, obj.materials, obj.dielectrics, obj.charges, targetPos);
      resultFieldAtPoint.add(fieldFromConcentricSpheres);
      continue;
    }

    if (obj.type === 'concentricInfWires') {
      const fieldFromConcentricWires =
        efields.concentricInfiniteWiresField(sourcePosition, obj.direction, obj.radiuses, obj.materials, obj.dielectrics, obj.charges, targetPos);
      resultFieldAtPoint.add(fieldFromConcentricWires);
      continue;
    }

    if (obj.type === 'stackedPlanes') {
      const numPlanes = Array.isArray(obj.charge_densities) ? obj.charge_densities.length : 0;
      if (numPlanes <= 0) continue;

      const spacing = obj.spacing || 1;
      const directionVec = new THREE.Vector3(...obj.direction).normalize();
      const centerOffset = (numPlanes - 1) * spacing / 2;

      for (let i = 0; i < numPlanes; i++) {
        const planePos = sourcePosition
          .clone()
          .add(directionVec.clone().multiplyScalar((i * spacing) - centerOffset));

        const chargeDensityForPlane = obj.charge_densities[i] || 0;

        const fieldFromPlane = obj.infinite
          ? efields.infinitePlaneEField(planePos, chargeDensityForPlane, targetPos, obj.direction)
          : efields.finitePlaneEField(planePos, obj.direction, obj.dimensions, chargeDensityForPlane, targetPos);

        resultFieldAtPoint.add(fieldFromPlane);
      }
      continue;
    }
  }

  return resultFieldAtPoint;
}
