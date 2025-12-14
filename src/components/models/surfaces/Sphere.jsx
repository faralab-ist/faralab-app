import React, { useRef, useEffect, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import NormalArrow from './NormalArrow'
import SphereShape from '../../../Surfaces/sphereShape'

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
  isHovered
}) {
  const isSelected = id === selectedId
  const meshRef = useRef()
  const pivotRef = useRef()
  const rootRef = useRef() // 👈 move this group, not just the mesh
  const center = useMemo(() => [0, 0, 0], [])
  const clickArmed = useRef(false)
  const shape = useMemo(() => new SphereShape({ radius }), [radius])
  const representativeNormals = useMemo(() => shape.getRepresentativeNormals(), [shape])
  const arrowLen = useMemo(() => Math.max(0.1, radius * 0.35), [radius])

  // 👇 sync world position via root group so gizmo + arrow follow
  useEffect(() => {
    if (rootRef.current) rootRef.current.position.set(...position)
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
      anchor={center} // ✅ gizmo centrado geometricamente
      visible={isSelected}
      enabled={!fixed && (dragOwnerId === null || dragOwnerId === id) && creativeMode} // 👈 ativa se não houver drag de outro
      disableRotations={true}
      disableScaling={true}
      depthTest={false}
      onDragStart={() => setIsDragging(true)}
      onDrag={(matrix) => {
        const newPos = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [newPos.x, newPos.y, newPos.z])
        if (rootRef.current) rootRef.current.position.copy(newPos) // keep gizmo + arrow together
      }}
      onDragEnd={() => setIsDragging(false)}
    >
      <group ref={rootRef} position={position}>
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
