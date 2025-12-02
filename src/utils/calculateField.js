import * as THREE from 'three';

import { K_E } from "../physics/constants";
import { efields } from '../physics';

// gets an array of charges {position: Vector3, charge: number} and a target position Vector3
// superposition principle

export default function calculateFieldAtPoint(objects, targetPos) {
  const multiplier = K_E;
  let resultFieldAtPoint = new THREE.Vector3(0, 0, 0);
  for (const obj of objects) {
    const sourcePosition = new THREE.Vector3(...obj.position);

    const charge = obj.charge;
    const chargeDensity = obj.charge_density;

    if (obj.type === 'charge') {
      const rVec = new THREE.Vector3().subVectors(targetPos, sourcePosition);
      const rSq = rVec.lengthSq();
      if (rSq < 1e-6) continue;
      const fieldMagnitude = multiplier * charge / rSq;
      resultFieldAtPoint.addScaledVector(rVec.normalize(), fieldMagnitude);
    } else if (obj.infinite && (obj.type === 'plane' || obj.type === 'wire')) {
      switch (obj.type) {
        case 'wire':
          const fieldFromWire =
              efields.infiniteWireEField(sourcePosition, chargeDensity, targetPos, obj.direction);
          resultFieldAtPoint.add(fieldFromWire);
          break;
        case 'plane':
          const dist = new THREE.Vector3().subVectors(targetPos, sourcePosition).dot(new THREE.Vector3(...obj.direction).normalize());
          if (Math.abs(dist) < 1e-6) {
            resultFieldAtPoint = new THREE.Vector3(0, 0, 0);
            return resultFieldAtPoint;
          }
          const fieldFromSheet =
              efields.infinitePlaneEField(sourcePosition, chargeDensity, targetPos, obj.direction);
          resultFieldAtPoint.add(fieldFromSheet);
          break;
      }
    } else if (obj.type === 'plane') {
      const fieldFromFinitePlane =
          efields.finitePlaneEField(sourcePosition, obj.direction, obj.dimensions, chargeDensity, targetPos);
      resultFieldAtPoint.add(fieldFromFinitePlane);
    } else if (obj.type === 'wire') {
      const fieldFromFiniteWire =
          efields.finiteWireEField(sourcePosition, obj.direction, obj.height, obj.radius, chargeDensity, targetPos);
      resultFieldAtPoint.add(fieldFromFiniteWire);
    } else if (obj.type === 'chargedSphere'){
      const fieldFromSphere = efields.chargedSphereEField(sourcePosition, obj.radius, chargeDensity, obj.isHollow, targetPos);
      resultFieldAtPoint.add(fieldFromSphere);
    } else if (obj.type === 'concentricSpheres') {
      const fieldFromConcentricSpheres = efields.concentricSpheresField(sourcePosition, obj.radiuses, obj.materials, obj.dielectrics, obj.charges, targetPos);
      resultFieldAtPoint.add(fieldFromConcentricSpheres);
    } else if (obj.type === 'concentricInfWires') {
      const fieldFromConcentricWires = efields.concentricInfiniteWiresField(sourcePosition, obj.direction, obj.radiuses, obj.materials, obj.dielectrics, obj.charges, targetPos);
      resultFieldAtPoint.add(fieldFromConcentricWires);
    } else if (obj.type === 'stackedPlanes') {
      // if infinite use infinite plane field
      // if not infinite use finite plane field
      const numPlanes = Array.isArray(obj.charge_densities) ? obj.charge_densities.length : 0;
      const spacing = obj.spacing || 1;
      const directionVec = new THREE.Vector3(...obj.direction).normalize();
      const centerOffset = (numPlanes - 1) * spacing / 2;
      for (let i = 0; i < numPlanes; i++) {
        const planePos = sourcePosition.clone().add(directionVec.clone().multiplyScalar((i * spacing) - centerOffset));
        const chargeDensityForPlane = obj.charge_densities[i] || 0;
        let fieldFromPlane;
        if (obj.infinite) {
          fieldFromPlane = efields.infinitePlaneEField(planePos, chargeDensityForPlane, targetPos, obj.direction);
        } else {
          fieldFromPlane = efields.finitePlaneEField(planePos, obj.direction, obj.dimensions, chargeDensityForPlane, targetPos);
        }
        resultFieldAtPoint.add(fieldFromPlane);
      }
    }
  }

  return resultFieldAtPoint;
}