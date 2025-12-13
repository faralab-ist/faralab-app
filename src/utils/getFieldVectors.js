import * as THREE from 'three'
import calculateFieldAtPoint from './calculateField'
import calculateMagFieldAtPoint from './calculateMagField'

export function showMagVectorField(chargedObjects, gridSize = 10, step = 1, showOnlyPlane = false, minThreshold = 0, planeFilter = null) {
  const fieldVectors = []
  const nSteps = Math.floor(gridSize / step)

  for (let ix = -nSteps; ix <= nSteps; ix++) {
    const x = ix * step
    for (let iy = -nSteps; iy <= nSteps; iy++) {
      const y = iy * step
      for (let iz = -nSteps; iz <= nSteps; iz++) {
        const z = iz * step

        if (planeFilter === 'xy' && z !== 0) continue
        if (planeFilter === 'yz' && x !== 0) continue
        if (planeFilter === 'xz' && y !== 0) continue

        const targetPos = new THREE.Vector3(x, y, z)
        const fieldAtPoint = calculateMagFieldAtPoint(chargedObjects, targetPos)
        if (fieldAtPoint.length() > minThreshold) {
          fieldVectors.push({ position: targetPos, field: fieldAtPoint })
        }
      }
    }
  }
  return fieldVectors
}

// Helper: gera grid retangular 2D
function makeRectGrid(width, height, count) {
  const aspect = Math.max(0.0001, width / height)
  const cols = Math.ceil(Math.sqrt(count * aspect))
  const rows = Math.ceil(count / cols)
  const points = []

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (points.length >= count) break
      const x = (-width / 2) + (j + 0.5) * (width / cols)
      const y = (-height / 2) + (i + 0.5) * (height / rows)
      points.push([x, y])
    }
  }
  return points
}

// Helper: distribui samples proporcionalmente por área
function allocateSamplesByArea(areas, totalSamples) {
  const totalArea = areas.reduce((s, a) => s + a, 0) || 1
  const exact = areas.map((a) => (a / totalArea) * totalSamples)
  const counts = exact.map(Math.floor)
  let allocated = counts.reduce((s, v) => s + v, 0)

  const rem = exact.map((v, i) => ({ frac: v - counts[i], i })).sort((a, b) => b.frac - a.frac)
  let ri = 0
  while (allocated < totalSamples && ri < rem.length) {
    counts[rem[ri++].i]++
    allocated++
  }
  return counts
}

function fibonacciSpherePoints(count, radius = 1) {
  if (count <= 0) return []
  if (count === 1) return [new THREE.Vector3(0, 0, 0)]
  const points = []
  const offset = 2 / count
  const increment = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = ((i * offset) - 1) + (offset / 2)
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const phi = i * increment
    const x = Math.cos(phi) * r
    const z = Math.sin(phi) * r
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius))
  }
  return points
}

/**
 * Default export to match existing imports:
 *   import getFieldVector3 from '../utils/getFieldVectors.js'
 */
