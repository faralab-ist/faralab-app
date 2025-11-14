import React, { useEffect, useRef, useLayoutEffect } from 'react'
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
  updateObject,
  gridDimensions,
  height,
  radius,
  direction = [0, 0, 1], // default along Z axis
  quaternion, // full rotation state
  creativeMode
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)

  //const trueHeight = infinite
  //  ? Math.sqrt(gridDimensions[0] ** 2 + gridDimensions[1] ** 2) + 1
 //   : height
  const trueHeight = infinite ? 20 : height

  // Sync from external state only when NOT dragging
  useEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return
    groupRef.current.position.set(position[0], position[1], position[2])
  }, [position])

  // Initialize direction if not set
  useEffect(() => {
    if (!direction || direction.every(d => d === 0)) {
      // Set default direction along Z axis
      updateDirection?.(id, [0, 0, 1])
    }
  }, []) // Run only once on mount

  // Apply rotation from saved quaternion or direction
  useLayoutEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return
    
    // Prefer quaternion if available (more accurate)
    if (quaternion && quaternion.length === 4) {
      const q = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      groupRef.current.quaternion.copy(q)
    } else if (direction) {
      // Fallback to direction vector
      const dir = new THREE.Vector3(direction[0], direction[1], direction[2])
      if (dir.lengthSq() === 0) return
      dir.normalize()
      const from = new THREE.Vector3(0, 1, 0) // cylinder local axis
      const q = new THREE.Quaternion().setFromUnitVectors(from, dir)
      groupRef.current.quaternion.copy(q)
    }
  }, [direction, quaternion])

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={isSelected && creativeMode}
      disableScaling={true}
      // prevent gizmo from also transforming children
      onDragStart={(activeAxes) => {
        isDraggingRef.current = true;
        setIsDragging(true)
        handleAxisDragStart(activeAxes, position)
      }}
      onDrag={(matrix) => {
        if (!groupRef.current) return
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(p, q, s)


        const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
        // Cylinder points along +Y in local space, rotate that by the gizmo's rotation
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize()
        updateDirection(id, [dir.x, dir.y, dir.z])
        // Also save the full quaternion for complete rotation
        updateObject?.(id, { quaternion: [q.x, q.y, q.z, q.w] })
      }}
      onDragEnd={() => {
        isDraggingRef.current = false;
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
            material,
            direction
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