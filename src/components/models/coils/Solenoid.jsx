import React, { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import BaseCoil from './BaseCoil'
import { color } from 'three/tsl'

// just a big solenoid
export default function Solenoid({
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

  radius = 1.5,
  length = 4,
  resolution = 32,
  multiplier = 1,

  // Rotation state
  direction = [0, 0, 1],
  rotation = [0, 0, 0],
  quaternion,
  
  // Path props (charges)
  charges = [],
  showLabel = true,
}) {
  const computeSolenoidNormal = useCallback(() => {
    // Local normal is +Z (for solenoid along Z axis)
    return [0, 0, 1]
  }, [])

  const getSolenoidPoints = useCallback(() => {
    const points = []

    const turns = resolution
    const totalPoints = resolution

    for (let i = 0; i < totalPoints; i++) {
      const t = i / (totalPoints - 1)
      const theta = t * turns

      const y = t * length - length / 2

      const p = new THREE.Vector3(
        Math.cos(theta) * radius,
        y,
        Math.sin(theta) * radius
      )

      points.push([p.x, p.z, p.y])
    }

    return points
  }, [radius, length, resolution])

  //console.log(getSolenoidPoints())

  return (
    <BaseCoil
      id={id}
      showLabel={showLabel}
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
      coilRadius={radius}
      //coilColor='white'
      //wireThickness={1}
      direction={direction}
      rotation={rotation}
      quaternion={quaternion}
      chargeCount={resolution}
      charge={multiplier * 0.1}
      velocity={1}
      renderCharges={true}
      charges={charges}
      glowMultiplier={0.6}
      isClosedPath={false}
      computeNormal={computeSolenoidNormal}
      getPathPoints={getSolenoidPoints}
      showLabel={showLabel}
      coilGeometry={
        null
      }
      hitboxGeometry={
        
        <cylinderGeometry args={[radius * 2, radius * 2, length * 1.1, 16]} />
      }
    />
  )
}
