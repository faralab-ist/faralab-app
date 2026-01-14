import React, { useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../../hooks/useCameraSnapOnSlider'
import Path from '../Path'

import * as THREE from 'three'

export default function BaseCoil({
  id,
  position = [0, 0, 0],
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  updateDirection,
  updateObject,
  creativeMode,
  isHovered,
  name,

  ac = false,

  coilRadius,
  coilColor = '#6ea8ff',
  normalLength = 1.5,
  wireThickness = 0.05,

  direction = [0, 0, 1],
  rotation = [0, 0, 0],
  quaternion,

  // unified API: only current for coils
  current = 1,

  renderCharges = true,
  charges = [],
  isClosedPath = true,

  coilGeometry,
  computeNormal = () => [0, 0, 1],
  getPathPoints = () => [],
  showLabel = true,

  glowMultiplier,
  onHideLabel,

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

  // Apply rotation from saved quaternion or Euler angles
  useLayoutEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return

    // Prefer quaternion if available (most accurate)
    if (quaternion && quaternion.length === 4) {
      const q = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      groupRef.current.quaternion.copy(q)

      // Compute and sync normal vector based on quaternion
      if (typeof updateDirection === 'function') {
        const normalLocal = computeNormal()
        const normalVec = new THREE.Vector3(normalLocal[0], normalLocal[1], normalLocal[2])
        const normalWorld = normalVec.applyQuaternion(q).normalize()
        updateDirection(id, [normalWorld.x, normalWorld.y, normalWorld.z])
      }
      return
    }

    // Fall back to Euler angles (XYZ order)
    if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      groupRef.current.rotation.copy(e)

      // Compute and sync normal vector
      if (typeof updateDirection === 'function') {
        const normalLocal = computeNormal()
        const normalVec = new THREE.Vector3(normalLocal[0], normalLocal[1], normalLocal[2])
        const normalWorld = normalVec.applyEuler(e).normalize()
        updateDirection(id, [normalWorld.x, normalWorld.y, normalWorld.z])
      }
    }
  }, [rotation, quaternion, computeNormal, id, updateDirection])

  // Compute the normal arrow geometry (for calculations, not visible)
  const normalArrowGroup = useMemo(() => {
    const normalVec = new THREE.Vector3(direction[0], direction[1], direction[2]).normalize()
    
    // Rotation to align cylinder (default +Y axis) with normal direction
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec)

    return {
      position: [0, 0, 0], // Centered at coil origin
      quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      direction: normalVec,
    }
  }, [direction, normalLength])

  // set object's current so the scene/store knows this coil's current
  useEffect(() => {
    updateObject?.(id, { current })
  }, [current, id, updateObject])

  // Generate path points using the provided function
  const pathPoints = useMemo(() => {
    return getPathPoints()
  }, [getPathPoints, position, rotation])

  // Handle dragging
  const handleDragStart = (axes) => {
    isDraggingRef.current = true
    setIsDragging(true)
    handleAxisDragStart(axes, position)
  }

  const handleDrag = (matrix) => {
    const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
    updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
  }

  const handleDragEnd = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  const handleSelect = (e) => {
    if (isDraggingRef.current) return
    e.stopPropagation()
    setSelectedId(id)
  }

  return (
    <PivotControls
      ref={pivotRef}
      depthTest={false}
      enabled={creativeMode && isSelected}
      disableScaling
      disableRotations
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      scale={0.86}
      lineWidth={2.5}
    >
      <group ref={groupRef}>
        {/* Child component renders the actual coil geometry */}
        {coilGeometry}

        {/* Path handles charge animation */}
        {pathPoints.length > 0 && (
          <Path
            id={id}
            name = {name}
            position={[0, 0, 0]}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            setIsDragging={setIsDragging}
            updateObject={updateObject}
            creativeMode={creativeMode}
            points={pathPoints}
            // unified: pass current instead of charge/chargeCount/velocity
            current={current}
            renderCharges={renderCharges}
            renderPoints={false}
            isChild={true}
            parentRotation={rotation}
            parentQuaternion={quaternion}
            groupRef={groupRef}
            showLabel={showLabel}
            glowMultiplier={glowMultiplier}
            onHideLabel={onHideLabel}
            ac={ac}
          />
        )}

        {/* Invisible hitbox */}
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          userData={{ id, type: 'coil' }}
          onPointerDown={handleSelect}
        >
          <torusGeometry args={[coilRadius, coilRadius * 0.15, 8, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </PivotControls>
  )
}
