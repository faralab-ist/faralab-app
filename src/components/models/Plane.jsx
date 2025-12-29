import React, { useRef, useLayoutEffect, useEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import Label from '../ui/labels/Label'


function Plane({ 
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
  direction,
  creativeMode,           
  dimensions,
  rotation,
  quaternion,
  isHovered,
  showLabel = true,
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)

  // Use dimensions (width/height) or fallback
  const finiteWidth  = dimensions?.[0]
  const finiteHeight = dimensions?.[1]
  
  const width  = infinite ? 20 : finiteWidth
  const height = infinite ? 20 : finiteHeight

  // Base (static) rotation to lay the plane flat on XZ (normal initially +Y)
  const baseEuler = new THREE.Euler(-Math.PI / 2, 0, 0)
  const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler)
  const localNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(baseQuat) // becomes (0,1,0)

  // Calculate initial rotation from direction prop (if provided)
  const initialRotation = React.useMemo(() => {
    if (!direction || (direction[0] === 0 && direction[1] === 1 && direction[2] === 0)) {
      // Default orientation (normal pointing up)
      return new THREE.Quaternion()
    }
    
    // Calculate rotation needed to align localNormal with direction
    const targetNormal = new THREE.Vector3(...direction).normalize()
    const defaultNormal = new THREE.Vector3(0, 1, 0) // after baseEuler is applied
    const rotationQuat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, targetNormal)
    
    return rotationQuat
  }, [direction])

  // Ensure direction is correct when the plane is created (before any dragging)
  useEffect(() => {
    if (!direction) {
      const n = localNormal.clone().normalize() // (0,1,0)
      updateDirection(id, [n.x, n.y, n.z])
    }
  }, [id, updateDirection, direction])

  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(...position)
    const mat = new THREE.Matrix4().setPosition(pos)
    // Determine rotation quaternion to apply (priority: quaternion prop -> rotation Euler -> direction -> initialRotation)
    let rotQuat = new THREE.Quaternion()
    if (Array.isArray(quaternion) && quaternion.length === 4) {
      rotQuat.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      // keep direction in sync with quaternion (local Z after baseQuat)
      if (typeof updateDirection === 'function') {
        const dirWorld = localNormal.clone().applyQuaternion(rotQuat).normalize()
        updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
      }
    } else if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      rotQuat.setFromEuler(e)
      if (typeof updateDirection === 'function') {
        const dirWorld = localNormal.clone().applyQuaternion(rotQuat).normalize()
        updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
      }
    } else if (direction && !(direction[0] === 0 && direction[1] === 1 && direction[2] === 0)) {
      const targetNormal = new THREE.Vector3(...direction).normalize()
      const defaultNormal = new THREE.Vector3(0, 1, 0)
      rotQuat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, targetNormal)
    } else {
      rotQuat = initialRotation
    }

    // apply rotation
    mat.multiply(new THREE.Matrix4().makeRotationFromQuaternion(rotQuat))
    if (pivotRef.current.matrix) pivotRef.current.matrix.copy(mat)
  }, [position, initialRotation, rotation, quaternion, direction, updateDirection, id])

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected}   // CHANGED
      disableScaling={true}
      onDragStart={(axes) => {
        isDraggingRef.current = true
        setIsDragging(true)
        handleAxisDragStart(axes, position)
      }}
      onDrag={(matrix) => {
        // Decompose pivot/world transform
        const pWorld = new THREE.Vector3()
        const qGroup = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(pWorld, qGroup, s)

        // World normal = group rotation * base (flatten) rotation * local Z axis
        const worldNormal = localNormal.clone().applyQuaternion(qGroup).normalize()
        updateDirection(id, [worldNormal.x, worldNormal.y, worldNormal.z])

        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])

        // persist quaternion + Euler rotation (radians) so UI stays in sync
        const e = new THREE.Euler().setFromQuaternion(qGroup, 'XYZ')
        updateObject?.(id, { width, height, quaternion: [qGroup.x, qGroup.y, qGroup.z, qGroup.w], rotation: [e.x, e.y, e.z] })
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      {showLabel && (
        <Label  
          name="Surface Density"
          value={`${charge_density.toExponential(2)} C/m²`}
          offsetY={0.5}
          distanceFactor={12}
        />
      )}
      <mesh
        ref={meshRef}
        rotation={baseEuler}               // lay plane flat
        userData={{
          id,
          type: 'plane',
          charge_density,
          infinite,
          material
        }}
        position={[0, 0, 0]}
        onPointerDown={(e) => {
          if (e.button !== undefined && e.button !== 0) return
          e.stopPropagation()
          setSelectedId(id)
        }}
      >
        <planeGeometry args={[width, height, 10, 6]} />
        <meshStandardMaterial
          color={isSelected || isHovered ? 'lightblue' : 'lightgreen'}
          side={THREE.DoubleSide}
        />
      </mesh>
    </PivotControls>
  )
}

export default Plane