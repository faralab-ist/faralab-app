import * as THREE from 'three'

import { K_E } from '../physics/constants'
import * as efields from '../physics/efields'

const toVec3 = (v = [0, 0, 0]) => new THREE.Vector3(...v)
const worldPos = (obj) => toVec3(obj.position || [0, 0, 0])

function getPathChargePositions(obj) {
  const basePos = worldPos(obj)
  const rels = Array.isArray(obj.charges) ? obj.charges : []
  return rels.map((rel) => basePos.clone().add(toVec3(rel)))
}

function getStackedPlanePositions(obj) {
  const numPlanes = Array.isArray(obj.charge_densities) ? obj.charge_densities.length : 0
  if (numPlanes === 0) return []
  const spacing = Number(obj.spacing) || 1
  const dir = toVec3(obj.direction || [0, 1, 0]).normalize()
  const centerOffset = (numPlanes - 1) * spacing / 2
  const base = worldPos(obj)
  const positions = []
  for (let i = 0; i < numPlanes; i++) {
    const offset = i * spacing - centerOffset
    positions.push(base.clone().add(dir.clone().multiplyScalar(offset)))
  }
  return positions
}

const handlers = {
  charge: (obj, targetPos, acc) => {
    const chargePos = worldPos(obj)
    acc.add(efields.pointChargeEField(chargePos.toArray(), obj.charge || 0, targetPos.toArray()))
  },

  path: (obj, targetPos, acc) => {
    const positions = getPathChargePositions(obj)
    const q = Number(obj.charge) || 0
    for (const pos of positions) {
      acc.add(efields.pointChargeEField(pos.toArray(), q, targetPos.toArray()))
    }
  },

  stackedPlanes: (obj, targetPos, acc) => {
    const positions = getStackedPlanePositions(obj)
    const densities = Array.isArray(obj.charge_densities) ? obj.charge_densities : [obj.charge_density || 0]
    for (let i = 0; i < positions.length; i++) {
      const planePos = positions[i]
      const sigma = densities[i] || 0
      if (obj.infinite) {
        acc.add(efields.infinitePlaneEField(planePos.toArray(), sigma, targetPos.toArray(), obj.direction))
      } else {
        acc.add(efields.finitePlaneEField(planePos.toArray(), obj.direction, obj.dimensions || [1, 1], sigma, targetPos.toArray()))
      }
    }
  },

  plane: (obj, targetPos, acc) => {
    const p = worldPos(obj)
    const sigma = obj.charge_density || 0
    if (obj.infinite) {
      acc.add(efields.infinitePlaneEField(p.toArray(), sigma, targetPos.toArray(), obj.direction))
    } else {
      acc.add(efields.finitePlaneEField(p.toArray(), obj.direction, obj.dimensions || [1, 1], sigma, targetPos.toArray()))
    }
  },

  wire: (obj, targetPos, acc) => {
    const p = worldPos(obj)
    const lambda = obj.charge_density || 0
    if (obj.infinite) {
      acc.add(efields.infiniteWireEField(p.toArray(), lambda, targetPos.toArray(), obj.direction))
    } else {
      acc.add(efields.finiteWireEField(p.toArray(), obj.direction, obj.height || 1, obj.radius || 0.1, lambda, targetPos.toArray()))
    }
  },

  chargedSphere: (obj, targetPos, acc) => {
    const p = worldPos(obj)
    acc.add(efields.chargedSphereEField(p.toArray(), obj.radius || 0, obj.charge_density || 0, !!obj.isHollow, targetPos.toArray()))
  },

  concentricSpheres: (obj, targetPos, acc) => {
    const p = worldPos(obj)
    acc.add(efields.concentricSpheresEField(p.toArray(), obj.radiuses || [], obj.materials || [], obj.dielectrics || [], obj.charges || [], targetPos.toArray()))
  },

  concentricInfWires: (obj, targetPos, acc) => {
    const p = worldPos(obj)
    acc.add(efields.concentricInfiniteWiresEField(p.toArray(), obj.direction || [0, 1, 0], obj.radiuses || [], obj.materials || [], obj.dielectrics || [], obj.charges || [], targetPos.toArray()))
  },
}

handlers.coil = handlers.path

export default function calculateFieldAtPoint(objects = [], targetPosArr) {
  const targetPos = toVec3(targetPosArr)
  let result = new THREE.Vector3(0, 0, 0)

  for (const obj of objects) {
    if (!obj || !obj.type) continue
    const handler = handlers[obj.type]
    if (typeof handler === 'function') {
      handler(obj, targetPos, result)
    }
  }
  return result
}
