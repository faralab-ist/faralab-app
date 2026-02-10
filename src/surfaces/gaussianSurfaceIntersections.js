import * as THREE from 'three'
import CuboidShape from './cuboidShape'
import {
  toVector3,
  getHalfExtents,
  getPlaneBasisVectors,
  samplePlaneOverlapArea,
  pointInsideSurface,
  getSurfaceBoundingRadius,
  PLANE_AREA_SAMPLE_DENSITY,
  PLANE_AREA_SAMPLE_DENSITY_FINE,
  PLANE_AREA_SAMPLES_MAX,
  PLANE_AREA_SAMPLES_MAX_FINE,
} from './gaussianSurfaceGeometry'

const WIRE_SAMPLE_MIN = 8
const WIRE_SAMPLE_MAX = 200
const WIRE_SAMPLE_DENSITY = 4

// Distance helper shared by the wire intersection check.
function distancePointToSegment(point, a, b) {
  const ab = b.clone().sub(a)
  const t = Math.max(0, Math.min(1, point.clone().sub(a).dot(ab) / ab.lengthSq()))
  const closest = a.clone().add(ab.multiplyScalar(t))
  return closest.distanceTo(point)
}

// Determines whether a finite/infinite plane intersects the Gaussian surface.
export function planeIntersectsSurface(surface, plane) {
  const position = toVector3(surface.position || [0, 0, 0])
  const quaternion = CuboidShape.buildQuaternion(surface)
  const inv = quaternion.clone().invert()
  const planePointLocal = toVector3(plane.position || [0, 0, 0]).sub(position).applyQuaternion(inv)
  const { normal, widthAxis, heightAxis } = getPlaneBasisVectors(plane)
  const planeNormalLocal = normal.applyQuaternion(inv).normalize()
  const planeWidthAxisLocal = widthAxis.applyQuaternion(inv).normalize()
  const planeHeightAxisLocal = heightAxis.applyQuaternion(inv).normalize()
  const halfExtents = getHalfExtents(surface)
  const projHalf =
    Math.abs(planeNormalLocal.x) * halfExtents.x +
    Math.abs(planeNormalLocal.y) * halfExtents.y +
    Math.abs(planeNormalLocal.z) * halfExtents.z
  const distance = Math.abs(planeNormalLocal.dot(planePointLocal))
  if (distance > projHalf + 1e-3) return false
  if (plane.infinite) return true

  const widthValue = plane.planeWidth ?? plane.dimensions?.[0] ?? 0
  const heightValue = plane.planeHeight ?? plane.dimensions?.[1] ?? 0
  const halfWidth = Math.abs(widthValue) / 2
  const halfHeight = Math.abs(heightValue) / 2
  if (halfWidth === 0 && halfHeight === 0) return false

  const projHalfU =
    Math.abs(planeWidthAxisLocal.x) * halfExtents.x +
    Math.abs(planeWidthAxisLocal.y) * halfExtents.y +
    Math.abs(planeWidthAxisLocal.z) * halfExtents.z
  const projHalfV =
    Math.abs(planeHeightAxisLocal.x) * halfExtents.x +
    Math.abs(planeHeightAxisLocal.y) * halfExtents.y +
    Math.abs(planeHeightAxisLocal.z) * halfExtents.z
  const centerProjU = planePointLocal.dot(planeWidthAxisLocal)
  const centerProjV = planePointLocal.dot(planeHeightAxisLocal)

  const overU = Math.abs(centerProjU) - (halfWidth + projHalfU)
  if (overU > 1e-3) return false

  const overV = Math.abs(centerProjV) - (halfHeight + projHalfV)
  if (overV > 1e-3) return false

  return true
}

