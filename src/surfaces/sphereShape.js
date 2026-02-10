import * as THREE from 'three'

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const fibonacciSpherePoints = (count, radius) => {
  if (!Number.isFinite(count) || count <= 0) return []
  if (count === 1) return [new THREE.Vector3(0, radius, 0)]

  const pts = []
  const offset = 2 / count
  for (let i = 0; i < count; i++) {
    const y = (i * offset - 1) + offset / 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const phi = i * GOLDEN_ANGLE
    const x = Math.cos(phi) * r
    const z = Math.sin(phi) * r
    pts.push(new THREE.Vector3(x * radius, y * radius, z * radius))
  }
  return pts
}

export default class SphereShape {
  constructor({ radius = 1 } = {}) {
    this.radius = radius
    this.representativeDir = new THREE.Vector3(1, 1, 1).normalize()
  }

  getRepresentativeNormals() {
    const origin = this.representativeDir.clone().multiplyScalar(this.radius)
    return [{ origin, dir: this.representativeDir.clone() }]
  }

  // Sample evenly distributed points on the sphere and optionally return normals + area per sample.
  sampleSurfacePoints(sampleCount, { includeNormals = false } = {}) {
    const points = fibonacciSpherePoints(sampleCount, this.radius)
    const actualCount = points.length || 1
    const areaPerSample = (4 * Math.PI * this.radius * this.radius) / actualCount

    return points.map(point => {
      if (!includeNormals) {
        return { position: point.clone() }
      }
      return {
        position: point.clone(),
        normal: point.clone().normalize(),
        area: areaPerSample,
      }
    })
  }

  containsPoint(localPoint, epsilon = 1e-6) {
    if (!localPoint) return false
    return localPoint.lengthSq() <= (this.radius + epsilon) * (this.radius + epsilon)
  }
}
