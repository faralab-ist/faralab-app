import React, { useRef, useMemo, useLayoutEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import NormalArrow from './NormalArrow'
import SphereShape from '../../../Surfaces/sphereShape'

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

export default function Sphere({
  id,
  position,
  radius = 2,
  fluxValue = 0,
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
  isHovered,
  showOnlyGaussianField,
  showLabel = true,
}) {
  const isSelected = id === selectedId
  const meshRef = useRef()
  const pivotRef = useRef()
  const rootRef = useRef() // 👈 move this group, not just the mesh
  const isDraggingRef = useRef(false)
  const center = useMemo(() => [0, 0, 0], [])
  const clickArmed = useRef(false)
  const shape = useMemo(() => new SphereShape({ radius }), [radius])
  const representativeNormals = useMemo(() => shape.getRepresentativeNormals(), [shape])
  const arrowLen = useMemo(() => Math.max(0.1, radius * 0.35), [radius])

  // Sync PivotControls matrix from state and keep child group at origin
  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(...position)
    const mat = new THREE.Matrix4().setPosition(pos)
    if (pivotRef.current.matrix) pivotRef.current.matrix.copy(mat)
    // sphere has no rotation; keep group at identity
    if (rootRef.current) {
      rootRef.current.position.set(0, 0, 0)
      rootRef.current.quaternion.identity()
    }
  }, [position])

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
      anchor={center} // ✅ gizmo centrado geometricamente
      visible={isSelected}
      enabled={!fixed && (dragOwnerId === null || dragOwnerId === id) && creativeMode} 
      disableRotations={true}
      disableScaling={true}
      depthTest={false}
      onDragStart={() => { isDraggingRef.current = true; setIsDragging(true) }}
      onDrag={(matrix) => {
        const newPos = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [newPos.x, newPos.y, newPos.z])
      }}
      onDragEnd={() => { isDraggingRef.current = false; setIsDragging(false) }}
    >
      <group ref={rootRef} position={[0, 0, 0]}>
        <mesh
          ref={meshRef}
          userData={{ id, type: 'surface' }}
          position={[0, 0, 0]}
          // ✅ seleção adiada; ignora se outro objeto está em drag
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
          // ✅ ignora raycast se outro objeto está em drag; mantém "pass-through" de cliques
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
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={isSelected || isHovered ? 'lightblue'  : 'white'}
            transparent
            opacity={opacity}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
{(showOnlyGaussianField && showLabel)  &&(
        <Label
          position={[0, radius, 0]}
          objectName={name}
          value={`Φ = ${fluxValue.toExponential(2)} N⋅m²/C`}
          offsetY={0}
          distanceFactor={10}
        />
)}

        {isSelected && (
          <group name="sphere-normal">
            {representativeNormals.map((normal, idx) => {
              if (!sliceByPlane(normal.origin, slicePlane, slicePos, useSlice, slicePlaneFlip)) return null
              return (
                <NormalArrow
                  key={idx}
                  origin={normal.origin}
                  dir={normal.dir}
                  length={arrowLen}
                  color="red"
                  opacity={opacity}
                />
              )
            })}
          </group>
        )}
      </group>
    </PivotControls>
  )
}
