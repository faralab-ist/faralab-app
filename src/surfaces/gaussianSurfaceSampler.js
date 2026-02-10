import * as THREE from 'three'
import CuboidShape from './cuboidShape'
import SphereShape from './sphereShape'
import CylinderShape from './cylinderShape'

const toVector3 = (value = []) =>
  value instanceof THREE.Vector3 ? value.clone() : new THREE.Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0)

const buildQuaternion = (obj) => CuboidShape.buildQuaternion(obj ?? {})

function applyTransform(samples, obj) {
  const position = toVector3(obj?.position)
  const quaternion = buildQuaternion(obj)
  return samples.map(sample => {
    const worldPosition = sample.position.clone().applyQuaternion(quaternion).add(position)
    if (sample.normal) {
      return {
        ...sample,
        position: worldPosition,
        normal: sample.normal.clone().applyQuaternion(quaternion).normalize(),
      }
    }
    return { ...sample, position: worldPosition }
  })
}

export function sampleGaussianSurface(obj, { includeNormals = false } = {}) {
  if (!obj || obj.type !== 'surface') return []
  const sampleCount = Math.max(1, obj.sampleCount || 64)

  switch (obj.surfaceType) {
    case 'sphere': {
      const shape = new SphereShape({ radius: obj.radius ?? 1 })
      const localSamples = shape.sampleSurfacePoints(sampleCount, { includeNormals })
      return applyTransform(localSamples, obj)
    }
    case 'cylinder': {
      const shape = new CylinderShape({ radius: obj.radius ?? 1, height: obj.height ?? 1 })
      const localSamples = shape.sampleSurfacePoints(sampleCount, { includeNormals })
      return applyTransform(localSamples, obj)
    }
    case 'cuboid': {
      const shape = new CuboidShape({
        width: obj.width ?? 1,
        height: obj.height ?? 1,
        depth: obj.depth ?? 1,
      })
      const localSamples = shape.sampleSurfacePoints(sampleCount, { includeNormals })
      return applyTransform(localSamples, obj)
    }
    default:
      return []
  }
}
