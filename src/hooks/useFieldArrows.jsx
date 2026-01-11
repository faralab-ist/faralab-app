import * as THREE from 'three'
import React, { useMemo, useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import vertexShaderSource from '../shaders/arrowVertex.glsl'
import fragmentShaderSource from '../shaders/arrowFragment.glsl'
import getFieldVector3 from '../utils/getFieldVectors.js'

function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip) {
  if (!useSlice) return true
  switch (slicePlane) {
    case 'xy': return slicePlaneFlip ? point.z <= slicePos : point.z > slicePos
    case 'yz': return slicePlaneFlip ? point.x <= slicePos : point.x > slicePos
    case 'xz': return slicePlaneFlip ? point.y <= slicePos : point.y > slicePos
    default: return true
  }
}

export default function FieldArrows({
  objects,
  fieldVersion = 0,
  fieldChangeType = 'incremental',
  showOnlyGaussianField = false,
  fieldThreshold = 0.1,
  gridSize = 10,
  step = 1,
  minThreshold,
  scaleMultiplier = 1,
  planeFilter = null,
  slicePlane,
  slicePos,
  useSlice,
  slicePlaneFlip,
  enablePropagation = true,
  waveDuration = 1.0
}) {
  /* -----------------------------
   * 1) Campo no grid
   * ----------------------------- */
  const vectorsUnfiltered = useMemo(
    () => getFieldVector3(objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter),
    [objects, fieldVersion, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter]
  )

  const vectors = useMemo(
    () => vectorsUnfiltered.filter(({ position }) =>
      sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)
    ),
    [vectorsUnfiltered, slicePlane, slicePos, useSlice, slicePlaneFlip]
  )

  /* -----------------------------
   * 2) Magnitude máx (cores)
   * ----------------------------- */
  const MAX_L = useMemo(() => {
    let maxL = 0
    for (const { field } of vectors) {
      const m = field.length()
      if (m > maxL) maxL = m
    }
    return maxL
  }, [vectors])
  const logMax = MAX_L > 0 ? Math.log1p(MAX_L) : 1

  /* -----------------------------
   * 3) Geometria base
   * ----------------------------- */
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

  /* -----------------------------
   * 4) Agregação e atributos
   * ----------------------------- */
  const createInstancedAttributes = useCallback((vectorList) => {
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

    const centers = (objects || []).map(o => new THREE.Vector3(...(o.position || [0, 0, 0])))

    // Build list with distances and filter by threshold
    const filtered = []
    let maxDist = 0
    for (const { position, field } of unique) {
      const mag = field.length()
      if (mag <= fieldThreshold) continue

      let minD = Infinity
      for (const c of centers) {
        const d = position.distanceTo(c)
        if (d < minD) minD = d
      }
      if (!isFinite(minD)) minD = position.length()
      if (minD > maxDist) maxDist = minD

      filtered.push({ position, field, dist: minD, mag })
    }

    // Sort by distance so mesh.count reveals nearer arrows first
    filtered.sort((a, b) => a.dist - b.dist)

    const positions = new Float32Array(filtered.length * 3)
    const directions = new Float32Array(filtered.length * 3)
    const scales = new Float32Array(filtered.length)
    const colors = new Float32Array(filtered.length * 3)
    const delays = new Float32Array(filtered.length)
    const maxDistSafe = maxDist > 0 ? maxDist : 1

    // Build ring boundaries (cumulative counts) based on distance bands
    const ringSize = step * 0.8
    const ringBoundaries = []
    let ringStartDist = filtered[0]?.dist ?? 0

    let i = 0
    for (const { position, field, dist, mag } of filtered) {
      const logMag = Math.log1p(mag)
      const t = logMax > 0 ? Math.min(logMag / logMax, 1) : 0

      const color = new THREE.Color(1.0, 0.6 * (1 - t), 0.0)
      const dir = field.clone().normalize()

      positions.set([position.x, position.y, position.z], i * 3)
      directions.set([dir.x, dir.y, dir.z], i * 3)
      scales[i] = Math.min(Math.max(1 - Math.exp(-logMag), 0), 1)
      colors.set([color.r, color.g, color.b], i * 3)
      // Delay driven by physical distance so waves expand radially
      delays[i] = dist / maxDistSafe

      if (Math.abs(dist - ringStartDist) > ringSize) {
        ringBoundaries.push(i)
        ringStartDist = dist
      }

      i++
    }
    // Always push the final boundary (full count)
    ringBoundaries.push(i)

    // Lightweight signature to detect meaningful field changes without full diff
    let sig = 0
    const stepSig = Math.max(1, Math.floor(positions.length / 32))
    for (let k = 0; k < positions.length; k += stepSig) {
      sig = Math.imul(sig, 31) + Math.fround(positions[k] * 1000)
    }
    sig = Math.imul(sig, 31) ^ i

    return { positions, directions, scales, colors, delays, count: i, ringBoundaries, signature: sig }
  }, [objects, fieldThreshold, logMax, step])

  /* -----------------------------
   * 5) Shader material
   * ----------------------------- */
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    vertexColors: true,
    transparent: true,
    uniforms: {
      uProgress: { value: 0 }
    }
  }), [])

  // Safe accessor for progress uniform
  const getProgressUniform = useCallback(() => material?.uniforms?.uProgress, [material])

  const meshRef = useRef()
  const startTimeRef = useRef(0)
  const animationCompleteRef = useRef(false)
  const currentChangeTypeRef = useRef('full') // Track whether current wave is full or incremental
  const distanceRingsRef = useRef([])
  const lastLoggedProgressRef = useRef(-1)
  const lastFieldVersionRef = useRef(-1)
  const lastAttrsCountRef = useRef(0)
  const lastChangeTypeRef = useRef(fieldChangeType)
  const lastSignatureRef = useRef(0)
  const newFieldDataRef = useRef(null)  // Store new field data for incremental updates
  const isDebug = useCallback(() => (typeof window !== 'undefined' && window.__FIELD_DEBUG__) || false, [])

  const setInstanceCount = useCallback((mesh, value) => {
    mesh.count = value
    if (mesh.instanceCount !== undefined) mesh.instanceCount = value
    if (mesh.instanceMatrix) mesh.instanceMatrix.needsUpdate = true
  }, [])

  /* -----------------------------
   * 6) Build / Update
   * ----------------------------- */
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const attrs = createInstancedAttributes(vectors)
    const maxCount = attrs.count || 0
    const previousCount = lastAttrsCountRef.current
    const previousVersion = lastFieldVersionRef.current
    const previousChangeType = lastChangeTypeRef.current
    const previousSignature = lastSignatureRef.current
    const signatureChanged = attrs.signature !== previousSignature
    const shouldRestartWave = enablePropagation && (
      fieldVersion !== previousVersion ||
      maxCount !== previousCount ||
      fieldChangeType !== previousChangeType ||
      signatureChanged
    )

    if (maxCount === 0) {
      mesh.count = 0
      return
    }

    const mustRebuild = fieldChangeType === 'full' || !mesh.geometry

    // Use precomputed ring boundaries (already sorted by distance)
    distanceRingsRef.current = attrs.ringBoundaries || []

    if (mustRebuild) {
      const geom = arrowGeometry.clone()
      geom.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(attrs.positions, 3))
      geom.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(attrs.directions, 3))
      geom.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(attrs.scales, 1))
      geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(attrs.colors, 3))
      geom.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(attrs.delays, 1))
      mesh.geometry = geom
      mesh.frustumCulled = false
    } else {
      // incremental: check if count changed (threshold filtering may add/remove instances)
      const g = mesh.geometry
      const currentCount = g.attributes.instancePosition?.count || 0
      
      if (currentCount !== maxCount) {
        // Count changed - rebuild geometry but keep previous vectors visible
        const prevGeom = mesh.geometry
        const prevPos = prevGeom?.attributes?.instancePosition?.array
        const prevDir = prevGeom?.attributes?.instanceDirection?.array
        const prevScale = prevGeom?.attributes?.instanceScale?.array
        const prevColor = prevGeom?.attributes?.instanceColor?.array
        const prevCount = prevGeom?.attributes?.instancePosition?.count || 0

        const geom = arrowGeometry.clone()

        // Start with empty buffers sized to new count
        const posAttr = new THREE.InstancedBufferAttribute(new Float32Array(attrs.positions.length), 3)
        const dirAttr = new THREE.InstancedBufferAttribute(new Float32Array(attrs.directions.length), 3)
        const scaleAttr = new THREE.InstancedBufferAttribute(new Float32Array(attrs.scales.length), 1)
        const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(attrs.colors.length), 3)
        const delayAttr = new THREE.InstancedBufferAttribute(attrs.delays, 1)

        // For incremental changes, seed with previous values wherever possible to avoid instant pops
        if (enablePropagation && fieldChangeType !== 'full' && prevPos && prevDir && prevScale && prevColor) {
          const overlap = Math.min(prevCount, maxCount)
          for (let i = 0; i < overlap; i++) {
            posAttr.array[i * 3] = prevPos[i * 3]
            posAttr.array[i * 3 + 1] = prevPos[i * 3 + 1]
            posAttr.array[i * 3 + 2] = prevPos[i * 3 + 2]

            dirAttr.array[i * 3] = prevDir[i * 3]
            dirAttr.array[i * 3 + 1] = prevDir[i * 3 + 1]
            dirAttr.array[i * 3 + 2] = prevDir[i * 3 + 2]

            scaleAttr.array[i] = prevScale[i]

            colorAttr.array[i * 3] = prevColor[i * 3]
            colorAttr.array[i * 3 + 1] = prevColor[i * 3 + 1]
            colorAttr.array[i * 3 + 2] = prevColor[i * 3 + 2]
          }
          // Any new indices (beyond previous count) remain zeroed until wave updates them
        } else {
          // Full rebuild or no previous data: start with the new target data immediately
          posAttr.array.set(attrs.positions)
          dirAttr.array.set(attrs.directions)
          scaleAttr.array.set(attrs.scales)
          colorAttr.array.set(attrs.colors)
        }

        geom.setAttribute('instancePosition', posAttr)
        geom.setAttribute('instanceDirection', dirAttr)
        geom.setAttribute('instanceScale', scaleAttr)
        geom.setAttribute('instanceColor', colorAttr)
        geom.setAttribute('instanceDelay', delayAttr)
        mesh.geometry = geom
        mesh.frustumCulled = false

        // Store new data so useFrame can progressively update to the target field
        newFieldDataRef.current = {
          positions: attrs.positions,
          directions: attrs.directions,
          scales: attrs.scales,
          colors: attrs.colors,
          delays: attrs.delays
        }
      } else {
        // Same count - store new data for progressive update in useFrame
        const delayAttr = mesh.geometry?.attributes?.instanceDelay
        if (delayAttr && attrs.delays) {
          delayAttr.array.set(attrs.delays)
          delayAttr.needsUpdate = true
        }

        newFieldDataRef.current = {
          positions: attrs.positions,
          directions: attrs.directions,
          scales: attrs.scales,
          colors: attrs.colors,
          delays: attrs.delays
        }
      }
    }

    // Reset animation state for propagation
    // Always keep instanced capacity at maxCount; shader uniform controls visibility
    setInstanceCount(mesh, maxCount)

    const u = getProgressUniform()
    if (!u) return

    lastFieldVersionRef.current = fieldVersion
    lastAttrsCountRef.current = maxCount
    lastChangeTypeRef.current = fieldChangeType
    lastSignatureRef.current = attrs.signature

    const isFullRebuild = fieldChangeType === 'full'
    currentChangeTypeRef.current = isFullRebuild ? 'full' : 'incremental'

    if (!enablePropagation) {
      u.value = 1
      animationCompleteRef.current = true
      newFieldDataRef.current = null
      return
    }

    if (shouldRestartWave) {
      startTimeRef.current = Date.now()
      animationCompleteRef.current = false
      lastLoggedProgressRef.current = -1

      if (isFullRebuild) {
        // Hide everything, let the shader reveal rings by delay/uProgress
        u.value = 0
        console.log('[FieldArrows] Propagation wave started (full)', { maxCount, waveDuration })
      } else {
        // Keep arrows visible while attributes morph forward along the wave
        u.value = 1
        console.log('[FieldArrows] Propagation wave started (incremental)', { maxCount, waveDuration })
      }
    }
  }, [fieldVersion, fieldChangeType, vectors, objects, createInstancedAttributes, arrowGeometry, step, setInstanceCount])

  /* -----------------------------
   * 7) Propagation
   * ----------------------------- */
  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh || !mesh.geometry || !mesh.geometry.attributes.instancePosition) return

    const u = getProgressUniform()
    if (!u) {
      console.warn('[FieldArrows] missing uProgress uniform')
      return
    }

    const mode = currentChangeTypeRef.current

    // If propagation is disabled, show all arrows immediately
    if (!enablePropagation) {
      if (u.value !== 1) {
        u.value = 1
        animationCompleteRef.current = true
      }
      return
    }

    // If animation is complete, ensure full and exit
    if (animationCompleteRef.current) {
      if (u.value !== 1) u.value = 1
      return
    }

    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const animDuration = Math.max(waveDuration, 0.05)
    const progress = Math.min(elapsed / animDuration, 1)

    // For incremental updates, keep uProgress at 1 so vectors never hide; use progress only to drive attribute updates
    if (mode === 'incremental') {
      if (u.value !== 1) u.value = 1

      if (newFieldDataRef.current) {
        const g = mesh.geometry
        const newData = newFieldDataRef.current

        const posAttr = g.attributes.instancePosition
        const dirAttr = g.attributes.instanceDirection
        const scaleAttr = g.attributes.instanceScale
        const colorAttr = g.attributes.instanceColor
        const delayAttr = g.attributes.instanceDelay

        for (let i = 0; i < delayAttr.count; i++) {
          const delay = delayAttr.array[i]
          if (progress >= delay) {
            posAttr.array[i * 3] = newData.positions[i * 3]
            posAttr.array[i * 3 + 1] = newData.positions[i * 3 + 1]
            posAttr.array[i * 3 + 2] = newData.positions[i * 3 + 2]

            dirAttr.array[i * 3] = newData.directions[i * 3]
            dirAttr.array[i * 3 + 1] = newData.directions[i * 3 + 1]
            dirAttr.array[i * 3 + 2] = newData.directions[i * 3 + 2]

            scaleAttr.array[i] = newData.scales[i]

            colorAttr.array[i * 3] = newData.colors[i * 3]
            colorAttr.array[i * 3 + 1] = newData.colors[i * 3 + 1]
            colorAttr.array[i * 3 + 2] = newData.colors[i * 3 + 2]
          }
        }

        posAttr.needsUpdate = true
        dirAttr.needsUpdate = true
        scaleAttr.needsUpdate = true
        colorAttr.needsUpdate = true
      }

      if (progress >= 1) {
        animationCompleteRef.current = true
        newFieldDataRef.current = null
      }
      return
    }

    // Full rebuild path: use shader uniform to reveal
    if (u.value !== progress) {
      u.value = progress
      // Log every ~0.05 change to avoid excessive spam but still be visible
      const stepBucket = Math.floor(progress / 0.05)
      if (stepBucket !== lastLoggedProgressRef.current) {
        lastLoggedProgressRef.current = stepBucket
        console.log('[FieldArrows] step', {
          elapsed: Number(elapsed.toFixed(3)),
          progress: Number(progress.toFixed(3)),
          animDuration,
          waveDuration,
          count: mesh.geometry?.attributes?.instancePosition?.count
        })
      }
    }
    
    if (progress >= 1) {
      animationCompleteRef.current = true
      newFieldDataRef.current = null  // Clear stored data when complete
    }
  })

  return <instancedMesh ref={meshRef} args={[arrowGeometry, material, vectors.length || 1]} />
}
