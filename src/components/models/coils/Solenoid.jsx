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
  resolution = 1,
  multiplier = 1,

  turns = 10,
  chargeCount = 12,
  velocity = 5,
  ac = false,

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

    const turns2 = turns * Math.PI * 2
    const totalPoints = turns * resolution * 1
    //console.log('totalPoints', totalPoints)
    for (let i = 0; i < totalPoints; i++) {
      const t = i / (totalPoints - 1)
      const theta = t * turns2

      const y = t * length - length / 2

      const p = new THREE.Vector3(
        Math.cos(theta) * radius,
        y,
        Math.sin(theta) * radius
      )

      points.push([p.x, p.z, p.y])
    }

    return points
  }, [radius, length, resolution, turns])

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
      chargeCount={chargeCount}
      charge={multiplier * 0.1}
      velocity={velocity}
      renderCharges={true}
      charges={charges}
      glowMultiplier={0.6}
      isClosedPath={false}
      computeNormal={computeSolenoidNormal}
      getPathPoints={getSolenoidPoints}
      ac={ac}
      coilGeometry={
        null
      }
      hitboxGeometry={
        
        <cylinderGeometry args={[radius * 2, radius * 2, length * 1.1, 16]} />
      }
    />
  )
}
