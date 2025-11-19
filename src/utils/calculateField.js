import * as THREE from 'three';

import infinitePlaneField from './infinitePlaneField.js';
import infiniteWireField from './infiniteWireField.js';
import finitePlaneField from './finitePlaneField.js';
import finiteWireField from './finiteWireField.js';
import chargedSphereField from './chargedSphereField.js';
import concentricSpheresField from './concentricSpheresField.js';
import concentricInfiniteWiresField from './concentricInfiniteWiresField.js';
import { K_E } from './constants.js';

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
              infiniteWireField(sourcePosition, chargeDensity, targetPos, obj.direction);
          resultFieldAtPoint.add(fieldFromWire);
          break;
        case 'plane':
          const dist = new THREE.Vector3().subVectors(targetPos, sourcePosition).dot(new THREE.Vector3(...obj.direction).normalize());
          if (Math.abs(dist) < 1e-6) {
            resultFieldAtPoint = new THREE.Vector3(0, 0, 0);
            return resultFieldAtPoint;
          }
          const fieldFromSheet =
              infinitePlaneField(sourcePosition, chargeDensity, targetPos, obj.direction);
          resultFieldAtPoint.add(fieldFromSheet);
          break;
      }
    } else if (obj.type === 'plane') {
      const fieldFromFinitePlane =
          finitePlaneField(sourcePosition, obj.direction, obj.dimensions, chargeDensity, targetPos);
      resultFieldAtPoint.add(fieldFromFinitePlane);
    } else if (obj.type === 'wire') {
      const fieldFromFiniteWire =
          finiteWireField(sourcePosition, obj.direction, obj.height, obj.radius, chargeDensity, targetPos);
      resultFieldAtPoint.add(fieldFromFiniteWire);
    } else if (obj.type === 'chargedSphere'){
      const fieldFromSphere = chargedSphereField(sourcePosition, obj.radius, chargeDensity, obj.isHollow, targetPos);
      resultFieldAtPoint.add(fieldFromSphere);
    } else if (obj.type === 'concentricSpheres') {
      const fieldFromConcentricSpheres = concentricSpheresField(sourcePosition, obj.radiuses, obj.materials, obj.dielectrics, obj.charges, targetPos);
      resultFieldAtPoint.add(fieldFromConcentricSpheres);
    } else if (obj.type === 'concentricInfWires') {
      const fieldFromConcentricWires = concentricInfiniteWiresField(sourcePosition, obj.direction, obj.radiuses, obj.materials, obj.dielectrics, obj.charges, targetPos);
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
          fieldFromPlane = infinitePlaneField(planePos, chargeDensityForPlane, targetPos, obj.direction);
        } else {
          fieldFromPlane = finitePlaneField(planePos, obj.direction, obj.dimensions, chargeDensityForPlane, targetPos);
        }
        resultFieldAtPoint.add(fieldFromPlane);
      }
    }
    /*else {
      for (const c of obj.charges) {
        const chargePos = new THREE.Vector3(
            sourcePosition.x + (c.position?.[0] || 0),
            sourcePosition.y + (c.position?.[1] || 0),
            sourcePosition.z + (c.position?.[2] || 0),
        );
        const rVec = new THREE.Vector3().subVectors(targetPos, chargePos);
        const rSq = rVec.lengthSq();
        if (rSq < 1e-6) continue;
        const fieldMagnitude = multiplier * c.charge / rSq;
        resultFieldAtPoint.addScaledVector(rVec.normalize(), fieldMagnitude);
      }
    }*/
  }

  return resultFieldAtPoint;
}