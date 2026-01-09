import React, { useRef, useMemo, useLayoutEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import NormalArrow from './NormalArrow'
import CylinderShape from '../../../Surfaces/cylinderShape'

import { Html } from '@react-three/drei'
import Label from '../../ui/labels/Label'

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
  name,
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
  isHovered,
  // flux value
  fluxValue = 0,
  showOnlyGaussianField
}) {
  const isSelected = id === selectedId
  const meshRef = useRef()
  const pivotRef = useRef()
  const rootRef = useRef() // 👈 child group stays at origin; pivot drives world transform
  const isDraggingRef = useRef(false)
  const center = useMemo(() => [0, 0, 0], [])
  const clickArmed = useRef(false)
  const shape = useMemo(() => new CylinderShape({ radius, height }), [radius, height])
  const normals = useMemo(() => shape.getRepresentativeNormals(), [shape])
  const arrowLen = useMemo(() => Math.max(0.1, Math.min(radius, height) * 0.4), [radius, height])

  // Sync PivotControls matrix from state; keep child at origin to avoid double transforms
  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(...position)
    const mat = new THREE.Matrix4().setPosition(pos)
    let rotQuat = new THREE.Quaternion()
    if (Array.isArray(quaternion) && quaternion.length === 4) {
      rotQuat.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
    } else if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      rotQuat.setFromEuler(e)
    }
    mat.multiply(new THREE.Matrix4().makeRotationFromQuaternion(rotQuat))
    if (pivotRef.current.matrix) pivotRef.current.matrix.copy(mat)
  }, [position, rotation, quaternion])

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
      scale={0.86}
      lineWidth={2.5}
      enabled={!fixed && (dragOwnerId === null || dragOwnerId === id) && creativeMode}
      anchor={center}
      visible={isSelected}
      disableScaling={true}
      depthTest={false}
      onDragStart={() => { isDraggingRef.current = true; setIsDragging(true) }}
      onDrag={(matrix) => {
        const newPos = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [newPos.x, newPos.y, newPos.z])
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
      onDragEnd={() => { isDraggingRef.current = false; setIsDragging(false) }}
    >
      <group ref={rootRef} position={[0, 0, 0]}>
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
{showOnlyGaussianField && (
        <Label
          position={[0, (height / 2) + 0.7, 0]}
          objectName={name}
          value={`${fluxValue.toExponential(2)} N⋅m²/C`}
          offsetY={0}
          distanceFactor={10}
        />
)}

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
