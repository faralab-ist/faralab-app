import React, { useRef, useEffect, useState, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import NormalArrow from './NormalArrow'

function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip){
    if(!useSlice) return true;
    switch(slicePlane){
        case 'xy':
            return slicePlaneFlip ^ point.z > slicePos;
        case 'yz':
            return slicePlaneFlip ^ point.x > slicePos;
        case 'xz':
            return slicePlaneFlip ^ point.y > slicePos;
    }
}

export default function Cylinder({
  id,
  position,
  radius = 3,
  height = 5,
  opacity = 0.5,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  fixed = false,
  dragOwnerId = null,
  creativeMode,
  slicePlane,
  slicePos,
  useSlice,
  slicePlaneFlip,
  // rotation support (optional)
  rotation,
  quaternion,
  updateObject,
  updateDirection,
  isHovered
}) {
  const isSelected = id === selectedId
  const meshRef = useRef()
  const pivotRef = useRef()
  const rootRef = useRef() // 👈 move this group, not just the mesh
  const [center, setCenter] = useState([0, 0, 0])
  const clickArmed = useRef(false)
  const arrowLen = useMemo(() => Math.max(0.1, Math.min(radius, height) * 0.4), [radius, height])

  const normals = useMemo(() => {
    const arr = []
    // bases
    arr.push({ origin: new THREE.Vector3(0, +height / 2, 0), dir: new THREE.Vector3(0,  1, 0) })
    arr.push({ origin: new THREE.Vector3(0, -height / 2, 0), dir: new THREE.Vector3(0, -1, 0) })
    // side (diagonal) at mid-height
    const dir = new THREE.Vector3(1, 0, 1).normalize()
    const origin = dir.clone().multiplyScalar(radius)
    arr.push({ origin, dir })
    return arr
  }, [radius, height])

  useEffect(() => {
    if (meshRef.current?.geometry) {
      meshRef.current.geometry.computeBoundingBox()
      const box = meshRef.current.geometry.boundingBox
      const centerVec = new THREE.Vector3()
      box.getCenter(centerVec)
      setCenter([centerVec.x, centerVec.y, centerVec.z])
    }
  }, [radius, height])

  // 👇 sync world position via root group so gizmo + arrows follow
  useEffect(() => {
    if (rootRef.current) rootRef.current.position.set(...position)
  }, [position])

  // apply quaternion / rotation to the root group and keep direction in sync
  useEffect(() => {
    if (!rootRef.current) return
    // don't override while dragging
    if (dragOwnerId !== null && dragOwnerId !== id) return
    // prefer quaternion
    if (Array.isArray(quaternion) && quaternion.length === 4) {
      const q = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      rootRef.current.quaternion.copy(q)
      // sync direction (use local Y as cylinder neutral axis)
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize()
        updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
      }
      return
    }
    // fallback to Euler rotation (radians)
    if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      rootRef.current.rotation.copy(e)
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 1, 0).applyEuler(e).normalize()
        updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
      }
      return
    }
    // otherwise reset
    rootRef.current.rotation.set(0, 0, 0)
    rootRef.current.quaternion.identity()
  }, [rotation, quaternion, updateDirection, id, dragOwnerId])

  const clippingPlanes = useMemo(() => {
    if (!useSlice) return [];
      let sliceFlip = -1;
      if(slicePlaneFlip) sliceFlip = 1;
      switch (slicePlane) {
      case 'xy': return [new THREE.Plane(new THREE.Vector3(0, 0, -sliceFlip), sliceFlip * slicePos)];
      case 'yz': return [new THREE.Plane(new THREE.Vector3(-sliceFlip, 0, 0), sliceFlip * slicePos)];
      case 'xz': return [new THREE.Plane(new THREE.Vector3(0, -sliceFlip, 0), sliceFlip * slicePos)];
      default: return [];
    }
  }, [slicePlane, slicePos, useSlice, slicePlaneFlip]);

  return (
    <PivotControls
      ref={pivotRef}
      enabled={!fixed && (dragOwnerId === null || dragOwnerId === id) && creativeMode}
      anchor={center}
      visible={isSelected}
      disableScaling={true}
      depthTest={false}
      onDragStart={() => setIsDragging(true)}
      onDrag={(matrix) => {
        const newPos = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [newPos.x, newPos.y, newPos.z])
        if (rootRef.current) rootRef.current.position.copy(newPos)
        // persist quaternion + Euler rotation (radians) so UI stays in sync
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(p, q, s)
        const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
        updateObject?.(id, { quaternion: [q.x, q.y, q.z, q.w], rotation: [e.x, e.y, e.z] })
        // also update direction to match resulting quaternion (local Y)
        if (typeof updateDirection === 'function') {
          const dirWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize()
          updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
        }
      }}
      onDragEnd={() => setIsDragging(false)}
    >
      <group ref={rootRef} position={position}>
        <mesh
          ref={meshRef}
          userData={{ id, type: 'surface' }}
          position={[0, 0, 0]}
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            if (dragOwnerId !== null && dragOwnerId !== id) return
            clickArmed.current = true
          }}
          onPointerUp={(e) => {
            if (!clickArmed.current) return
            clickArmed.current = false
            if (dragOwnerId !== null && dragOwnerId !== id) return
            if (!fixed) e.stopPropagation()
            setSelectedId(id)
          }}
          raycast={(raycaster, intersects) => {
            if (!meshRef.current) return
            if (dragOwnerId !== null && dragOwnerId !== id) return
            const hitsBefore = intersects.length
            THREE.Mesh.prototype.raycast.call(meshRef.current, raycaster, intersects)
            if (intersects.length > hitsBefore + 1) {
              intersects.splice(hitsBefore, 1)
            }
          }}
        >
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshStandardMaterial
            color={isSelected || isHovered ? 'lightblue' : 'white'}
            transparent
            opacity={opacity}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
            clippingPlanes={clippingPlanes}
          />
        </mesh>

        {isSelected && (
          <group name="cylinder-normals">
            {normals.map((n, i) => {
              if (!sliceByPlane(n.origin, slicePlane, slicePos, useSlice, slicePlaneFlip)) return null;
              return <NormalArrow
                key={i}
                origin={n.origin}
                dir={n.dir}
                length={arrowLen}
                color="red"
                opacity={opacity}
              />;}
            )}
          </group>
        )}
      </group>
    </PivotControls>
  )
}

