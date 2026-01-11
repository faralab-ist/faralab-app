import React, { useEffect, useRef, useLayoutEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import Label from '../ui/labels/Label'

function Wire({
  id,
  position,
  charge_density,
  infinite,
  material,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  updateDirection,
  updateObject,
  gridDimensions,
  height,
  radius,
  direction = [0, 0, 1],
  quaternion,
  creativeMode,
  rotation,
  isHovered,
  showLabel = true,
}) {
  const isSelected = id === selectedId

  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)

  const trueHeight = infinite ? 20 : height

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(0, 0, 0)
  }, [])

  useEffect(() => {
    if (!direction || direction.every((d) => d === 0)) {
      updateDirection?.(id, [0, 0, 1])
    }
  }, [])

  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return

    let rotQuat = new THREE.Quaternion()
    if (quaternion && quaternion.length === 4) {
      rotQuat.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(rotQuat).normalize()
        const [dx = 0, dy = 0, dz = 0] = direction || []
        const eps = 1e-6
        if (Math.abs(dx - dirWorld.x) > eps || Math.abs(dy - dirWorld.y) > eps || Math.abs(dz - dirWorld.z) > eps) {
          updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
        }
      }
    } else if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      rotQuat.setFromEuler(e)
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyEuler(e).normalize()
        const [dx = 0, dy = 0, dz = 0] = direction || []
        const eps = 1e-6
        if (Math.abs(dx - dirWorld.x) > eps || Math.abs(dy - dirWorld.y) > eps || Math.abs(dz - dirWorld.z) > eps) {
          updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
        }
      }
    } else if (direction) {
      const dir = new THREE.Vector3(direction[0], direction[1], direction[2])
      if (dir.lengthSq() > 0) {
        dir.normalize()
        const from = new THREE.Vector3(0, 0, 1)
        rotQuat.setFromUnitVectors(from, dir)
      }
    }

    const pos = new THREE.Vector3(...position)
    const mat = new THREE.Matrix4().setPosition(pos)
    mat.multiply(new THREE.Matrix4().makeRotationFromQuaternion(rotQuat))
    if (pivotRef.current.matrix) {
      pivotRef.current.matrix.copy(mat)
    }
  }, [position, quaternion, rotation, direction, updateDirection, id])

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={isSelected && creativeMode}
      disableScaling
      disableRotations
      onDragStart={(activeAxes) => {
        isDraggingRef.current = true
        setIsDragging(true)
        handleAxisDragStart(activeAxes, position)
      }}
      onDrag={(matrix) => {
        if (!groupRef.current) return
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(p, q, s)

        groupRef.current.position.copy(p)
        groupRef.current.quaternion.copy(q)

        const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
        updateDirection(id, [dir.x, dir.y, dir.z])
        const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
        updateObject?.(id, { quaternion: [q.x, q.y, q.z, q.w], rotation: [e.x, e.y, e.z] })
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      {showLabel && (
        <Label name="Linear Density" value={`λ = ${charge_density.toExponential(2)} C/m`} offsetY={0.5} />
      )}
      <group ref={groupRef}>
        <mesh
          userData={{
            id,
            type: 'wire',
            charge_density,
            infinite,
            material,
            direction,
            position,
            height,
            radius,
          }}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            e.stopPropagation()
            setSelectedId(id)
          }}
        >
          <cylinderGeometry args={[radius, radius, trueHeight, 16]} />
          <meshStandardMaterial color={isSelected || isHovered ? 'lightblue' : 'red'} />
        </mesh>
      </group>
    </PivotControls>
  )
}

export default Wire