// Determines whether any part of a wire overlaps the Gaussian surface.
export function wireIntersectsSurface(surface, wire) {
  const halfExtents = getHalfExtents(surface)
  const position = toVector3(surface.position || [0, 0, 0])
  const quaternion = CuboidShape.buildQuaternion(surface)
  const inv = quaternion.clone().invert()

  const wireCenter = toVector3(wire.position || [0, 0, 0])
  const direction = new THREE.Vector3(...(wire.direction || [0, 1, 0])).normalize()
  const halfLength = Math.abs(wire.height ?? 1) / 2
  const wireRadius = Math.abs(wire.radius ?? 0)

  const startWorld = wireCenter.clone().add(direction.clone().multiplyScalar(halfLength))
  const endWorld = wireCenter.clone().add(direction.clone().multiplyScalar(-halfLength))
  const startLocal = startWorld.sub(position).applyQuaternion(inv)
  const endLocal = endWorld.sub(position).applyQuaternion(inv)

  const inflatedHalf = new THREE.Vector3(
    halfExtents.x + wireRadius,
    halfExtents.y + wireRadius,
    halfExtents.z + wireRadius
  )

  const pointInside = (point) =>
    Math.abs(point.x) <= inflatedHalf.x + 1e-3 &&
    Math.abs(point.y) <= inflatedHalf.y + 1e-3 &&
    Math.abs(point.z) <= inflatedHalf.z + 1e-3

  if (pointInside(startLocal) || pointInside(endLocal)) return true

  const midLocal = startLocal.clone().add(endLocal).multiplyScalar(0.5)
  if (pointInside(midLocal)) return true

  const dist = distancePointToSegment(new THREE.Vector3(0, 0, 0), startLocal, endLocal)
  const minHalf = Math.min(inflatedHalf.x, inflatedHalf.y, inflatedHalf.z)
  return dist <= minHalf + 1e-3
}

// Approximates the amount of plane charge enclosed by sampling the finite plane patch.
export function estimatePlaneEnclosedCharge(surface, plane) {
  if (!plane || plane.infinite) return { canEstimate: false, enclosedCharge: 0 }
  const density = Number(plane.charge_density ?? 0)
  if (!Number.isFinite(density)) return { canEstimate: false, enclosedCharge: 0 }
  if (Math.abs(density) < 1e-9) return { canEstimate: true, enclosedCharge: 0 }

  let enclosedArea = samplePlaneOverlapArea(surface, plane, {
    density: PLANE_AREA_SAMPLE_DENSITY,
    maxSamples: PLANE_AREA_SAMPLES_MAX,
  })
  if (enclosedArea <= 0 && planeIntersectsSurface(surface, plane)) {
    enclosedArea = samplePlaneOverlapArea(surface, plane, {
      density: PLANE_AREA_SAMPLE_DENSITY_FINE,
      maxSamples: PLANE_AREA_SAMPLES_MAX_FINE,
    })
    if (enclosedArea <= 0) {
      return { canEstimate: false, enclosedCharge: 0 }
    }
  }

  return { canEstimate: true, enclosedCharge: density * enclosedArea }
}

// Approximates how much of the wire's line charge lies within the surface.
export function estimateWireEnclosedCharge(surface, wire) {
  if (!wire) return { canEstimate: false, enclosedCharge: 0 }
  const density = Number(wire.charge_density ?? 0)
  if (!Number.isFinite(density)) return { canEstimate: false, enclosedCharge: 0 }

  const direction = new THREE.Vector3(...(wire.direction || [0, 1, 0]))
  if (direction.lengthSq() < 1e-8) return { canEstimate: false, enclosedCharge: 0 }
  direction.normalize()

  const center = toVector3(wire.position || [0, 0, 0])
  const radius = Math.abs(wire.radius ?? 0)
  let halfLength
  if (wire.infinite) {
    halfLength = getSurfaceBoundingRadius(surface) + radius + 1
  } else {
    halfLength = Math.abs(wire.height ?? 0) / 2
  }
  if (!Number.isFinite(halfLength) || halfLength <= 0) return { canEstimate: true, enclosedCharge: 0 }

  const totalLength = halfLength * 2
  const samples = Math.max(
    WIRE_SAMPLE_MIN,
    Math.min(WIRE_SAMPLE_MAX, Math.ceil(totalLength * WIRE_SAMPLE_DENSITY))
  )
  if (samples <= 0) return { canEstimate: true, enclosedCharge: 0 }

  const step = totalLength / samples
  const samplePoint = new THREE.Vector3()
  let enclosedLength = 0

  for (let i = 0; i < samples; i++) {
    const offset = -halfLength + (i + 0.5) * step
    samplePoint.copy(center).addScaledVector(direction, offset)
    if (pointInsideSurface(surface, samplePoint)) enclosedLength += step
  }

  return { canEstimate: true, enclosedCharge: density * enclosedLength }
}

