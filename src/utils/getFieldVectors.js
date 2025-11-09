import * as THREE from 'three'
import calculateFieldAtPoint from './calculateField'

export default function getFieldVector3(objects, gridSize = 10, step = 1, showOnlyPlane = false, showOnlyElectricField = false, min) {
  const fieldVectors = []

  if (!showOnlyElectricField) {
    const yLevel = showOnlyPlane ? 0 : gridSize
    for (let x = -gridSize; x <= gridSize; x += step) {
      for (let y = -yLevel; y <= yLevel; y += step) {
        for (let z = -gridSize; z <= gridSize; z += step) {
          const targetPos = new THREE.Vector3(x, y, z)
          const fieldAtPoint = calculateFieldAtPoint(objects, targetPos)
          if(fieldAtPoint.length() > min)
            fieldVectors.push({ position: targetPos, field: fieldAtPoint })
        }
      }
    }
    return fieldVectors
  }

  //--------------------------------------------------------------------
    // NAO FAÇO IDEIA COMO FUNCIONA FOI O CHATGPT QUE FEZ E FUNCIONA
  // sample on Gaussian surfaces
  for (const obj of objects) {
    if (!(obj.type === 'surface')) continue

    let sampleCount = Math.max(1, obj.sampleCount || 64)
    const objPos = new THREE.Vector3(...(obj.position || [0, 0, 0]))
    let gridVector3 = []

    switch (obj.surfaceType) {
      case 'sphere': {
        //const radius = (obj.dimensions?.[0] || 1)
        gridVector3 = fibonacciSpherePoints(sampleCount, obj.radius)
        gridVector3 = gridVector3.map(p => p.add(objPos.clone().multiplyScalar(2)))
        break
      }

      case 'cylinder': {
        // treat wire as a finite cylinder: sample uniformly over lateral surface and caps (area-proportional)
        const radius = obj.radius || 1
        const length = obj.height || 1

        const lateralArea = 2 * Math.PI * radius * length
        const capsArea = 2 * Math.PI * radius * radius
        const totalArea = lateralArea + capsArea || 1

        // allocate samples proportional to area
        let lateralCount = Math.round(sampleCount * (lateralArea / totalArea))
        lateralCount = Math.max(0, lateralCount)
        let remaining = sampleCount - lateralCount
        const topCapCount = Math.floor(remaining / 2)
        const bottomCapCount = remaining - topCapCount

        // lateral surface: make a rows x cols grid over (height x circumference)
        if (lateralCount > 0) {
          const cols = Math.max(1, Math.ceil(Math.sqrt(lateralCount * (2 * Math.PI * radius) / Math.max(0.0001, length))))
          const rows = Math.max(1, Math.ceil(lateralCount / cols))
          for (let ri = 0; ri < rows; ri++) {
            for (let ci = 0; ci < cols; ci++) {
              if (gridVector3.length >= lateralCount) break
              const theta = ((ci + 0.5) / cols) * Math.PI * 2
              const y = -length / 2 + (ri + 0.5) * (length / rows)
              const x = Math.cos(theta) * radius
              const z = Math.sin(theta) * radius
              gridVector3.push(new THREE.Vector3(x, y, z).add(objPos.clone().multiplyScalar(2)))
            }
          }
        }

        // caps: simple deterministic grid in bounding square, reject outside circle
        function sampleCap(count, capY) {
          if (count <= 0) return
          const cols = Math.max(1, Math.ceil(Math.sqrt(count)))
          const rows = Math.max(1, Math.ceil(count / cols))
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (gridVector3.length >= sampleCount) return
              const x = -radius + (c + 0.5) * (2 * radius / cols)
              const z = -radius + (r + 0.5) * (2 * radius / rows)
              if (x * x + z * z <= radius * radius) {
                gridVector3.push(new THREE.Vector3(x, capY, z).add(objPos.clone().multiplyScalar(2)))
              }
            }
          }
        }

        sampleCap(topCapCount, length / 2)
        sampleCap(bottomCapCount, -length / 2)
        break
      }

      case 'plane': {
        // assume sheet lies on local X-Y plane (z constant), centered at objPos
        const width = obj.dimensions?.[0] || 1
        const height = obj.dimensions?.[1] || 1
        const aspect = Math.max(0.0001, width / height)
        const cols = Math.ceil(Math.sqrt(sampleCount * aspect))
        const rows = Math.ceil(sampleCount / cols)
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            if (gridVector3.length >= sampleCount) break
            const x = (-width / 2) + (j + 0.5) * (width / cols)
            const y = (-height / 2) + (i + 0.5) * (height / rows)
            gridVector3.push(new THREE.Vector3(x, y, 0).add(objPos))
          }
        }
        break
      }

      case 'cuboid': {
        // sample on prism surface (axis-aligned box) — distribute points on faces proportional to face area
        const [w = 1, h = 1, d = 1] = [obj.width, obj.height, obj.depth]
        const faces = [
          { u: 'x', v: 'y', wAxis: 'z', uSize: w, vSize: h, wPos: d / 2 }, // +z
          { u: 'x', v: 'y', wAxis: 'z', uSize: w, vSize: h, wPos: -d / 2 }, // -z
          { u: 'x', v: 'z', wAxis: 'y', uSize: w, vSize: d, wPos: h / 2 }, // +y
          { u: 'x', v: 'z', wAxis: 'y', uSize: w, vSize: d, wPos: -h / 2 }, // -y
          { u: 'y', v: 'z', wAxis: 'x', uSize: h, vSize: d, wPos: w / 2 }, // +x
          { u: 'y', v: 'z', wAxis: 'x', uSize: h, vSize: d, wPos: -w / 2 }, // -x
        ]
        const areas = faces.map(f => f.uSize * f.vSize)
        const totalArea = areas.reduce((s, a) => s + a, 0) || 1
        const exact = areas.map(a => (a / totalArea) * sampleCount)
        const counts = exact.map(v => Math.floor(v))
        let allocated = counts.reduce((s, v) => s + v, 0)
        const rem = exact.map((v, i) => ({ frac: v - counts[i], i })).sort((a, b) => b.frac - a.frac)
        let ri = 0
        while (allocated < sampleCount && ri < rem.length) {
          counts[rem[ri].i]++
          allocated++
          ri++
        }
        for (let fi = 0; fi < faces.length; fi++) {
          const f = faces[fi]
          const cnt = counts[fi]
          if (cnt <= 0) continue
          const cols = Math.ceil(Math.sqrt((cnt * f.uSize) / f.vSize))
          const rows = Math.ceil(cnt / cols)
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (gridVector3.length >= sampleCount) break
              const uu = (-f.uSize / 2) + (c + 0.5) * (f.uSize / cols)
              const vv = (-f.vSize / 2) + (r + 0.5) * (f.vSize / rows)
              const p = new THREE.Vector3()
              p[f.u] = uu
              p[f.v] = vv
              p[f.wAxis] = f.wPos
              gridVector3.push(p.add(objPos.clone().multiplyScalar(2)))
            }
          }
        }
        break
      }

      default: {
        gridVector3 = [objPos.clone()]
      }
    }

    for (const pointVector3 of gridVector3) {
      const fieldAtPoint = calculateFieldAtPoint(objects, pointVector3)      
      fieldVectors.push({ position: pointVector3, field: fieldAtPoint })
    }
  }

  return fieldVectors
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