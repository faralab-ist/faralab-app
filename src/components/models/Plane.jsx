import React, { useRef, useLayoutEffect, useEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'


function Plane({ 
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
  dimensions,
  creativeMode            // NEW
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)

  // Use dimensions (width/height) or fallback
  const width  = infinite ? 20 : dimensions[0]
  const height = infinite ? 20 : dimensions[1]

  // Base (static) rotation to lay the plane flat on XZ (normal initially +Y)
  const baseEuler = new THREE.Euler(-Math.PI / 2, 0, 0)
  const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler)
  const localNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(baseQuat) // becomes (0,1,0)

  // Ensure direction is correct when the plane is created (before any dragging)
  useEffect(() => {
    const n = localNormal.clone().normalize() // (0,1,0)
    updateDirection(id, [n.x, n.y, n.z])
  }, [id, updateDirection])

  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(...position)
    const mat = new THREE.Matrix4().setPosition(pos)
    if (pivotRef.current.matrix) pivotRef.current.matrix.copy(mat)
  }, [position])

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected}   // CHANGED
      disableScaling={true}
      onDragStart={(axes) => {
        isDraggingRef.current = true
        setIsDragging(true)
        handleAxisDragStart(axes, position)
      }}
      onDrag={(matrix) => {
        // Decompose pivot/world transform
        const pWorld = new THREE.Vector3()
        const qGroup = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(pWorld, qGroup, s)

        // World normal = group rotation * base (flatten) rotation * local Z axis
        const worldNormal = localNormal.clone().applyQuaternion(qGroup).normalize()
        updateDirection(id, [worldNormal.x, worldNormal.y, worldNormal.z])

        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      <mesh
        ref={meshRef}
        rotation={baseEuler}               // lay plane flat
        userData={{
          id,
          type: 'plane',
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
        <planeGeometry args={[width, height, 10, 6]} />
        <meshStandardMaterial
          color={isSelected ? 'lightblue' : 'lightgreen'}
          side={THREE.DoubleSide}
        />
      </mesh>
    </PivotControls>
  )
}

export default Plane