export default function getFieldVector3(chargedObjects, gridSize = 10, step = 1, onlyGaussianField = false, minThreshold = 0, planeFilter = null) {
  const fieldVectors = []
  const objs = Array.isArray(chargedObjects) ? chargedObjects : []
  const threshold = minThreshold ?? 0

  if (!onlyGaussianField) {
    const nSteps = Math.floor(gridSize / step)
    const range = (n) => Array.from({ length: 2 * n + 1 }, (_, i) => (i - n) * step)

    const xVals = planeFilter === 'yz' ? [0] : range(nSteps)
    const yVals = planeFilter === 'xz' ? [0] : range(nSteps)
    const zVals = planeFilter === 'xy' ? [0] : range(nSteps)

    return xVals
      .flatMap((x) =>
        yVals.flatMap((y) =>
          zVals.map((z) => {
            const position = new THREE.Vector3(x, y, z)
            return { position, field: calculateFieldAtPoint(objs, position), sourceObject: null }
          })
        )
      )
      .filter(({ field }) => field.length() > threshold)
  }

  for (const obj of objs) {
    if (!obj || obj.type !== 'surface') continue

    const sampleCount = Math.max(1, obj.sampleCount || 64)
    const objPos = new THREE.Vector3(...(obj.position || [0, 0, 0]))
    let gridVector3 = []

    switch (obj.surfaceType) {
      case 'sphere': {
        gridVector3 = fibonacciSpherePoints(sampleCount, obj.radius)
        gridVector3 = gridVector3.map((p) => p.add(objPos.clone()))
        break
      }
      case 'cylinder': {
        const radius = obj.radius || 1
        const length = obj.height || 1
        const lateralArea = 2 * Math.PI * radius * length
        const capsArea = 2 * Math.PI * radius * radius
        const [lateralCount, capCount] = allocateSamplesByArea([lateralArea, capsArea], sampleCount)
        const [topCapCount, bottomCapCount] = [Math.floor(capCount / 2), Math.ceil(capCount / 2)]

        if (lateralCount > 0) {
          const circumference = 2 * Math.PI * radius
          const cols = Math.max(1, Math.ceil(Math.sqrt(lateralCount * circumference / Math.max(0.0001, length))))
          const rows = Math.max(1, Math.ceil(lateralCount / cols))
          for (let ri = 0; ri < rows && gridVector3.length < sampleCount; ri++) {
            for (let ci = 0; ci < cols && gridVector3.length < sampleCount; ci++) {
              const theta = ((ci + 0.5) / cols) * Math.PI * 2
              const y = -length / 2 + (ri + 0.5) * (length / rows)
              gridVector3.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius).add(objPos.clone()))
            }
          }
        }

        const sampleCap = (count, capY) => {
          const grid = makeRectGrid(2 * radius, 2 * radius, count)
          for (const [x, z] of grid) {
            if (x * x + z * z <= radius * radius && gridVector3.length < sampleCount) {
              gridVector3.push(new THREE.Vector3(x, capY, z).add(objPos.clone()))
            }
          }
        }
        sampleCap(topCapCount, length / 2)
        sampleCap(bottomCapCount, -length / 2)
        break
      }
      case 'plane': {
        const [width = 1, height = 1] = obj.dimensions || [1, 1]
        const grid = makeRectGrid(width, height, sampleCount)
        gridVector3 = grid.map(([x, y]) => new THREE.Vector3(x, y, 0).add(objPos))
        break
      }
      case 'cuboid': {
        const w = obj.width ?? 1
        const h = obj.height ?? 1
        const d = obj.depth ?? 1
        const faces = [
          { u: 'x', v: 'y', wAxis: 'z', uSize: w, vSize: h, wPos: d / 2 },
          { u: 'x', v: 'y', wAxis: 'z', uSize: w, vSize: h, wPos: -d / 2 },
          { u: 'x', v: 'z', wAxis: 'y', uSize: w, vSize: d, wPos: h / 2 },
          { u: 'x', v: 'z', wAxis: 'y', uSize: w, vSize: d, wPos: -h / 2 },
          { u: 'y', v: 'z', wAxis: 'x', uSize: h, vSize: d, wPos: w / 2 },
          { u: 'y', v: 'z', wAxis: 'x', uSize: h, vSize: d, wPos: -w / 2 },
        ]
        const areas = faces.map((f) => f.uSize * f.vSize)
        const counts = allocateSamplesByArea(areas, sampleCount)

        faces.forEach((f, i) => {
          if (counts[i] <= 0) return
          const grid = makeRectGrid(f.uSize, f.vSize, counts[i])
          for (const [uu, vv] of grid) {
            if (gridVector3.length >= sampleCount) break
            const p = new THREE.Vector3()
            p[f.u] = uu
            p[f.v] = vv
            p[f.wAxis] = f.wPos
            gridVector3.push(p.add(objPos.clone()))
          }
        })
        break
      }
      default: {
        gridVector3 = [objPos.clone()]
      }
    }

    for (const pointVector3 of gridVector3) {
      const fieldAtPoint = calculateFieldAtPoint([obj], pointVector3)
      if (fieldAtPoint.length() <= threshold) continue
      fieldVectors.push({ position: pointVector3, field: fieldAtPoint, sourceObject: obj })
    }
  }

  return fieldVectors
}
