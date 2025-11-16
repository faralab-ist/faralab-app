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
  creativeMode,
  rotation,
  isHovered,
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

    // Prefer quaternion if available (most accurate)
    if (quaternion && quaternion.length === 4) {
      const q = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      groupRef.current.quaternion.copy(q)

      // keep direction in sync with quaternion: local Z is our "forward"
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
        const [dx = 0, dy = 0, dz = 0] = direction || []
        const eps = 1e-6
        if (Math.abs(dx - dirWorld.x) > eps || Math.abs(dy - dirWorld.y) > eps || Math.abs(dz - dirWorld.z) > eps) {
          updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
        }
      }
      return
    }

    // If rotation Euler (radians) is provided, apply it (XYZ) and keep direction in sync
    if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      groupRef.current.rotation.copy(e)
      // compute resulting forward direction (local Z) and update object if changed
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyEuler(e).normalize()
        const [dx = 0, dy = 0, dz = 0] = direction || []
        const eps = 1e-6
        if (Math.abs(dx - dirWorld.x) > eps || Math.abs(dy - dirWorld.y) > eps || Math.abs(dz - dirWorld.z) > eps) {
          updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
        }
      }
      return
    }

    // Fallback to direction vector -> quaternion using local Z as base
    if (direction) {
      const dir = new THREE.Vector3(direction[0], direction[1], direction[2])
      if (dir.lengthSq() === 0) return
      dir.normalize()
      const from = new THREE.Vector3(0, 0, 1) // use Z as cylinder "neutral" axis
      const q = new THREE.Quaternion().setFromUnitVectors(from, dir)
      groupRef.current.quaternion.copy(q)
    }
  }, [direction, quaternion, rotation, updateDirection, id])

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
        // Cylinder "neutral" axis is Z for our UX: rotate local Z by the gizmo quaternion
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
        updateDirection(id, [dir.x, dir.y, dir.z])
        // Save full quaternion and Euler rotation (radians) so UI rotation fields stay in sync
        const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
        updateObject?.(id, {
          quaternion: [q.x, q.y, q.z, q.w],
          rotation: [e.x, e.y, e.z]
        })
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
            direction,
          }}
          position={[0, 0, 0]}
          // rotate mesh so its native Y-axis (three.js cylinder) aligns with local Z used by group
          rotation={[Math.PI / 2, 0, 0]}
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            e.stopPropagation()
            setSelectedId(id)
          }}
        >
          <cylinderGeometry args={[radius, radius, trueHeight, 16]} />
          <meshStandardMaterial color={isSelected || isHovered ? 'lightblue' : 'red'} />
        </mesh>
      </group>
    </PivotControls>
  )
}

export default Wire