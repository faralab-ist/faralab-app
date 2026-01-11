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
  waveDuration = 1.0,
  isDragging = false
}) {
  // Refs need to be declared early to use in useMemo
  const wasDraggingRef = useRef(false)
  const frozenVectorsRef = useRef(null)
  const oldVectorsAttrsRef = useRef(null) // Store old field to show during propagation
  const previousVectorsRef = useRef(null) // Store previous vectors for any full rebuild
  const lastRenderedVectorsRef = useRef(null) // Track last vectors that were actually rendered

  /* -----------------------------
   * 1) Campo no grid
   * ----------------------------- */
  const vectorsUnfiltered = useMemo(
    () => {
      const vecs = getFieldVector3(objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter)
      
      // If no objects and no vectors, create zero-field placeholder vectors
      if (vecs.length === 0 && objects.length === 0) {
        const placeholderVecs = []
        // Create a small grid of zero vectors as placeholders
        const size = 3
        const spacing = 2
        for (let x = -size; x <= size; x++) {
          for (let y = -size; y <= size; y++) {
            for (let z = -size; z <= size; z++) {
              placeholderVecs.push({
                position: new THREE.Vector3(x * spacing, y * spacing, z * spacing),
                field: new THREE.Vector3(0, 0, 0)
              })
            }
          }
        }
        return placeholderVecs
      }
      
      return vecs
    },
    [objects, fieldVersion, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter]
  )

  const vectors = useMemo(
    () => vectorsUnfiltered.filter(({ position }) =>
      sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)
    ),
    [vectorsUnfiltered, slicePlane, slicePos, useSlice, slicePlaneFlip]
  )

  // Freeze vectors during drag - use frozen version if dragging
  const effectiveVectors = useMemo(() => {
    if (isDragging) {
      // First time dragging starts, freeze current vectors
      if (!wasDraggingRef.current) {
        frozenVectorsRef.current = vectors
      }
      return frozenVectorsRef.current || vectors
    }
    // Not dragging - return current vectors but DON'T clear frozen yet
    // (effect will clear it after using old data)
    return vectors
  }, [vectors, isDragging])

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

    const sources = (objects || []).map(o => ({
      type: o?.type,
      pos: new THREE.Vector3(...(o.position || [0, 0, 0])),
      dir: o?.direction ? new THREE.Vector3(...o.direction).normalize() : null
    }))

    // Build list with distances and filter by threshold
    const filtered = []
    let maxDist = 0
    let fallbackMaxDist = 0
    for (const { position, field } of unique) {
      const mag = field.length()
      if (mag <= fieldThreshold) continue

      let minD = Infinity
      for (const s of sources) {
        if (!s) continue
        switch (s.type) {
          case 'plane': {
            const n = s.dir && s.dir.lengthSq() > 0 ? s.dir : new THREE.Vector3(0, 1, 0)
            const rel = position.clone().sub(s.pos)
            // Planar propagation: use perpendicular distance to the plane (wavefronts are planes)
            const d = Math.abs(rel.dot(n))
            if (d < minD) minD = d
            break
          }
          case 'wire': {
            const dir = s.dir && s.dir.lengthSq() > 0 ? s.dir : new THREE.Vector3(0, 0, 1)
            const rel = position.clone().sub(s.pos)
            const cross = rel.clone().cross(dir)
            const d = cross.length()
            if (d < minD) minD = d
            break
          }
          default: {
            const d = position.distanceTo(s.pos)
            if (d < minD) minD = d
          }
        }
      }
      const fallbackDist = position.length()
      if (!isFinite(minD)) minD = fallbackDist
      if (minD > maxDist) maxDist = minD
      if (fallbackDist > fallbackMaxDist) fallbackMaxDist = fallbackDist

      filtered.push({ position, field, dist: minD, fallbackDist, mag })
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
    const useFallback = maxDist < 1e-4
    const normMax = useFallback ? Math.max(fallbackMaxDist, 1) : Math.max(maxDist, 1)

    let ringStartDist = filtered[0] ? (useFallback ? filtered[0].fallbackDist : filtered[0].dist) : 0

    let i = 0
    for (const { position, field, dist, fallbackDist, mag } of filtered) {
      const logMag = Math.log1p(mag)
      const t = logMax > 0 ? Math.min(logMag / logMax, 1) : 0

      const color = new THREE.Color(1.0, 0.6 * (1 - t), 0.0)
      const dir = field.clone().normalize()

      positions.set([position.x, position.y, position.z], i * 3)
      directions.set([dir.x, dir.y, dir.z], i * 3)
      scales[i] = Math.min(Math.max(1 - Math.exp(-logMag), 0), 1)
      colors.set([color.r, color.g, color.b], i * 3)
      // Delay driven by physical distance; fallback if maxDist collapsed (e.g., all points coplanar)
      const distForDelay = useFallback ? fallbackDist : dist
      const normDelay = distForDelay / normMax
      delays[i] = normDelay

      if (Math.abs(distForDelay - ringStartDist) > ringSize) {
        ringBoundaries.push(i)
        ringStartDist = distForDelay
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
  const forceFullRestartRef = useRef(false) // Force full restart on next update
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

    // First, check if signature will change (new object added/removed)
    const attrs = createInstancedAttributes(effectiveVectors)
    const prevSig = lastSignatureRef.current
    const signatureChanged = attrs.signature !== prevSig
    
    // If signature changed and we have last rendered vectors, save them as OLD VECTORS for transition
    // Only if we had vectors before (not first render)
    if (signatureChanged && lastRenderedVectorsRef.current && lastRenderedVectorsRef.current.length > 0 && enablePropagation && !isDragging) {
      // Freeze the last rendered field (same as drag freeze logic)
      frozenVectorsRef.current = lastRenderedVectorsRef.current
      previousVectorsRef.current = lastRenderedVectorsRef.current

      // Save the attributes for the old vectors so we can display them during propagation
      const oldAttrs = createInstancedAttributes(lastRenderedVectorsRef.current)
      oldVectorsAttrsRef.current = oldAttrs

      // Force a full restart so uProgress starts at 0 and we reveal rings
      forceFullRestartRef.current = true

      console.log('[FieldArrows] Signature changed - saved', oldAttrs.count, 'old vectors for transition (freeze on add)')
    }
    
    // If this is the first render (no previous signature), treat as full rebuild
    const isFirstRender = prevSig === 0 && attrs.signature !== 0
    
    // Update last rendered vectors at the END of this effect
    // (after we've used the previous ones)

    // Detect when drag ends (drop)
    const justDropped = wasDraggingRef.current && !isDragging
    if (justDropped) {
      forceFullRestartRef.current = true
      console.log('[FieldArrows] Charge dropped - will force full restart')
    }
    wasDraggingRef.current = isDragging

    // Freeze field updates while dragging
    if (isDragging) {
      return
    }

    // attrs already calculated above
    const maxCount = attrs.count || 0
    const previousCount = lastAttrsCountRef.current
    const previousVersion = lastFieldVersionRef.current
    const previousChangeType = lastChangeTypeRef.current
    const previousSignature = lastSignatureRef.current
    // signatureChanged already calculated above
    const forceRestart = forceFullRestartRef.current
    const shouldRestartWave = enablePropagation && (
      forceRestart ||
      fieldVersion !== previousVersion ||
      maxCount !== previousCount ||
      fieldChangeType !== previousChangeType ||
      signatureChanged
    )

    if (maxCount === 0) {
      mesh.count = 0
      lastRenderedVectorsRef.current = effectiveVectors
      return
    }

    const mustRebuild = forceRestart || fieldChangeType === 'full' || !mesh.geometry || signatureChanged || isFirstRender

    // Use precomputed ring boundaries (already sorted by distance)
    distanceRingsRef.current = attrs.ringBoundaries || []

    if (mustRebuild) {
      let finalAttrs = attrs
      
      // Determine which old attributes to use - use the pre-saved attributes
      const oldAttrs = forceRestart 
        ? (frozenVectorsRef.current?.length > 0 ? createInstancedAttributes(frozenVectorsRef.current) : oldVectorsAttrsRef.current)
        : oldVectorsAttrsRef.current
      
      const shouldCombine = oldAttrs && oldAttrs.count > 0 && enablePropagation
      
      // Combine old vectors with new ones for smooth transition
      if (shouldCombine) {
        const source = forceRestart ? 'frozen (drop)' : 'previous (add object)'
        const oldCount = oldAttrs.count
        console.log('[FieldArrows] Creating old field from', source, '- count:', oldCount)
        
        if (oldCount > 0) {
          console.log('[FieldArrows] Combining vectors:', { oldCount, newCount: maxCount, total: oldCount + maxCount })
          
          // Combine old and new
          const totalCount = oldCount + maxCount
          const combinedPos = new Float32Array(totalCount * 3)
          const combinedDir = new Float32Array(totalCount * 3)
          const combinedScale = new Float32Array(totalCount)
          const combinedColor = new Float32Array(totalCount * 3)
          const combinedDelay = new Float32Array(totalCount)
          
          // Old vectors: delay = -1 (always visible)
          for (let i = 0; i < oldCount; i++) {
            combinedPos[i * 3] = oldAttrs.positions[i * 3]
            combinedPos[i * 3 + 1] = oldAttrs.positions[i * 3 + 1]
            combinedPos[i * 3 + 2] = oldAttrs.positions[i * 3 + 2]
            combinedDir[i * 3] = oldAttrs.directions[i * 3]
            combinedDir[i * 3 + 1] = oldAttrs.directions[i * 3 + 1]
            combinedDir[i * 3 + 2] = oldAttrs.directions[i * 3 + 2]
            combinedScale[i] = oldAttrs.scales[i]
            combinedColor[i * 3] = oldAttrs.colors[i * 3]
            combinedColor[i * 3 + 1] = oldAttrs.colors[i * 3 + 1]
            combinedColor[i * 3 + 2] = oldAttrs.colors[i * 3 + 2]
            combinedDelay[i] = -1 // Always visible
          }
          
          // New vectors: normal delays (propagate)
          for (let i = 0; i < maxCount; i++) {
            const offset = oldCount + i
            combinedPos[offset * 3] = attrs.positions[i * 3]
            combinedPos[offset * 3 + 1] = attrs.positions[i * 3 + 1]
            combinedPos[offset * 3 + 2] = attrs.positions[i * 3 + 2]
            combinedDir[offset * 3] = attrs.directions[i * 3]
            combinedDir[offset * 3 + 1] = attrs.directions[i * 3 + 1]
            combinedDir[offset * 3 + 2] = attrs.directions[i * 3 + 2]
            combinedScale[offset] = attrs.scales[i]
            combinedColor[offset * 3] = attrs.colors[i * 3]
            combinedColor[offset * 3 + 1] = attrs.colors[i * 3 + 1]
            combinedColor[offset * 3 + 2] = attrs.colors[i * 3 + 2]
            combinedDelay[offset] = attrs.delays[i]
          }
          
          // Log sample delays to verify
          console.log('[FieldArrows] Sample delays:', {
            old: [combinedDelay[0], combinedDelay[Math.floor(oldCount/2)]],
            new: [combinedDelay[oldCount], combinedDelay[oldCount + Math.floor(maxCount/2)], combinedDelay[totalCount - 1]]
          })
          
          finalAttrs = {
            positions: combinedPos,
            directions: combinedDir,
            scales: combinedScale,
            colors: combinedColor,
            delays: combinedDelay,
            count: totalCount
          }
          
          // Store info for cleanup - save oldCount separately
          oldVectorsAttrsRef.current = { ...oldVectorsAttrsRef.current, oldCount }
        }
        
        // DON'T clear the oldVectorsAttrsRef yet - we need it for cleanup after propagation
        // Clear the vectors we just used
        if (forceRestart) {
          frozenVectorsRef.current = null
        }
        // Keep previousVectorsRef for now, will be cleared after propagation completes
      }
      
      const geom = arrowGeometry.clone()
      geom.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(finalAttrs.positions, 3))
      geom.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(finalAttrs.directions, 3))
      geom.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(finalAttrs.scales, 1))
      geom.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(finalAttrs.colors, 3))
      geom.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(finalAttrs.delays, 1))
      mesh.geometry = geom
      mesh.frustumCulled = false
      
      setInstanceCount(mesh, finalAttrs.count)
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

    // For non-rebuild paths, set instance count
    if (!mustRebuild) {
      setInstanceCount(mesh, maxCount)
    }

    const u = getProgressUniform()
    if (!u) return

    lastFieldVersionRef.current = fieldVersion
    lastAttrsCountRef.current = maxCount
    lastChangeTypeRef.current = fieldChangeType
    lastSignatureRef.current = attrs.signature

    const isFullRebuild = mustRebuild || forceRestart || fieldChangeType === 'full'
    currentChangeTypeRef.current = isFullRebuild ? 'full' : 'incremental'
    
    // Clear force restart flag after using it
    if (forceRestart) {
      forceFullRestartRef.current = false
    }

    if (!enablePropagation) {
      u.value = 1
      animationCompleteRef.current = true
      newFieldDataRef.current = null
      return
    }

    if (shouldRestartWave) {
      const now = Date.now()
      startTimeRef.current = now
      animationCompleteRef.current = false
      lastLoggedProgressRef.current = -1

      if (isFullRebuild) {
        // Hide everything, let the shader reveal rings by delay/uProgress
        u.value = 0
        console.log('[FieldArrows] Propagation wave started (full)', { 
          maxCount, 
          waveDuration, 
          startTime: now, 
          forceRestart,
          signatureChanged,
          previousVectorsStored: !!previousVectorsRef.current,
          frozenVectorsStored: !!frozenVectorsRef.current
        })
      } else {
        // Keep arrows visible while attributes morph forward along the wave
        u.value = 1
        console.log('[FieldArrows] Propagation wave started (incremental)', { maxCount, waveDuration })
      }
    }
    
    // Store current effective vectors as last rendered (for next change)
    lastRenderedVectorsRef.current = effectiveVectors
  }, [fieldVersion, fieldChangeType, effectiveVectors, objects, createInstancedAttributes, arrowGeometry, step, setInstanceCount, isDragging, enablePropagation, getProgressUniform, waveDuration])

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

    // Freeze animation while dragging
    if (isDragging) {
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
          
          // Skip old vectors (delay = -1, they should stay frozen)
          if (delay < 0) continue
          
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
      
      // Remove old vectors if they were present
      if (oldVectorsAttrsRef.current && oldVectorsAttrsRef.current.oldCount > 0 && mode === 'full') {
        const oldCount = oldVectorsAttrsRef.current.oldCount
        console.log('[FieldArrows] Propagation complete - removing', oldCount, 'old vectors')
        
        // Rebuild geometry with only new vectors
        const g = mesh.geometry
        const currentCount = g.attributes.instancePosition?.count || 0
        const newCount = currentCount - oldCount
        
        if (newCount > 0) {
          const oldPos = g.attributes.instancePosition.array
          const oldDir = g.attributes.instanceDirection.array
          const oldScale = g.attributes.instanceScale.array
          const oldColor = g.attributes.instanceColor.array
          const oldDelay = g.attributes.instanceDelay.array

          // Extract only the new vectors (after oldCount)
          const newPos = new Float32Array(newCount * 3)
          const newDir = new Float32Array(newCount * 3)
          const newScale = new Float32Array(newCount)
          const newColor = new Float32Array(newCount * 3)
          const newDelay = new Float32Array(newCount)
          
          for (let i = 0; i < newCount; i++) {
            const srcIdx = oldCount + i
            newPos[i * 3] = oldPos[srcIdx * 3]
            newPos[i * 3 + 1] = oldPos[srcIdx * 3 + 1]
            newPos[i * 3 + 2] = oldPos[srcIdx * 3 + 2]
            newDir[i * 3] = oldDir[srcIdx * 3]
            newDir[i * 3 + 1] = oldDir[srcIdx * 3 + 1]
            newDir[i * 3 + 2] = oldDir[srcIdx * 3 + 2]
            newScale[i] = oldScale[srcIdx]
            newColor[i * 3] = oldColor[srcIdx * 3]
            newColor[i * 3 + 1] = oldColor[srcIdx * 3 + 1]
            newColor[i * 3 + 2] = oldColor[srcIdx * 3 + 2]
            newDelay[i] = oldDelay[srcIdx]
          }

          // Rebuild attributes to avoid WebGL resize errors
          g.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(newPos, 3))
          g.setAttribute('instanceDirection', new THREE.InstancedBufferAttribute(newDir, 3))
          g.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(newScale, 1))
          g.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(newColor, 3))
          g.setAttribute('instanceDelay', new THREE.InstancedBufferAttribute(newDelay, 1))

          setInstanceCount(mesh, newCount)
        }
        
        // Clear old vectors ref and previous vectors ref
        oldVectorsAttrsRef.current = null
        previousVectorsRef.current = null
      }
    }
  })

  return <instancedMesh ref={meshRef} args={[arrowGeometry, material, effectiveVectors.length || 1]} />
}