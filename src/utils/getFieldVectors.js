import * as THREE from 'three'
import { sampleGaussianSurface } from '../Surfaces/gaussianSurfaceSampler'
import calculateFieldAtPoint from './calculateField'
import calculateMagFieldAtPoint from './calculateMagField'

export function showMagVectorField(
    chargedObjects, gridSize = 10, step = 1, showOnlyPlane = false,
    minThreshold, planeFilter = null) {
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
        //console.log('fieldAtPoint=', fieldAtPoint);
        if (fieldAtPoint.length() > minThreshold)
          fieldVectors.push({ position: targetPos, field: fieldAtPoint })
      }
    }
  }
  return fieldVectors;
}

export default function showVectorField(
    chargedObjects, gridSize = 10, step = 1, showOnlyPlane = false,
    showOnlyElectricField = false, minThreshold, planeFilter = null) {
  const fieldVectors = []
  const nSteps = Math.floor(gridSize / step)

  if (!showOnlyElectricField) {
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
          const fieldAtPoint = calculateFieldAtPoint(chargedObjects, targetPos)

          if (fieldAtPoint.length() > minThreshold)
            fieldVectors.push({ position: targetPos, field: fieldAtPoint })
        }
      }
    }
    return fieldVectors
  }

  //--------------------------------------------------------------------
  // NAO FAÇO IDEIA COMO FUNCIONA FOI O CHATGPT QUE FEZ E FUNCIONA
  // sample on Gaussian surfaces
  for (const obj of chargedObjects) {
    if (!(obj.type === 'surface'))
      continue

          let sampleCount = Math.max(1, obj.sampleCount || 64)
      const objPos = new THREE.Vector3(...(obj.position || [0, 0, 0]))
      let gridVector3 = []

          switch (obj.surfaceType) {
        case 'sphere':
        case 'cylinder':
        case 'cuboid': {
          const samples = sampleGaussianSurface(obj)
          gridVector3 = samples.map(sample => sample.position)
          break
        }

        case 'plane': {
          // assume sheet lies on local X-Y plane (z constant), centered at
          // objPos
          const width = obj.dimensions?.[0] || 1
          const height = obj.dimensions?.[1] || 1
          const aspect = Math.max(0.0001, width / height)
          const cols = Math.ceil(Math.sqrt(sampleCount * aspect))
          const rows = Math.ceil(sampleCount / cols)
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
              if (gridVector3.length >= sampleCount)
                break 
              const x = (-width / 2) + (j + 0.5) * (width / cols)
                const y = (-height / 2) + (i + 0.5) * (height / rows)
                gridVector3.push(new THREE.Vector3(x, y, 0).add(objPos))
            }
          }
          break
        }

        default: {
          gridVector3 = [objPos.clone()]
        }
      }

    let final_vectors = []

    for (const pointVector3 of gridVector3) {
      const fieldAtPoint = calculateFieldAtPoint(chargedObjects, pointVector3)
      fieldVectors.push({position: pointVector3, field: fieldAtPoint})
    }
  }

  return fieldVectors
}
