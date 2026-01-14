import React, { useRef, useLayoutEffect, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'

export default function BaseCharge({
  id,
  position,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  creativeMode,
  // Visual props
  baseColor,      // THREE.Color for the glow tint
  glowString,     // String for canvas gradient (e.g., 'rgba(255,0,0,')
  visualScale,    // Number: size of the glow
  visualOpacity,  // Number: opacity of the glow
  hitboxRadius,   // Number: size of the selection area
  type = 'charge', // userData type identifier
  radius = 0.06,       // visual radius of the center dot
  isHovered
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)
  const glowRef = useRef()

  // Apply static glow settings
  useLayoutEffect(() => {
    if (!glowRef.current) return
    glowRef.current.scale.setScalar(visualScale)
    if (glowRef.current.material) {
      glowRef.current.material.opacity = visualOpacity
      glowRef.current.material.color.set(baseColor)
    }
  }, [visualScale, visualOpacity, baseColor])

  // Sync PivotControls matrix
  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(position[0], position[1], position[2])
    const mat = new THREE.Matrix4().setPosition(pos)
    if (pivotRef.current.matrix) {
      pivotRef.current.matrix.copy(mat)
    }
  }, [position])

  // Generate Texture
  const spriteTexture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const cx = size / 2
    const cy = size / 2
    const r = size / 2
    
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0.0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.06, `${glowString}0.95)`)
    grad.addColorStop(0.18, `${glowString}0.75)`)
    grad.addColorStop(0.45, `${glowString}0.22)`)
    grad.addColorStop(1.0, 'rgba(0,0,0,0)')
    
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }, [glowString])

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected}
      disableScaling
      disableRotations
      onDragStart={(axes) => {
        isDraggingRef.current = true
        setIsDragging?.(true)
        handleAxisDragStart(axes, position)
      }}
      onDrag={(matrix) => {
        const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition?.(id, [pWorld.x, pWorld.y, pWorld.z])
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging?.(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      <group ref={groupRef}>
        {/* Glow Sprite */}
        <sprite ref={glowRef} position={[0, 0, 0]}> 
          <spriteMaterial
            attach="material"
            map={spriteTexture}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>

        {/* Center Dot */}
        <mesh position={[0, 0, 0]} renderOrder={999}>
          <sphereGeometry args={[radius]} />
          <meshBasicMaterial color={0xffffff} toneMapped={false} depthWrite={false} />
        </mesh>

        {/* Hitbox */}
        <mesh
          position={[0, 0, 0]}
          userData={{ id, type }}
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            e.stopPropagation()
            setSelectedId?.(id)
          }}
        >
          <sphereGeometry args={[hitboxRadius]} />
          <meshBasicMaterial transparent={true} opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </PivotControls>
  )
}