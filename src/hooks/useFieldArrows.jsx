import * as THREE from 'three'
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import vertexShaderSource from '../shaders/arrowVertex.glsl'
import fragmentShaderSource from '../shaders/arrowFragment.glsl'
import getFieldVector3 from '../utils/getFieldVectors.js'

// returns true if point is 'after' the plane
function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip) {
  if (!useSlice) return true
  switch (slicePlane) {
    case 'xy':
      return slicePlaneFlip ^ point.z > slicePos
    case 'yz':
      return slicePlaneFlip ^ point.x > slicePos
    case 'xz':
      return slicePlaneFlip ^ point.y > slicePos
    default:
      return true
  }
}

export default function FieldArrows({
  objects,
  showOnlyPlane = false, // kept for API compatibility (unused)
  showOnlyGaussianField = false,
  fieldThreshold = 0.1,
  gridSize = 10,
  step = 1,
  minThreshold,
  scaleMultiplier,
  planeFilter = null,
  slicePlane,
  slicePos,
  useSlice,
  slicePlaneFlip,
  propagate = false,
}) {
  const vectorsUnfiltered = useMemo(
    () => getFieldVector3(objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter),
    [objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter]
  )

  const vectors = useMemo(
    () => vectorsUnfiltered.filter(({ position, field }) => sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)),
    [vectorsUnfiltered, slicePlane, slicePos, useSlice, slicePlaneFlip]
  )

  const MAX_L = useMemo(() => {
    let maxL = 0
    for (const { field } of vectors) {
      const mag = field.length()
      if (mag > maxL) maxL = mag
    }
    return maxL
  }, [vectors])

  const logMax = MAX_L > 0 ? Math.log1p(MAX_L) : 1

  const arrowGeometry = useMemo(() => {
    const s = scaleMultiplier || 1
    const shaft = new THREE.CylinderGeometry(0.01, 0.01, 0.8 * s, 6)
    const head = new THREE.ConeGeometry(0.05, 0.2, 8)
    head.translate(0, 0.4 * s, 0)
    const merged = BufferGeometryUtils.mergeGeometries([shaft, head])
    merged.computeVertexNormals()
    merged.translate(0, 0.4 * s, 0)
    merged.computeBoundingSphere()
    return merged
  }, [scaleMultiplier])

  const createInstancedAttributes = React.useCallback(
    (vectorList) => {
      const quant = 1e-2
      const map = new Map()
      for (const { position, field } of vectorList) {
        const key = `${Math.round(position.x / quant)}|${Math.round(position.y / quant)}|${Math.round(position.z / quant)}`
        const entry = map.get(key)
        if (!entry) {
          map.set(key, { position: position.clone(), field: field.clone(), count: 1 })
        } else {
          entry.field.add(field)
          entry.count++
        }
      }

      const unique = []
      for (const v of map.values()) {
        v.field.divideScalar(v.count)
        unique.push({ position: v.position, field: v.field })
      }

      const positions = new Float32Array(unique.length * 3)
      const directions = new Float32Array(unique.length * 3)
      const scales = new Float32Array(unique.length)
      const colors = new Float32Array(unique.length * 3)
      const delays = new Float32Array(unique.length)

      const objectCenters = objects && objects.length ? objects.map((o) => new THREE.Vector3(...(o.position || [0, 0, 0]))) : [new THREE.Vector3(0, 0, 0)]

      let maxDist = 0
      for (const { position } of unique) {
        let minD = Infinity
        for (const c of objectCenters) {
          const d = position.distanceTo(c)
          if (d < minD) minD = d
        }
        if (!isFinite(minD)) minD = position.length()
        if (minD > maxDist) maxDist = minD
      }

      let i = 0
      for (const { position, field } of unique) {
        const mag = field.length()
        if (mag <= fieldThreshold) continue
        const logMag = Math.log1p(mag)
        const normalized = logMax > 0 ? Math.min(Math.max(logMag / logMax, 0), 1) : 0
        const hue = (0.18 - normalized * 0.4) < 0 ? 0 : (0.18 - normalized * 0.4)
        const color = new THREE.Color().setHSL(hue, 1, 0.5)
        const dir = field.clone().normalize()

        positions[i * 3] = position.x
        positions[i * 3 + 1] = position.y
        positions[i * 3 + 2] = position.z

        directions[i * 3] = dir.x
        directions[i * 3 + 1] = dir.y
        directions[i * 3 + 2] = dir.z

        const parameter = 1 - Math.exp(-logMag)
        scales[i] = Math.min(Math.max(parameter, 0), 1.0)

        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b

        let minDistToObject = Infinity
        for (const c of objectCenters) {
          const d = position.distanceTo(c)
          if (d < minDistToObject) minDistToObject = d
        }
        if (!isFinite(minDistToObject)) minDistToObject = position.length()
        const dist = minDistToObject
        delays[i] = maxDist > 0 ? dist / maxDist : 0

        i++
      }

      return { positions, directions, scales, colors, delays, count: i }
    },
    [objects, fieldThreshold, logMax]
  )

  const materialRef = useRef()
  const meshRef = useRef()
  const startTimeRef = useRef(0)
  const animationCompleteRef = useRef(false)
  const distanceRingsRef = useRef([])

  const material = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: vertexShaderSource,
      fragmentShader: fragmentShaderSource,
      vertexColors: true,
      transparent: true,
    })
    return m
  }, [])
  materialRef.current = material

  const vectorsKey = useMemo(() => {
    const vectorsHash = JSON.stringify(
      vectors.map((v) => [
        Math.round(v.position.x * 100) / 100,
        Math.round(v.position.y * 100) / 100,
        Math.round(v.position.z * 100) / 100,
        Math.round(v.field.length() * 100) / 100,
      ])
    )

    const objectsHash = objects
      .map((o) => {
        if (o.type === 'plane') {
          const dir = o.direction || [0, 1, 0]
          const quat = o.quaternion || []
          return `${o.id}:${dir[0].toFixed(2)},${dir[1].toFixed(2)},${dir[2].toFixed(2)}:${quat.map((q) => q.toFixed(2)).join(',')}:${(o.charge_density || 0).toFixed(3)}`
        }
        if (o.type === 'wire') {
          const dir = o.direction || [0, 1, 0]
          const pos = o.position || [0, 0, 0]
          const quat = o.quaternion || []
          return `${o.id}:${pos[0].toFixed(2)},${pos[1].toFixed(2)},${pos[2].toFixed(2)}:${dir[0].toFixed(2)},${dir[1].toFixed(2)},${dir[2].toFixed(2)}:${quat.map((q) => q.toFixed(2)).join(',')}:${(o.charge || 0).toFixed(3)}`
        }
        const pos = o.position || [0, 0, 0]
        return `${o.id}:${pos[0].toFixed(2)},${pos[1].toFixed(2)},${pos[2].toFixed(2)}:${(o.charge || 0).toFixed(3)}`
      })
      .join(';')

    return `${vectorsHash}__${objectsHash}`
  }, [vectors, objects])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const attrs = createInstancedAttributes(vectors)
    const maxCount = attrs.count || 0

    if (maxCount === 0) {
      mesh.count = 0
      return
    }

    if (!propagate) {
      const geom = arrowGeometry.clone()
      geom.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(attrs.positions, 3))
      geom.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(attrs.directions, 3))
      geom.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(attrs.scales, 1))
      geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(attrs.colors, 3))
      geom.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(attrs.delays, 1))
      mesh.geometry = geom
      mesh.frustumCulled = false
      mesh.count = maxCount
      animationCompleteRef.current = true
      return () => {
        geom.dispose()
      }
    }

    const vectorsWithDist = []
    for (let i = 0; i < maxCount; i++) {
      const px = attrs.positions[i * 3]
      const py = attrs.positions[i * 3 + 1]
      const pz = attrs.positions[i * 3 + 2]
      const pos = new THREE.Vector3(px, py, pz)

      let minDist = Infinity
      for (const obj of objects) {
        const objPos = new THREE.Vector3(...(obj.position || [0, 0, 0]))
        if (obj.type === 'plane') {
          const planeNormal = new THREE.Vector3(...(obj.direction || [0, 1, 0])).normalize()
          const toPoint = pos.clone().sub(objPos)
          const distAlongNormal = Math.abs(toPoint.dot(planeNormal))
          if (distAlongNormal < minDist) minDist = distAlongNormal
        } else {
          const d = pos.distanceTo(objPos)
          if (d < minDist) minDist = d
        }
      }
      if (!isFinite(minDist)) minDist = pos.length()
      vectorsWithDist.push({ index: i, dist: minDist })
    }

    vectorsWithDist.sort((a, b) => a.dist - b.dist)

    const ringSize = step * 0.8
    const rings = []
    let currentRing = []
    let currentDist = vectorsWithDist[0]?.dist || 0

    for (const v of vectorsWithDist) {
      if (Math.abs(v.dist - currentDist) > ringSize) {
        if (currentRing.length > 0) {
          rings.push([...currentRing])
        }
        currentRing = [v]
        currentDist = v.dist
      } else {
        currentRing.push(v)
      }
    }
    if (currentRing.length > 0) {
      rings.push(currentRing)
    }

    distanceRingsRef.current = []
    let cumulative = 0
    for (const ring of rings) {
      cumulative += ring.length
      distanceRingsRef.current.push(cumulative)
    }

    const geom = arrowGeometry.clone()
    const posArray = new Float32Array(maxCount * 3)
    const dirArray = new Float32Array(maxCount * 3)
    const scaleArray = new Float32Array(maxCount)
    const colorArray = new Float32Array(maxCount * 3)
    const delayArray = new Float32Array(maxCount)

    for (let i = 0; i < maxCount; i++) {
      const srcIdx = vectorsWithDist[i].index
      posArray[i * 3] = attrs.positions[srcIdx * 3]
      posArray[i * 3 + 1] = attrs.positions[srcIdx * 3 + 1]
      posArray[i * 3 + 2] = attrs.positions[srcIdx * 3 + 2]
      dirArray[i * 3] = attrs.directions[srcIdx * 3]
      dirArray[i * 3 + 1] = attrs.directions[srcIdx * 3 + 1]
      dirArray[i * 3 + 2] = attrs.directions[srcIdx * 3 + 2]
      scaleArray[i] = attrs.scales[srcIdx]
      colorArray[i * 3] = attrs.colors[srcIdx * 3]
      colorArray[i * 3 + 1] = attrs.colors[srcIdx * 3 + 1]
      colorArray[i * 3 + 2] = attrs.colors[srcIdx * 3 + 2]
      delayArray[i] = attrs.delays[srcIdx]
    }

    geom.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(posArray, 3))
    geom.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(dirArray, 3))
    geom.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scaleArray, 1))
    geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colorArray, 3))
    geom.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(delayArray, 1))

    mesh.geometry = geom
    mesh.frustumCulled = false
    mesh.count = 0

    startTimeRef.current = Date.now()
    animationCompleteRef.current = false

    return () => {
      geom.dispose()
    }
  }, [vectorsKey, arrowGeometry, vectors, objects, createInstancedAttributes, propagate, step])

  const attrs = useMemo(() => createInstancedAttributes(vectors), [vectors, createInstancedAttributes])
  const maxCount = attrs.count || 0

  useFrame(() => {
    if (!propagate) return
    const mesh = meshRef.current
    if (!mesh || !mesh.material || maxCount === 0) return
    if (animationCompleteRef.current) return

    const rings = distanceRingsRef.current
    if (!rings || rings.length === 0) {
      mesh.count = maxCount
      animationCompleteRef.current = true
      return
    }

    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const animDuration = rings.length * 0.1

    const progress = Math.min(elapsed / animDuration, 1.0)
    const ringIndex = Math.floor(progress * rings.length)

    if (progress < 1.0) {
      const targetCount = ringIndex < rings.length ? rings[ringIndex] : maxCount
      if (mesh.count !== targetCount) {
        mesh.count = targetCount
      }
    } else {
      if (mesh.count !== maxCount) {
        mesh.count = maxCount
      }
      animationCompleteRef.current = true
    }
  })

  if (maxCount === 0) {
    return null
  }

  return <instancedMesh ref={meshRef} args={[arrowGeometry, material, maxCount]} />
}
