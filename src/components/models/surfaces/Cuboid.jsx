import React, { useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import NormalArrow from './NormalArrow'
import CuboidShape from '../../../Surfaces/cuboidShape'

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

export default function Cuboid({
  id,
  position,
  width = 2,
  height = 2,
  depth = 2,
  opacity = 0.5,
  name,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  fixed = false,
  isDragging = false,
  dragOwnerId = null,
  creativeMode,
  slicePlane,
  slicePos,
  useSlice,
  slicePlaneFlip,
  // rotation support (optional)
  rotation= [0,0,0],
  quaternion,
  updateObject,
  isHovered,
  // flux value
  fluxValue = 0,
  showOnlyGaussianField,
  showLabel = true,
}) {
  const isSelected = id === selectedId
  const meshRef = useRef()
  const pivotRef = useRef()
  const rootRef = useRef()                 
  const isDraggingRef = useRef(false)
  const center = useMemo(() => [0, 0, 0], [])
  const clickArmed = useRef(false) 

  // Sync PivotControls matrix from state (one-way: state → Three.js)
  // Child group stays at origin - PivotControls handles all transformation
  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current || !rootRef.current) return
    
    const pos = new THREE.Vector3(...position)
    let rotQuat = new THREE.Quaternion()
    
    // Prefer quaternion over Euler angles
    if (Array.isArray(quaternion) && quaternion.length === 4) {
      rotQuat.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
    } else if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      rotQuat.setFromEuler(e)
    }
    
    const mat = new THREE.Matrix4()
      .makeTranslation(pos.x, pos.y, pos.z)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(rotQuat))
    
    pivotRef.current.matrix.copy(mat)
    rootRef.current.quaternion.copy(rotQuat) // Sync child group rotation for normals
  }, [position, rotation, quaternion])

  const cuboid = useMemo(() => new CuboidShape({ width, height, depth }), [width, height, depth])
  const faceNormals = useMemo(() => cuboid.getFaceNormals(), [cuboid])

  const arrowLen = useMemo(
    () => Math.max(0.1, Math.min(width, height, depth) * 0.35),
    [width, height, depth]
  )

  const clippingPlanes = useMemo(() => {
    if (!useSlice) return [];
      let sliceFlip = -1;
      if(slicePlaneFlip) sliceFlip = 1;
      switch (slicePlane) {
      case 'xy': return [new THREE.Plane(new THREE.Vector3(0, 0, -sliceFlip), sliceFlip * slicePos)]; // nao sei porque tem de multiplicar
      case 'yz': return [new THREE.Plane(new THREE.Vector3(-sliceFlip, 0, 0), sliceFlip * slicePos)]; // por -sliceFlip ???
      case 'xz': return [new THREE.Plane(new THREE.Vector3(0, -sliceFlip, 0), sliceFlip * slicePos)];
      default: return [];
    }
  }, [slicePlane, slicePos, useSlice, slicePlaneFlip]);

  return (
    <PivotControls
      ref={pivotRef}
      scale={0.86}
      lineWidth={2.5}
      anchor={center}
      visible={isSelected}
      enabled={!fixed && (!isDragging || dragOwnerId === id) && creativeMode}
      disableScaling={true}
      depthTest={false}
      onDragStart={() => { isDraggingRef.current = true; setIsDragging(true) }}
      onDrag={(matrix) => {
        const newPos = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [newPos.x, newPos.y, newPos.z])
        // persist rotation/quaternion from the pivot's world transform so the sidebar stays in sync
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(p, q, s)
        const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
        updateObject?.(id, { quaternion: [q.x, q.y, q.z, q.w], rotation: [e.x, e.y, e.z] })
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
            // se outro objeto já está em drag, ignore
            if (isDragging && dragOwnerId !== id) return
            clickArmed.current = true
          }}
          onPointerUp={(e) => {
            if (!clickArmed.current) return
            clickArmed.current = false
            // se houve drag no meio, não seleciona
            if (isDragging && dragOwnerId !== id) return

            if (!fixed) e.stopPropagation()
            setSelectedId(id)
          }}
          // Evita que a superfície intercepte cliques enquanto outro objeto está em drag
          raycast={(raycaster, intersects) => {
            if (!meshRef.current) return
            if (isDragging && dragOwnerId !== id) return
            const hitsBefore = intersects.length
            THREE.Mesh.prototype.raycast.call(meshRef.current, raycaster, intersects)
            if (intersects.length > hitsBefore + 1) {
              intersects.splice(hitsBefore, 1)
            }
          }}
        >
          <boxGeometry args={[width, height, depth]} />
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
    {(showOnlyGaussianField && showLabel) && (
        <Label
          position={[0, (height / 2) + 0.5, 0]}
          objectName={name}
          value={`${fluxValue.toExponential(2)} N⋅m²/C`}
          offsetY={0.5}
          distanceFactor={10}
        />
)}
        {isSelected && (
          <group name="cuboid-normals">
            {faceNormals.map((n, i) => {
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
