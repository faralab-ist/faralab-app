import React, { useMemo, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import BaseCoil from './BaseCoil'

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

  coilRadius = 1.5,
  tubeRadius = 0.01,
  coilColor = '#6ea8ff',
  wireThickness = 0.05,

  direction = [0, 0, 1],
  rotation = [0, 0, 0],
  quaternion,

  // unified API: only current
  current = 1,

  charges = [],
  showLabel = true,
  onHideLabel,
}) {

  const computeRingNormal = useCallback(() => {
    return [0, 1, 0]
  }, [])

  const getCirclePoints = useCallback(() => {
    const numPoints = 64
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

  const getRingSurfacePoints = useCallback((resolution = 20) => {
    const points = []
    const gridSize = (2 * coilRadius) / resolution

    const quat = quaternion && quaternion.length === 4
      ? new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      : new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'))
    
    const posVec = new THREE.Vector3(position[0], position[1], position[2])

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x = -coilRadius + (i + 0.5) * gridSize
        const z = -coilRadius + (j + 0.5) * gridSize
        const y = 0 // Ring lies in XZ plane (local space)

        const distFromCenter = Math.sqrt(x * x + z * z)
        if (distFromCenter <= coilRadius) {
          const localPoint = new THREE.Vector3(x, y, z)
          const worldPoint = localPoint.applyQuaternion(quat).add(posVec)
          
          points.push([
            worldPoint.x,
            worldPoint.y,
            worldPoint.z
          ])
        }
      }
    }

    return points
  }, [coilRadius]) // Only depend on coilRadius, capture rotation/position at call time

  const ringGeometry = useMemo(() => {
    const torusGeo = new THREE.TorusGeometry(coilRadius, tubeRadius, 16, 64)
    torusGeo.rotateX(Math.PI / 2)
    return torusGeo
  }, [coilRadius, tubeRadius])

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
      // unified: pass current
      current={current}
      charges={charges}
      isClosedPath={true}
      computeNormal={computeRingNormal}
      getPathPoints={getCirclePoints}
      getSurfacePoints={getRingSurfacePoints}
      showLabel={showLabel}
      onHideLabel={onHideLabel}
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
      hitboxGeometry={
        <cylinderGeometry args={[coilRadius, coilRadius, 0.1, 32]} />
      }
    />
  )
}
