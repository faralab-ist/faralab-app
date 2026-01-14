import React, { useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import { efields } from '../../physics'
import * as THREE from 'three'
import Label from '../ui/labels/Label'
import LayerLabel from '../ui/labels/LayerLabel'

// Define appearance for materials
const MATERIAL_COLORS = {
  conductor: '#F59E0B', // Gold/Amber-ish for conductors
  dielectric: '#94A3B8', // Blue-ish Grey for dielectrics
}

const MATERIAL_PROPS = {
  conductor: { metalness: 0.7, roughness: 0.2 },
  dielectric: { metalness: 0.1, roughness: 0.8 },
}

export default function ConcentricSpheres({
  id,
  position,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  slicePlane,
  slicePlaneFlip,
  slicePos,
  useSlice,
  creativeMode,
  isHovered,
  radiuses,
  materials,
  dielectrics,
  charges,
  name,
  showLabel = true,
  onHideLabel,
  updateObject
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const isDraggingRef = useRef(false)

  const chargePerSphereSurfaceArr = useMemo(() => {
    return efields.chargePerSphereSurface(radiuses, charges, materials, dielectrics)
  }, [radiuses, materials, dielectrics, charges])

  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(...position)
    const mat = new THREE.Matrix4().setPosition(pos)
    if (pivotRef.current.matrix) pivotRef.current.matrix.copy(mat)
  }, [position])

  const clippingPlanes = useMemo(() => {
    if (!useSlice) return []
    let sliceFlip = -1
    if (slicePlaneFlip) sliceFlip = 1
    switch (slicePlane) {
      case 'xy':
        return [new THREE.Plane(new THREE.Vector3(0, 0, -sliceFlip), sliceFlip * slicePos)]
      case 'yz':
        return [new THREE.Plane(new THREE.Vector3(-sliceFlip, 0, 0), sliceFlip * slicePos)]
      case 'xz':
        return [new THREE.Plane(new THREE.Vector3(0, -sliceFlip, 0), sliceFlip * slicePos)]
      default:
        return []
    }
  }, [slicePlane, slicePos, useSlice, slicePlaneFlip])

  // Store label info for Data sidebar
  useEffect(() => {
    const labelInfo = chargePerSphereSurfaceArr.map(
      (charge, i) => `E-Field ${i + 1} = ${charge.toExponential(2)} C`
    )
    updateObject?.(id, { labelInfo })
  }, [chargePerSphereSurfaceArr, id, updateObject])

  // Helper handler for clicks to avoid code duplication
  const handleMeshClick = (e) => {
    if (isDraggingRef.current) return
    if (e.button !== undefined && e.button !== 0) return
    e.stopPropagation()
    setSelectedId(id)
  }

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected}
      disableScaling={true}
      disableRotations={true}
      onDragStart={(axes) => {
        isDraggingRef.current = true
        setIsDragging(true)
        handleAxisDragStart(axes, position)
      }}
      onDrag={(matrix) => {
        const pWorld = new THREE.Vector3()
        const qGroup = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(pWorld, qGroup, s)
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      {radiuses.map((rad, i) => {
        const matType = materials?.[i] || 'dielectric';
        const matColor = MATERIAL_COLORS[matType];
        const matPhys = MATERIAL_PROPS[matType];

        return (
          <group key={i}>
            {/* 1. Material Fill Mesh (The solid volume between layers) */}
            <mesh
              position={[0, 0, 0]}
              onClick={handleMeshClick}
              userData={{ id, type: 'concentricSpheres-fill' }}
            >
              <sphereGeometry args={[rad * 0.999, 32, 32]} />
              <meshStandardMaterial
                color={matColor}
                {...matPhys}
                side={THREE.DoubleSide} // Ensures inside of shell is visible when sliced
                clippingPlanes={clippingPlanes}
              />
            </mesh>

            {/* 2. Surface Field Mesh (The Red/Blue/Gray Skin) */}
            <mesh
              userData={{ id, type: 'concentricSpheres' }}
              position={[0, 0, 0]}
              onClick={handleMeshClick}
            >
              <sphereGeometry args={[rad, 32, 32]} />
              <meshStandardMaterial
                color={
                  (chargePerSphereSurfaceArr?.[i] ?? 0) > 0 ? 'blue'
                  : (chargePerSphereSurfaceArr?.[i] ?? 0) < 0 ? 'red'
                  : 'gray'
                }
                side={THREE.DoubleSide}
                // Adjust opacity logic if you want the fill to be more visible through the surface
                opacity={Math.exp(-0.4 * i)} 
                transparent={false} // If this is false, opacity prop is ignored. Change to true if you want transparency.
                depthWrite={true}
                clippingPlanes={clippingPlanes}
                wireframe={false} // You could set this to true if you only want a wireframe cage over the solid fill
              />
            </mesh>
              {/* Show label between this layer and next layer (skip for last layer) */}
            {i < radiuses.length - 1 && (
              <LayerLabel 
                layerIndex={i} 
                position={[(radiuses[i] + radiuses[i + 1]) / 2, 0, 0]} 
              />
            )}
          </group>
        )
      })}

      {showLabel && (
        <Label
          objectName={name}
          value={chargePerSphereSurfaceArr.map(
            (charge, i) => `E-Field ${i + 1} = ${charge.toExponential(2)} C`
          )}
          offsetY={radiuses[radiuses.length - 1] + 0.5}
          distanceFactor={10 * radiuses.length}
          objectId={id}
          onHideLabel={onHideLabel}
        />
      )}
    </PivotControls>
  )
}