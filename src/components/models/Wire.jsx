import React, { useRef, useLayoutEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'





function Wire({ 
  id, 
  position, 
  charge_density,
  infinite,
  material,
  selectedId, 
  setSelectedId, 
  setIsDragging,
  updatePosition,
  updateDirection,
  gridDimensions,
  height,
  radius,
  creativeMode
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)

  const trueHeight = infinite ? Math.sqrt(gridDimensions[0]**2 + gridDimensions[1]**2) + 1 : height

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
      enabled={isSelected && creativeMode}
      onDragStart={(activeAxes) => {
        setIsDragging(true)
        handleAxisDragStart(activeAxes, position)
      }}
      onDrag={(matrix) => {
        // Decompose the transform coming from PivotControls
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(p, q, s)


        const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
        // Cylinder points along +Y in local space, rotate that by the gizmo's rotation
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize()
        updateDirection(id, [dir.x, dir.y, dir.z])
      }}
      onDragEnd={() => {
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
       <group ref={groupRef}>
      <mesh
        userData={{ 
          id, 
          type: 'wire',
          charge_density,
          infinite,
          material 
        }}
        position={[0, 0, 0]}
        onPointerDown={(e) => {
          if (e.button !== undefined && e.button !== 0) return
          e.stopPropagation()
          setSelectedId(id)
        }}
      >
        <cylinderGeometry args={[radius, radius, trueHeight, 16]} />
        <meshStandardMaterial color={isSelected ? 'lightblue' : 'red'} />
      </mesh>
      </group>
    </PivotControls>
  )
}

export default Wire