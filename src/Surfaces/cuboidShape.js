import * as THREE from 'three'

// Captures cuboid-specific geometry logic so we can reuse it in both the scene
// component and our field utilities.
export default class CuboidShape {
  constructor({ width = 1, height = 1, depth = 1 } = {}) {
    this.width = width
    this.height = height
    this.depth = depth
    this.faces = this._buildFaces()
  }

  _buildFaces() {
    const w = this.width
    const h = this.height
    const d = this.depth

    return [
      {
        normal: new THREE.Vector3(1, 0, 0),
        origin: new THREE.Vector3(w / 2, 0, 0),
        uAxis: 'y',
        vAxis: 'z',
        uLength: h,
        vLength: d,
        fixedAxis: 'x',
        fixedValue: w / 2,
      },
      {
        normal: new THREE.Vector3(-1, 0, 0),
        origin: new THREE.Vector3(-w / 2, 0, 0),
        uAxis: 'y',
        vAxis: 'z',
        uLength: h,
        vLength: d,
        fixedAxis: 'x',
        fixedValue: -w / 2,
      },
      {
        normal: new THREE.Vector3(0, 1, 0),
        origin: new THREE.Vector3(0, h / 2, 0),
        uAxis: 'x',
        vAxis: 'z',
        uLength: w,
        vLength: d,
        fixedAxis: 'y',
        fixedValue: h / 2,
      },
      {
        normal: new THREE.Vector3(0, -1, 0),
        origin: new THREE.Vector3(0, -h / 2, 0),
        uAxis: 'x',
        vAxis: 'z',
        uLength: w,
        vLength: d,
        fixedAxis: 'y',
        fixedValue: -h / 2,
      },
      {
        normal: new THREE.Vector3(0, 0, 1),
        origin: new THREE.Vector3(0, 0, d / 2),
        uAxis: 'x',
        vAxis: 'y',
        uLength: w,
        vLength: h,
        fixedAxis: 'z',
        fixedValue: d / 2,
      },
      {
        normal: new THREE.Vector3(0, 0, -1),
        origin: new THREE.Vector3(0, 0, -d / 2),
        uAxis: 'x',
        vAxis: 'y',
        uLength: w,
        vLength: h,
        fixedAxis: 'z',
        fixedValue: -d / 2,
      },
    ]
  }

  getFaceNormals() {
    return this.faces.map(face => ({
      origin: face.origin.clone(),
      dir: face.normal.clone(),
    }))
  }

  sampleSurfacePoints(sampleCount, { includeNormals = false } = {}) {
    if (!Number.isFinite(sampleCount) || sampleCount <= 0) return []

    const areas = this.faces.map(face => Math.max(0, face.uLength * face.vLength))
    const totalArea = areas.reduce((sum, area) => sum + area, 0) || 1
    const exactCounts = areas.map(area => (area / totalArea) * sampleCount)
    const counts = exactCounts.map(value => Math.floor(value))

    let allocated = counts.reduce((sum, value) => sum + value, 0)
    const remainder = exactCounts
      .map((value, index) => ({ frac: value - counts[index], index }))
      .sort((a, b) => b.frac - a.frac)

    let remainderIndex = 0
    while (allocated < sampleCount && remainderIndex < remainder.length) {
      counts[remainder[remainderIndex].index]++
      allocated++
      remainderIndex++
    }

    const samples = []
    for (let faceIndex = 0; faceIndex < this.faces.length; faceIndex++) {
      const face = this.faces[faceIndex]
      const targetCount = counts[faceIndex]
      if (targetCount <= 0) continue

      const cols = Math.max(
        1,
        Math.ceil(Math.sqrt((targetCount * face.uLength) / Math.max(0.0001, face.vLength)))
      )
      const rows = Math.max(1, Math.ceil(targetCount / cols))
      const faceArea = face.uLength * face.vLength
      const areaPerSample = targetCount > 0 ? faceArea / targetCount : 0

      let producedOnFace = 0
      for (let row = 0; row < rows; row++) {
        if (producedOnFace >= targetCount) break
        for (let col = 0; col < cols; col++) {
          if (producedOnFace >= targetCount) break
          const u = -face.uLength / 2 + (col + 0.5) * (face.uLength / cols)
          const v = -face.vLength / 2 + (row + 0.5) * (face.vLength / rows)
          const point = new THREE.Vector3()
          point[face.uAxis] = u
          point[face.vAxis] = v
          point[face.fixedAxis] = face.fixedValue

          if (includeNormals) {
            samples.push({
              position: point.clone(),
              normal: face.normal.clone(),
              area: areaPerSample,
            })
          } else {
            samples.push({ position: point.clone() })
          }
          producedOnFace++
        }
      }
    }

    return samples
  }

  containsPoint(localPoint, epsilon = 1e-6) {
    if (!localPoint) return false
    return (
      Math.abs(localPoint.x) <= this.width / 2 + epsilon &&
      Math.abs(localPoint.y) <= this.height / 2 + epsilon &&
      Math.abs(localPoint.z) <= this.depth / 2 + epsilon
    )
  }

  static buildQuaternion({ quaternion, rotation } = {}) {
    if (quaternion instanceof THREE.Quaternion) {
      return quaternion.clone()
    }
    if (Array.isArray(quaternion) && quaternion.length === 4) {
      return new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
    }
    if (rotation instanceof THREE.Euler) {
      return new THREE.Quaternion().setFromEuler(rotation)
    }
    if (Array.isArray(rotation) && rotation.length >= 3) {
      const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      return new THREE.Quaternion().setFromEuler(euler)
    }
    return new THREE.Quaternion()
  }

  static transformPoints(points, transform = {}) {
    const q = CuboidShape.buildQuaternion(transform)
    let posVec
    if (transform.position instanceof THREE.Vector3) {
      posVec = transform.position.clone()
    } else if (Array.isArray(transform.position)) {
      posVec = new THREE.Vector3(transform.position[0] ?? 0, transform.position[1] ?? 0, transform.position[2] ?? 0)
    } else {
      posVec = new THREE.Vector3(0, 0, 0)
    }
    return points.map(entry => {
      if (entry && entry.position instanceof THREE.Vector3) {
        const position = entry.position.clone().applyQuaternion(q).add(posVec)
        const transformed = { ...entry, position }
        if (entry.normal instanceof THREE.Vector3) {
          transformed.normal = entry.normal.clone().applyQuaternion(q).normalize()
        }
        return transformed
      }
      return entry.clone().applyQuaternion(q).add(posVec)
    })
  }
}
