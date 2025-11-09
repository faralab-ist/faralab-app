import React, { useRef, useLayoutEffect } from 'react'
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
          <meshStandardMaterial color={isSelected ? 'lightblue' : radius < 1  ? 'orange' : 'yellow'} />
        </mesh>
      </group>
    </PivotControls>
  )
}

export default Charge


