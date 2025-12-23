import React, { useRef, useLayoutEffect, useEffect, useMemo} from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import Label from '../ui/labels/Label'

export default function Sphere({ 
  id, 
  position, 
  charge_density,
  material,
  selectedId, 
  setSelectedId, 
  setIsDragging,
  updatePosition,
  updateDirection,
  updateChargeDensity,
  radius,
  isHollow = false,
  slicePlane,
  slicePlaneFlip,
  slicePos,
  useSlice,
  creativeMode,        
  isHovered,
  showLabel = true
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)

  // Base (static) rotation to lay the plane flat on XZ (normal initially +Y)
  const baseEuler = new THREE.Euler(-Math.PI / 2, 0, 0)
  const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler)
  const localNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(baseQuat) // becomes (0,1,0)

  // Ensure direction is correct when the plane is created (before any dragging)
  useEffect(() => {
    const n = localNormal.clone().normalize() // (0,1,0)
    updateDirection(id, [n.x, n.y, n.z])
  }, [id, updateDirection])

  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(...position)
    const mat = new THREE.Matrix4().setPosition(pos)
    if (pivotRef.current.matrix) pivotRef.current.matrix.copy(mat)
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
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected}   // CHANGED
      disableScaling={true}
      disableRotations={true}
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
          position={position}
          name="Volume Density"
          value={`${charge_density.toExponential(2)} C/m³`}
          offsetY={radius + 0.5}
          distanceFactor={10}
        />
      )}
      <mesh
        ref={meshRef}
        rotation={baseEuler}               // lay plane flat
        userData={{
          id,
          type: 'chargedSphere',
          charge_density,
          material
        }}
        position={[0, 0, 0]}
        onClick={(e) => {
            if (isDraggingRef.current) return;
          if (e.button !== undefined && e.button !== 0) return
          e.stopPropagation()
          setSelectedId(id)
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={isSelected || isHovered ? 'lightblue' : 'lightgreen'}
          side={THREE.DoubleSide}
          opacity={0.7}
          transparent={true}
          depthWrite={false}
        clippingPlanes={clippingPlanes}
        />
      </mesh>
    </PivotControls>
  )
}