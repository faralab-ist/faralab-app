import React, { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import BaseCoil from './BaseCoil'

/**
 * PolygonCoil - A polygonal coil that wraps BaseCoil
 *
 * Creates a polygon-shaped coil (triangle, square, pentagon, hexagon, etc.) with:
 * - Configurable number of sides
 * - Configurable radius (distance from center to vertices)
 * - Normal vector pointing perpendicular to the plane of the polygon
 * - Animated charges moving along the polygon edges
 */
export default function PolygonCoil({
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

  // Polygon-specific props
  coilRadius = 1.5,                 // radius from center to vertices
  tubeRadius = 0.01,                // wire thickness
  coilColor = '#6ea8ff',            // wire color
  wireThickness = 0.05,             // thickness of 3D normal arrow visualization
  sides,                            // number of sides (use factory default, no override)

  // Rotation state
  direction = [0, 1, 0],
  rotation = [0, 0, 0],
  quaternion,
  
  // Path props (charges)
  chargeCount = 5,
  charge = 1,
  velocity = 1,
  renderCharges = true,
  charges = [],
}) {
  // Compute the normal for a polygon (perpendicular to its plane)
  // For a polygon lying flat in XZ plane, normal points along Y
  const computePolygonNormal = useCallback(() => {
    // Local normal is +Y (for polygon in XZ plane)
    return [0, 1, 0]
  }, [])

  // Generate polygon path points (in XZ plane)
  // For straight edges, we need multiple points per edge for CatmullRomCurve3
  const getPolygonPoints = useCallback(() => {
    const numSides = Math.max(3, Math.floor(sides)) // At least 3 sides
    const pointsPerEdge = 24 // More points = straighter edges
    const points = []
    
    for (let i = 0; i < numSides; i++) {
      const angle1 = (i / numSides) * Math.PI * 2
      const angle2 = ((i + 1) / numSides) * Math.PI * 2
      
      const x1 = Math.cos(angle1) * coilRadius
      const z1 = Math.sin(angle1) * coilRadius
      const x2 = Math.cos(angle2) * coilRadius
      const z2 = Math.sin(angle2) * coilRadius
      
      // Add intermediate points along this edge
      for (let j = 0; j < pointsPerEdge; j++) {
        const t = j / pointsPerEdge
        points.push([
          x1 + (x2 - x1) * t,
          0,
          z1 + (z2 - z1) * t
        ])
      }
    }
    
    return points
  }, [coilRadius, sides])

  // Polygon geometry using tube - uses same logic as getPolygonPoints
  const polygonGeometry = useMemo(() => {
    const numSides = Math.max(3, Math.floor(sides))
    
    // Get the same points as the path uses
    const pathPoints = getPolygonPoints()
    
    // Convert to Vector3 for TubeGeometry
    const points = pathPoints.map(pt => new THREE.Vector3(pt[0], pt[1], pt[2]))
    
    // Create a curve from the points and make a tube
    const curve = new THREE.CatmullRomCurve3(points, true)
    const tubeGeo = new THREE.TubeGeometry(curve, points.length, tubeRadius, 16, true)
    
    return tubeGeo
  }, [coilRadius, sides, tubeRadius, getPolygonPoints])

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
      computeNormal={computePolygonNormal}
      getPathPoints={getPolygonPoints}
      coilGeometry={
        <mesh geometry={polygonGeometry}>
          <meshStandardMaterial color={coilColor} emissive={coilColor} />
        </mesh>
      }
    />
  )
}
