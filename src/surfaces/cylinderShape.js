import * as THREE from 'three'

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const fibonacciDiskPoints = (count, radius) => {
  if (!Number.isFinite(count) || count <= 0) return []
  const pts = []
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const r = radius * Math.sqrt(t)
    const theta = i * GOLDEN_ANGLE
    pts.push(new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta)))
  }
  return pts
}

export default class CylinderShape {
  constructor({ radius = 1, height = 1 } = {}) {
    this.radius = radius
    this.height = height
  }

  getRepresentativeNormals() {
    const normals = []
    normals.push({
      origin: new THREE.Vector3(0, this.height / 2, 0),
      dir: new THREE.Vector3(0, 1, 0),
    })
    normals.push({
      origin: new THREE.Vector3(0, -this.height / 2, 0),
      dir: new THREE.Vector3(0, -1, 0),
    })
    const sideDir = new THREE.Vector3(1, 0, 1).normalize()
    normals.push({
      origin: sideDir.clone().multiplyScalar(this.radius),
      dir: sideDir.clone(),
    })
    return normals
  }

  sampleSurfacePoints(sampleCount, { includeNormals = false } = {}) {
    if (this.radius <= 0 || this.height <= 0 || !Number.isFinite(sampleCount) || sampleCount <= 0) {
      return []
    }

    const lateralArea = 2 * Math.PI * this.radius * this.height
    const capArea = Math.PI * this.radius * this.radius
    const parts = [
      { key: 'lateral', area: lateralArea },
      { key: 'top', area: capArea },
      { key: 'bottom', area: capArea },
    ]

    const totalArea = parts.reduce((sum, part) => sum + part.area, 0)
    const exactCounts = parts.map(part => (part.area / totalArea) * sampleCount)
    const counts = exactCounts.map(value => Math.floor(value))
    let allocated = counts.reduce((sum, value) => sum + value, 0)
    const remainder = exactCounts
      .map((value, index) => ({ frac: value - counts[index], index }))
      .sort((a, b) => b.frac - a.frac)
    let ri = 0
    while (allocated < sampleCount && remainder.length > 0) {
      counts[remainder[ri % remainder.length].index]++
      allocated++
      ri++
    }

    const samples = []
    const addSample = (position, normal, area) => {
      if (!includeNormals) {
        samples.push({ position: position.clone() })
        return
      }
      samples.push({
        position: position.clone(),
        normal: normal.clone(),
        area,
      })
    }

    const [lateralCount, topCount, bottomCount] = counts

    if (lateralCount > 0) {
      const cols = Math.max(
        1,
        Math.ceil(Math.sqrt((lateralCount * (2 * Math.PI * this.radius)) / Math.max(0.0001, this.height)))
      )
      const rows = Math.max(1, Math.ceil(lateralCount / cols))
      const areaPerSample = lateralArea / lateralCount
      let produced = 0
      for (let row = 0; row < rows && produced < lateralCount; row++) {
        for (let col = 0; col < cols && produced < lateralCount; col++) {
          const theta = ((col + 0.5) / cols) * Math.PI * 2
          const y = -this.height / 2 + (row + 0.5) * (this.height / rows)
          const x = Math.cos(theta) * this.radius
          const z = Math.sin(theta) * this.radius
          addSample(new THREE.Vector3(x, y, z), new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)), areaPerSample)
          produced++
        }
      }
    }

    const sampleCap = (count, y, normalDir) => {
      if (count <= 0) return
      const points = fibonacciDiskPoints(count, this.radius)
      const areaPerSample = capArea / count
      const normal = new THREE.Vector3(0, normalDir, 0)
      points.forEach(p => {
        addSample(new THREE.Vector3(p.x, y, p.z), normal, areaPerSample)
      })
    }

    sampleCap(topCount, this.height / 2, 1)
    sampleCap(bottomCount, -this.height / 2, -1)

    return samples
  }

  containsPoint(localPoint, epsilon = 1e-6) {
    if (!localPoint) return false
    const halfHeight = this.height / 2 + epsilon
    if (Math.abs(localPoint.y) > halfHeight) return false
    const radiusSq = (this.radius + epsilon) * (this.radius + epsilon)
    return (localPoint.x * localPoint.x + localPoint.z * localPoint.z) <= radiusSq
  }
}
