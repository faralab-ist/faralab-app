import React, { useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../../hooks/useCameraSnapOnSlider'
import Path from '../Path'

import * as THREE from 'three'

/**
 * BaseCoil - Reusable parent component for all coil types (Ring, Square, Pentagon, Hexagon, etc.)
 *
 * Handles shared functionality:
 * - Position dragging via PivotControls
 * - Selection highlighting
 * - Normal vector (area direction) calculation and visual
 * - Path-based charge animation
 * - Color management (coil wire + normal arrow)
 * - Collision detection for interactions
 *
 * Child components (RingCoil, PolygonCoil, etc.) should pass:
 * - coilGeometry: JSX element to render the coil shape itself
 * - computeNormal: function to calculate the area normal vector [x, y, z]
 * - getPathPoints: function that returns array of [x, y, z] points for the charge path
 * - normalLength: length of the visual normal arrow (default: 1.5)
 */
export default function BaseCoil({
  id,
  position = [0, 0, 0],
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  updateDirection, // callback to save normal direction
  updateObject,
  creativeMode,
  isHovered,
  name,

  ac = false,

  // Coil-specific visual props
  coilRadius,           // main coil size (radius for ring, side length for polygons)
  coilColor = '#6ea8ff',    // wire color 
  normalLength = 1.5,       // length of the visual normal arrow
  wireThickness = 0.05,     // thickness of the coil wire

  // Direction state
  direction = [0, 0, 1],    // normal vector (area direction)
  rotation = [0, 0, 0],     // Euler angles for rotation
  quaternion,               // quaternion for full rotation state

  // Path animation props (charges)
  chargeCount = 5,
  charge = 1,
  velocity = 1,
  renderCharges = true,
  charges = [],
  isClosedPath = true,

  // Child rendering function
  coilGeometry,             // JSX: the actual coil geometry (Ring, Polygon, etc.)
  computeNormal = () => [0, 0, 1], // function to compute normal in local space
  getPathPoints = () => [],        // function to generate path points for charges
  showLabel = true,

  glowMultiplier,

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

  //set objects velocity and charge
  useEffect(() => {
    updateObject?.(id, { velocity, charge })
  }, [velocity, charge, id, updateObject])

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
            charges={charges}
            chargeCount={chargeCount}
            charge={charge}
            velocity={velocity}
            isClosedPath={isClosedPath}
            renderCharges={renderCharges}
            renderPoints={false}
            isChild={true}
            parentRotation={rotation}
            parentQuaternion={quaternion}
            groupRef={groupRef}
            showLabel={showLabel}
            glowMultiplier={glowMultiplier}
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
