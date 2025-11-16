import React, { useRef, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
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
    const glowColor = sign >= 0 ? new THREE.Color(0x6ea8ff) : new THREE.Color(0xff6e6e)
    const magnitude = Math.min(4, Math.max(0.2, Math.abs(charge)))
    const baseGlowScale = 1 + magnitude * 0.6
    const glowIntensity = 0.6 + Math.min(2.0, Math.abs(charge) * 0.15)
    return { glowColor, baseGlowScale, glowIntensity }
  }, [charge])

  // pulse the glow with a small animation based on time and magnitude
  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const t = clock.getElapsedTime()
    const pulse = 1 + 0.08 * Math.sin(t * 3 + (id?.charCodeAt?.(0) || 0)) * Math.min(2, Math.abs(charge))
    glowRef.current.scale.setScalar(baseGlowScale * pulse)
    if (glowRef.current.material) {
      glowRef.current.material.emissive = glowColor
      glowRef.current.material.emissiveIntensity = glowIntensity * pulse
      glowRef.current.material.opacity = Math.min(0.55, 0.18 + Math.abs(charge) * 0.08)
    }
  })

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
              const c = charge >= 0 ? 'rgba(110,168,255,' : 'rgba(255,110,110,'
              const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
              grad.addColorStop(0, `${c}0.95)`)
              grad.addColorStop(0.25, `${c}0.55)`)
              grad.addColorStop(0.5, `${c}0.28)`)
              grad.addColorStop(0.85, `${c}0.06)`)
              grad.addColorStop(1, 'rgba(0,0,0,0)')
              ctx.fillStyle = grad
              ctx.fillRect(0, 0, size, size)
              const tex = new THREE.CanvasTexture(canvas)
              tex.needsUpdate = true
              return tex
            }, [charge])}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.45}
            toneMapped={false}
          />
        </sprite>

        <mesh
          position={[0, 0, 0]}
          userData={{ id, type: 'charge' }}
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            e.stopPropagation()
            setSelectedId(id)
          }}
        >
          <sphereGeometry args={[radius]} />
          <meshStandardMaterial color={isSelected ? 'lightblue' : (charge >= 0 ? '#8ec6ff' : '#ffb2b2')} />
        </mesh>
      </group>
    </PivotControls>
  )
}

export default Charge


