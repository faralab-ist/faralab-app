import * as THREE from 'three'
import CuboidShape from './cuboidShape'
import SphereShape from './sphereShape'
import CylinderShape from './cylinderShape'

const PLANE_BASE_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
const PLANE_DEFAULT_NORMAL = new THREE.Vector3(0, 1, 0)
const PLANE_BASE_WIDTH_AXIS = new THREE.Vector3(1, 0, 0).applyQuaternion(PLANE_BASE_QUAT)
const PLANE_BASE_HEIGHT_AXIS = new THREE.Vector3(0, 1, 0).applyQuaternion(PLANE_BASE_QUAT)

export const PLANE_AREA_SAMPLES_MIN = 4
export const PLANE_AREA_SAMPLES_MAX = 28
export const PLANE_AREA_SAMPLES_MAX_FINE = 240
export const PLANE_AREA_SAMPLE_DENSITY = 2
export const PLANE_AREA_SAMPLE_DENSITY_FINE = 24

const SURFACE_SHAPE_FACTORY = {
  sphere: (surface) => new SphereShape({ radius: surface.radius ?? 1 }),
  cylinder: (surface) => new CylinderShape({ radius: surface.radius ?? 1, height: surface.height ?? 1 }),
  cuboid: (surface) =>
    new CuboidShape({
      width: surface.width ?? 1,
      height: surface.height ?? 1,
      depth: surface.depth ?? 1,
    }),
}

// Converts raw arrays/tuples into THREE.Vector3 for downstream math helpers.
export function toVector3(value = [0, 0, 0]) {
  return value instanceof THREE.Vector3 ? value.clone() : new THREE.Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0)
}

// Builds a helper shape (sphere/cylinder/cuboid) for Gaussian-surface containment tests.
export function getSurfaceShape(surface) {
  const factory = SURFACE_SHAPE_FACTORY[surface.surfaceType]
  return factory ? factory(surface) : null
}

// Returns the surface half-extents which are reused in SAT/bounds checks.
export function getHalfExtents(surface) {
  switch (surface.surfaceType) {
    case 'sphere': {
      const r = Math.abs(surface.radius ?? 1)
      return new THREE.Vector3(r, r, r)
    }
    case 'cylinder': {
      const r = Math.abs(surface.radius ?? 1)
      const halfHeight = Math.abs(surface.height ?? 1) / 2
      return new THREE.Vector3(r, halfHeight, r)
    }
    case 'cuboid': {
      return new THREE.Vector3(
        Math.abs(surface.width ?? 1) / 2,
        Math.abs(surface.height ?? 1) / 2,
        Math.abs(surface.depth ?? 1) / 2
      )
    }
    default:
      return new THREE.Vector3(1, 1, 1)
  }
}

// Reconstructs the plane quaternion from stored quaternion/rotation/direction data.
export function getPlaneQuaternion(plane = {}) {
  if (Array.isArray(plane.quaternion) && plane.quaternion.length === 4) {
    return new THREE.Quaternion(plane.quaternion[0], plane.quaternion[1], plane.quaternion[2], plane.quaternion[3])
  }
  if (Array.isArray(plane.rotation) && plane.rotation.length >= 3) {
    const euler = new THREE.Euler(plane.rotation[0], plane.rotation[1], plane.rotation[2], 'XYZ')
    return new THREE.Quaternion().setFromEuler(euler)
  }
  const direction = new THREE.Vector3(...(plane.direction || [0, 1, 0])).normalize()
  if (direction.distanceTo(PLANE_DEFAULT_NORMAL) < 1e-6) {
    return new THREE.Quaternion()
  }
  return new THREE.Quaternion().setFromUnitVectors(PLANE_DEFAULT_NORMAL, direction)
}

// Provides the plane normal plus the two tangent axes in world coordinates.
export function getPlaneBasisVectors(plane = {}) {
  const quat = getPlaneQuaternion(plane)
  const normal = PLANE_DEFAULT_NORMAL.clone().applyQuaternion(quat).normalize()
  const widthAxis = PLANE_BASE_WIDTH_AXIS.clone().applyQuaternion(quat).normalize()
  const heightAxis = PLANE_BASE_HEIGHT_AXIS.clone().applyQuaternion(quat).normalize()
  return { normal, widthAxis, heightAxis }
}

// Reads the plane width/height (finite rectangle footprint) from the object.
export function getPlaneExtents(plane = {}) {
  const width = Math.abs(plane.planeWidth ?? plane.dimensions?.[0] ?? plane.width ?? 0)
  const height = Math.abs(plane.planeHeight ?? plane.dimensions?.[1] ?? plane.height ?? 0)
  return { width, height }
}

// Tests whether a world-space point lies inside the Gaussian surface volume.
export function pointInsideSurface(surface, pointWorld) {
  const shape = getSurfaceShape(surface)
  if (!shape || typeof shape.containsPoint !== 'function') return false
  const position = toVector3(surface.position || [0, 0, 0])
  const quaternion = CuboidShape.buildQuaternion(surface)
  const inv = quaternion.clone().invert()
  const local = pointWorld.clone().sub(position).applyQuaternion(inv)
  return shape.containsPoint(local)
}

// Samples the plane patch to estimate how much area is enclosed by the surface.
export function samplePlaneOverlapArea(surface, plane, { density = PLANE_AREA_SAMPLE_DENSITY, maxSamples = PLANE_AREA_SAMPLES_MAX } = {}) {
  const { width, height } = getPlaneExtents(plane)
  if (width <= 0 || height <= 0) return 0
  const center = toVector3(plane.position || [0, 0, 0])
  const { widthAxis, heightAxis } = getPlaneBasisVectors(plane)
  const samplesU = Math.max(PLANE_AREA_SAMPLES_MIN, Math.min(maxSamples, Math.ceil(width * density)))
  const samplesV = Math.max(PLANE_AREA_SAMPLES_MIN, Math.min(maxSamples, Math.ceil(height * density)))
  if (samplesU <= 0 || samplesV <= 0) return 0
  const stepU = width / samplesU
  const stepV = height / samplesV
  const halfWidth = width / 2
  const halfHeight = height / 2
  const cellArea = stepU * stepV
  const samplePoint = new THREE.Vector3()
  let enclosedArea = 0
  for (let i = 0; i < samplesU; i++) {
    const offsetU = -halfWidth + (i + 0.5) * stepU
    for (let j = 0; j < samplesV; j++) {
      const offsetV = -halfHeight + (j + 0.5) * stepV
      samplePoint.copy(center)
      samplePoint.addScaledVector(widthAxis, offsetU)
      samplePoint.addScaledVector(heightAxis, offsetV)
      if (pointInsideSurface(surface, samplePoint)) enclosedArea += cellArea
    }
  }
  return enclosedArea
}

// Returns the bounding-sphere radius for any Gaussian surface shape.
export function getSurfaceBoundingRadius(surface) {
  switch (surface.surfaceType) {
    case 'sphere':
      return Math.abs(surface.radius ?? 1)
    case 'cylinder': {
      const radius = Math.abs(surface.radius ?? 1)
      const halfHeight = Math.abs(surface.height ?? 1) / 2
      return Math.sqrt(radius * radius + halfHeight * halfHeight)
    }
    case 'cuboid': {
      const halfWidth = Math.abs(surface.width ?? 1) / 2
      const halfHeight = Math.abs(surface.height ?? 1) / 2
      const halfDepth = Math.abs(surface.depth ?? 1) / 2
      return Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight + halfDepth * halfDepth)
    }
    default:
      return 1
  }
}
