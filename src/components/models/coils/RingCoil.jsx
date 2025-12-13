import React, { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import BaseCoil from './BaseCoil'

/**
 * RingCoil - A circular coil that wraps BaseCoil
 *
 * Creates a toroidal coil (doughnut-shaped current loop) with:
 * - Configurable major radius (coil size)
 * - Configurable tube radius (wire thickness)
 * - Normal vector pointing perpendicular to the plane of the ring
 * - Animated charges moving along the ring
 */
export default function RingCoil({
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

  // Ring-specific props
  coilRadius = 1.5,                 // major radius (ring size)
  tubeRadius = 0.01,                 // minor radius (wire thickness)
  coilColor = '#6ea8ff',            // wire color
  wireThickness = 0.05,             // thickness of 3D normal arrow visualization

  // Rotation state
  direction = [0, 0, 1],
  rotation = [0, 0, 0],
  quaternion,
  
  // Path props (charges)
  chargeCount = 5,
  charge = 1,
  velocity = 1,
  renderCharges = true,
  charges = [],
}) {
  // Compute the normal for a ring (perpendicular to its plane)
  // For a ring lying flat in XZ plane, normal points along Y
  const computeRingNormal = useCallback(() => {
    // Local normal is +Y (for ring in XZ plane)
    return [0, 1, 0]
  }, [])

  // Generate circular path points (in XZ plane to match torus)
  const getCirclePoints = useCallback(() => {
    const numPoints = 8
    const points = []
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      points.push([
        Math.cos(angle) * coilRadius,
        0,
        Math.sin(angle) * coilRadius
      ])
    }
    return points
  }, [coilRadius])

  // Ring geometry (toroid)
  const ringGeometry = useMemo(() => {
    const torusGeo = new THREE.TorusGeometry(coilRadius, tubeRadius, 16, 64)
    // Rotate to lay in XZ plane (Y is up/normal)
    torusGeo.rotateX(Math.PI / 2)
    return torusGeo
  }, [coilRadius, tubeRadius])

  return (
    <BaseCoil
      id={id}
      position={position}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      setIsDragging={setIsDragging}
      updatePosition={updatePosition}
      updateDirection={updateDirection}
      updateObject={updateObject}
      creativeMode={creativeMode}
      isHovered={isHovered}
      coilRadius={coilRadius}
      coilColor={coilColor}
      wireThickness={wireThickness}
      direction={direction}
      rotation={rotation}
      quaternion={quaternion}
      chargeCount={chargeCount}
      charge={charge}
      velocity={velocity}
      renderCharges={renderCharges}
      charges={charges}
      isClosedPath={true}
      computeNormal={computeRingNormal}
      getPathPoints={getCirclePoints}
      coilGeometry={
        <mesh
          geometry={ringGeometry}
          userData={{ id, type: 'coil', coilType: 'ring' }}
        >
          <meshStandardMaterial
            color={coilColor}
            emissive={coilColor}
          />
        </mesh>
      }
    />
  )
}
