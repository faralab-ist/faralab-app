import React, { useRef, useLayoutEffect, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'

function Charge({
  id,
  position,
  charge,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  radius,
  creativeMode
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)
  const glowRef = useRef()

  // compute glow color and base scale from charge
  const { glowColor, baseGlowScale, glowIntensity } = useMemo(() => {
    const sign = charge >= 0 ? 1 : -1
    // positive -> red, negative -> blue (inverted per user request)
    const glowColor = sign >= 0 ? new THREE.Color(0xff6e6e) : new THREE.Color(0x6ea8ff)
    const magnitude = Math.min(4, Math.max(0.2, Math.abs(charge)))
    const baseGlowScale = 1 + magnitude * 0.6
    const glowIntensity = 0.6 + Math.min(2.0, Math.abs(charge) * 0.15)
    return { glowColor, baseGlowScale, glowIntensity }
  }, [charge])

  // apply static glow (no pulsing) — user requested no inner sphere and no pulsing
  useLayoutEffect(() => {
    if (!glowRef.current) return
    // scale tightly around the intended visual radius
    glowRef.current.scale.setScalar(baseGlowScale * Math.max(0.8, radius || 1))
    if (glowRef.current.material) {
      // make the sprite visually very intense in the center (white) and strong overall
      glowRef.current.material.opacity = Math.min(1, 0.65 + Math.abs(charge) * 0.22)
      glowRef.current.material.color.set(glowColor)
    }
  }, [baseGlowScale, glowColor, charge, radius])

  // Sync PivotControls matrix when position changes externally (preset load)
  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    
    const pos = new THREE.Vector3(position[0], position[1], position[2])
    const mat = new THREE.Matrix4().setPosition(pos)
    
    // Update PivotControls internal state
    if (pivotRef.current.matrix) {
      pivotRef.current.matrix.copy(mat)
    }
  }, [position])

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected}   // CHANGED
      disableScaling
      disableRotations
      onDragStart={(axes) => {
        isDraggingRef.current = true
        setIsDragging(true)
        handleAxisDragStart(axes, position)
      }}
      onDrag={(matrix) => {
        const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      <group ref={groupRef}>
        {/* soft billboard glow using a canvas gradient texture (sprite) */}
        <sprite ref={glowRef} position={[0, 0, 0]}> 
          <spriteMaterial
            attach="material"
            map={useMemo(() => {
              const size = 256
              const canvas = document.createElement('canvas')
              canvas.width = size
              canvas.height = size
              const ctx = canvas.getContext('2d')
              const cx = size / 2
              const cy = size / 2
              const r = size / 2
              // make positive charges red and negative charges blue
              const color = charge >= 0 ? 'rgba(255,110,110,' : 'rgba(110,168,255,'
              const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
              // very bright white center, then colored ring, then fade to transparent
              grad.addColorStop(0.0, 'rgba(255,255,255,1)')
              grad.addColorStop(0.06, `${color}0.95)`)
              grad.addColorStop(0.18, `${color}0.75)`)
              grad.addColorStop(0.45, `${color}0.22)`)
              grad.addColorStop(1.0, 'rgba(0,0,0,0)')
              ctx.fillStyle = grad
              ctx.fillRect(0, 0, size, size)
              const tex = new THREE.CanvasTexture(canvas)
              tex.needsUpdate = true
              tex.minFilter = THREE.LinearFilter
              tex.magFilter = THREE.LinearFilter
              return tex
            }, [charge])}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={1.0}
            toneMapped={false}
          />
        </sprite>

        {/* invisible interaction mesh: keeps click/selection but no visible sphere */}
        <mesh
          position={[0, 0, 0]}
          userData={{ id, type: 'charge' }}
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            e.stopPropagation()
            setSelectedId(id)
          }}
        >
          <sphereGeometry args={[Math.max(0.001, radius || 0.2)]} />
          <meshBasicMaterial transparent={true} opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </PivotControls>
  )
}

export default Charge


