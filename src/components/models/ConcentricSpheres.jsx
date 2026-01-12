import React, { useRef, useLayoutEffect, useMemo} from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import { efields } from '../../physics'
import * as THREE from 'three'
import Label from '../ui/labels/Label'
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
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)
  const chargePerSphereSurfaceArr = useMemo(() => {
    return efields.chargePerSphereSurface(radiuses, charges, materials, dielectrics);
  }, [radiuses, materials, dielectrics, charges])

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
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      {radiuses.map((rad, i) => <mesh
         key={i}
         ref={meshRef}
        userData={{
          id,
          type: 'concentricSpheres',
        }}
        position={[0, 0, 0]}
        onClick={(e) => {
            if (isDraggingRef.current) return;
          if (e.button !== undefined && e.button !== 0) return
          e.stopPropagation()
          setSelectedId(id)
        }}
      >
        <sphereGeometry args={[rad, 32, 32]} />
        <meshStandardMaterial
          color={
            (chargePerSphereSurfaceArr?.[i] ?? 0) > 0 ? 'blue'
            : (chargePerSphereSurfaceArr?.[i] ?? 0) < 0 ? 'red'
            : 'gray'
          }
          side={THREE.DoubleSide}
          opacity={Math.exp(-0.4 * i)}
          transparent={false}
          depthWrite={true}
          clippingPlanes={clippingPlanes}
        />
      </mesh>)}
       {showLabel && (
            <Label
              objectName={name}
              value={chargePerSphereSurfaceArr.map((charge, i) => `E-Field${i + 1} = ${charge.toExponential(2)} C`)}
              offsetY={radiuses[radiuses.length - 1] + 0.5}
              distanceFactor={10 * radiuses.length}
              objectId={id}
              onHideLabel={onHideLabel}
            />
          )}
    </PivotControls>
  )
}