// Simple bounding-sphere test to see if a charged sphere intersects the surface.
export function chargedSphereIntersectsSurface(surface, sphereObj) {
  const surfaceCenter = toVector3(surface.position || [0, 0, 0])
  const sphereCenterWorld = toVector3(sphereObj.position || [0, 0, 0])
  const sphereRadius = Math.abs(sphereObj.radius ?? 1)

  switch (surface.surfaceType) {
    case 'sphere': {
      const surfaceRadius = Math.abs(surface.radius ?? 1)
      const centerDistance = sphereCenterWorld.distanceTo(surfaceCenter)
      return centerDistance <= surfaceRadius + sphereRadius
    }
    case 'cuboid': {
      const surfaceQuat = CuboidShape.buildQuaternion(surface)
      const inv = surfaceQuat.clone().invert()
      const sphereCenterLocal = sphereCenterWorld.clone().sub(surfaceCenter).applyQuaternion(inv)
      const halfExtents = getHalfExtents(surface)
      const dx = Math.max(Math.abs(sphereCenterLocal.x) - halfExtents.x, 0)
      const dy = Math.max(Math.abs(sphereCenterLocal.y) - halfExtents.y, 0)
      const dz = Math.max(Math.abs(sphereCenterLocal.z) - halfExtents.z, 0)
      return (dx * dx + dy * dy + dz * dz) <= sphereRadius * sphereRadius
    }
    case 'cylinder': {
      const surfaceQuat = CuboidShape.buildQuaternion(surface)
      const inv = surfaceQuat.clone().invert()
      const sphereCenterLocal = sphereCenterWorld.clone().sub(surfaceCenter).applyQuaternion(inv)
      const radius = Math.abs(surface.radius ?? 1)
      const halfHeight = Math.abs(surface.height ?? 1) / 2
      const radialDist = Math.hypot(sphereCenterLocal.x, sphereCenterLocal.z)

      const insideSide = Math.abs(sphereCenterLocal.y) <= halfHeight
      if (insideSide && radialDist <= radius + sphereRadius) return true

      const radialPenetration = Math.max(radialDist - radius, 0)
      const verticalPenetration = Math.max(Math.abs(sphereCenterLocal.y) - halfHeight, 0)
      return (radialPenetration * radialPenetration + verticalPenetration * verticalPenetration) <= (sphereRadius * sphereRadius)
    }
    default: {
      return false
    }
  }
}

// Checks whether any of the planes in a stack intersect the Gaussian surface.
export function stackedPlanesIntersectSurface(surface, stacked) {
  const centerPlane = toVector3(stacked.position || [0, 0, 0])
  const direction = new THREE.Vector3(...(stacked.direction || [0, 1, 0])).normalize()
  const spacing = stacked.spacing || 1
  const count = Array.isArray(stacked.charge_densities) ? stacked.charge_densities.length : 0
  if (count === 0) return false
  const radius = getSurfaceBoundingRadius(surface)
  const center = toVector3(surface.position || [0, 0, 0])
  const halfSpan = (count - 1) * spacing / 2
  for (let i = 0; i < count; i++) {
    const offset = i * spacing - halfSpan
    const planeCenter = centerPlane.clone().add(direction.clone().multiplyScalar(offset))
    if (planeIntersectsSurface(surface, { ...stacked, infinite: stacked.infinite, position: planeCenter })) {
      const diff = center.clone().sub(planeCenter)
      const distance = Math.abs(diff.dot(direction))
      if (distance <= radius + 1e-3) return true
    }
  }
  return false
}

// Generic intersection dispatcher used before falling back to numerical flux sampling.
export function objectIntersectsSurface(surface, object) {
  if (!object || object.type === 'surface') return false
  switch (object.type) {
    case 'charge':
    case 'testPointCharge':
      return pointInsideSurface(surface, toVector3(object.position || [0, 0, 0]))
    case 'plane':
      return planeIntersectsSurface(surface, object)
    case 'wire':
      return wireIntersectsSurface(surface, object)
    case 'chargedSphere':
      return chargedSphereIntersectsSurface(surface, object)
    case 'concentricSpheres': {
      const maxRadius = Math.max(...(object.radiuses || [0]))
      return chargedSphereIntersectsSurface(surface, { ...object, radius: maxRadius })
    }
    case 'concentricInfWires': {
      const maxRadius = Math.max(...(object.radiuses || [0]))
      const fakeWire = {
        position: object.position,
        direction: object.direction,
        height: object.height ?? 10,
        radius: maxRadius,
      }
      return wireIntersectsSurface(surface, fakeWire)
    }
    case 'stackedPlanes':
      return stackedPlanesIntersectSurface(surface, object)
    default: {
      if (Array.isArray(object.charges) && object.charges.length > 0) {
        return object.charges.some((embedded) => {
          const base = toVector3(object.position || [0, 0, 0])
          const offset = new THREE.Vector3(
            embedded.position?.[0] ?? 0,
            embedded.position?.[1] ?? 0,
            embedded.position?.[2] ?? 0
          )
          return pointInsideSurface(surface, base.clone().add(offset))
        })
      }
      return pointInsideSurface(surface, toVector3(object.position || [0, 0, 0]))
    }
  }
}
