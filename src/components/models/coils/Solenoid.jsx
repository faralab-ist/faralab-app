import React, { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import BaseCoil from './BaseCoil'
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
  pointsPerTurn = 10,

  turns = 10,
  // unified API: only current
  current = 1,
  ac = false,

  // visual thickness of the wire (used for geometry + hitbox)
  wireThickness = 0.05,

  direction = [0, 0, 1],
  rotation = [0, 0, 0],
  quaternion,
  
  charges = [],
  showLabel = true,
  onHideLabel,
  segments = 500,
}) {
  const computeSolenoidNormal = useCallback(() => {
    // Local normal is +Z (for solenoid along Z axis)
    return [0, 0, 1]
  }, [])

  const getSolenoidPoints = useCallback(() => {
    const points = []

    const turns2 = turns * Math.PI * 2
    const totalPoints = turns * pointsPerTurn * 1
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
  }, [radius, length, pointsPerTurn, turns])

  // Thin hitbox following the wire path so interior stays clickable
  const hitboxCurve = useMemo(() => {
    const pts = getSolenoidPoints()
    const vecs = pts.map(([x, z, y]) => new THREE.Vector3(x, y, z))
    const curve = new THREE.CatmullRomCurve3(vecs, false)
    curve.tension = 0.5
    return curve
  }, [getSolenoidPoints])

  //console.log(getSolenoidPoints())

  return (
    <BaseCoil
    segments={segments}
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
      coilRadius={radius}
      direction={direction}
      rotation={rotation}
      quaternion={quaternion}
      // unified: pass current (preserve previous multiplier -> current mapping if desired)
      current={current}
      renderCharges={true}
      charges={charges}
      glowMultiplier={0.6}
      isClosedPath={false}
      computeNormal={computeSolenoidNormal}
      getPathPoints={getSolenoidPoints}
      showLabel={showLabel}
      onHideLabel={onHideLabel}
      ac={ac}
      coilGeometry={
        null
      }
      hitboxGeometry={
        <tubeGeometry args={[hitboxCurve, 64, 0.05, 16, false]} />
      }
    />
  )
}
