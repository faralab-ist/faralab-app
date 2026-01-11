import React, { useMemo, useCallback, useEffect } from 'react'
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
  name,
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
  showLabel = true,
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

  // Generate grid of surface points inside the ring (XZ plane)
  // Memoized to avoid recalculation - transformation happens on-demand
  const getRingSurfacePoints = useCallback((resolution = 20) => {
    const points = []
    const gridSize = (2 * coilRadius) / resolution

    // Get rotation quaternion at time of call
    const quat = quaternion && quaternion.length === 4
      ? new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      : new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'))
    
    const posVec = new THREE.Vector3(position[0], position[1], position[2])

    // Create grid and test if points are inside the circle
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x = -coilRadius + (i + 0.5) * gridSize
        const z = -coilRadius + (j + 0.5) * gridSize
        const y = 0 // Ring lies in XZ plane (local space)

        // Check if point is inside the circle
        const distFromCenter = Math.sqrt(x * x + z * z)
        if (distFromCenter <= coilRadius) {
          // Transform to world space: apply rotation then add position
          const localPoint = new THREE.Vector3(x, y, z)
          const worldPoint = localPoint.applyQuaternion(quat).add(posVec)
          
          // Round to 4 decimal places to avoid floating-point precision issues
          points.push([
            Math.round(worldPoint.x * 10000) / 10000,
            Math.round(worldPoint.y * 10000) / 10000,
            Math.round(worldPoint.z * 10000) / 10000
          ])
        }
      }
    }

    return points
  }, [coilRadius]) // Only depend on coilRadius, capture rotation/position at call time

  // Ring geometry (toroid)
  const ringGeometry = useMemo(() => {
    const torusGeo = new THREE.TorusGeometry(coilRadius, tubeRadius, 16, 64)
    // Rotate to lay in XZ plane (Y is up/normal)
    torusGeo.rotateX(Math.PI / 2)
    return torusGeo
  }, [coilRadius, tubeRadius])

  /*// TEST: Log surface points on mount and expose to window for testing
  useEffect(() => {
    const testPoints = getRingSurfacePoints(10)
    console.log(`[RingCoil ${id}] Surface points (resolution=10):`, testPoints)
    console.log(`[RingCoil ${id}] Total points: ${testPoints.length}`)
    
    // Expose to window for manual testing
    window.testRingSurface = (resolution = 20) => {
      const points = getRingSurfacePoints(resolution)
      console.log(`Ring surface points (resolution=${resolution}):`, points)
      console.log(`Total points: ${points.length}`)
      console.log(`Sample point:`, points[0])
      return points
    }
  }, [id, getRingSurfacePoints])
*/
  return (
    <BaseCoil
      id={id}
      name = {name}
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
      getSurfacePoints={getRingSurfacePoints}
      showLabel={showLabel}
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
