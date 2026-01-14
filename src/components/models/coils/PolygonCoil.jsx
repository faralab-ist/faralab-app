import React, { useMemo, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import BaseCoil from './BaseCoil'
import calculateFieldAtPoint from '../../../utils/calculateField'

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

  coilRadius = 1.5,
  tubeRadius = 0.01,
  coilColor = '#6ea8ff',
  wireThickness = 0.05,
  sides,

  direction = [0, 1, 0],
  rotation = [0, 0, 0],
  quaternion,
  
  // unified API: only current
  current = 1,

  renderCharges = true,
  charges = [],
  
  showLabel = true,
  onHideLabel,
}) {
  // Compute the normal for a polygon (perpendicular to its plane)
  // For a polygon lying flat in XZ plane, normal points along Y
  const computePolygonNormal = useCallback(() => {
    // Local normal is +Y (for polygon in XZ plane)
    return [0, 1, 0]
  }, [])

  // Check if a point is inside the polygon using ray casting algorithm
  const isPointInPolygon = useCallback((x, z, vertices) => {
    let inside = false
    // Foi o chat q fez isto, i dont know ╰(▔∀▔)╯
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i][0], zi = vertices[i][2]
      const xj = vertices[j][0], zj = vertices[j][2]
      
      const intersect = ((zi > z) !== (zj > z)) &&
        (x < (xj - xi) * (z - zi) / (zj - zi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }, [])

  // Generate grid of surface points inside the polygon (XZ plane)
  // Memoized to avoid recalculation - transformation happens on-demand
  const getPolygonSurfacePoints = useCallback((resolution = 20) => {
    const points = []
    const numSides = Math.max(3, Math.floor(sides))
    const gridSize = (2 * coilRadius) / resolution

    // Get rotation quaternion at time of call
    const quat = quaternion && quaternion.length === 4
      ? new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      : new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'))
    
    const posVec = new THREE.Vector3(position[0], position[1], position[2])
 
    // Get polygon vertices
    const vertices = []
    for (let i = 0; i < numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2
      vertices.push([
        Math.cos(angle) * coilRadius,
        0,
        Math.sin(angle) * coilRadius
      ])
    }

    // Create grid and test if points are inside the polygon
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x = -coilRadius + (i + 0.5) * gridSize
        const z = -coilRadius + (j + 0.5) * gridSize
        const y = 0 // Polygon lies in XZ plane (local space)

        if (isPointInPolygon(x, z, vertices)) {
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
  }, [coilRadius, sides, isPointInPolygon]) // Only depend on shape params, capture rotation/position at call time

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

  // Vou deixar aqui se quiserem testar
  /*// TEST: Log surface points on mount and expose to window for testing
  useEffect(() => {
    const testPoints = getPolygonSurfacePoints(10)
    console.log(`[PolygonCoil ${id}] Surface points (resolution=10, sides=${sides}):`, testPoints)
    console.log(`[PolygonCoil ${id}] Total points: ${testPoints.length}`)
    
    // Expose to window for manual testing
    window.testPolygonSurface = (resolution = 20) => {
      const points = getPolygonSurfacePoints(resolution)
      console.log(`Polygon surface points (resolution=${resolution}, sides=${sides}):`, points)
      console.log(`Total points: ${points.length}`)
      console.log(`Sample point:`, points[0])
      return points
    }
  }, [id, sides, getPolygonSurfacePoints])
*/
  return (
    <BaseCoil
      getSurfacePoints={getPolygonSurfacePoints}
      id={id}
      name={name}
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
      // unified: pass current
      current={current}
      renderCharges={renderCharges}
      charges={charges}
      isClosedPath={true}
      computeNormal={computePolygonNormal}
      getPathPoints={getPolygonPoints}
        showLabel = {showLabel}
      onHideLabel={onHideLabel}
      coilGeometry={
        <mesh geometry={polygonGeometry}>
          <meshStandardMaterial color={coilColor} emissive={coilColor} />
        </mesh>
      }
    />
  )
}
