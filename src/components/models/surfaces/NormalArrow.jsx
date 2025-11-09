import React, { memo } from 'react'
import * as THREE from 'three'

const toVec3 = (v) =>
  Array.isArray(v) ? new THREE.Vector3(...v) : v?.clone ? v.clone() : new THREE.Vector3()

function NormalArrow({
  origin,
  dir,
  length,
  color = 'red',
  opacity = 1,
  shaftRatio = 0.75,
  radiusScale = 0.06,
  segments = 16,
}) {
  const o = toVec3(origin)
  const d = toVec3(dir).normalize()
  if (d.lengthSq() < 1e-6) d.set(0, 1, 0)

  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
  const shaftLen = length * shaftRatio
  const headLen = Math.max(0, length - shaftLen)
  const shaftRadius = Math.max(0.01, length * radiusScale)

  return (
    <group position={o} quaternion={q} raycast={() => {}}>
      <mesh position={[0, shaftLen / 2, 0]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLen, segments]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, shaftLen + headLen / 2, 0]}>
        <coneGeometry args={[shaftRadius * 1.75, headLen, segments]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  )
}

export default memo(NormalArrow)