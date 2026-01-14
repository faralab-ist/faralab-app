import React, { useRef, useLayoutEffect, useEffect, useMemo} from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import { efields } from '../../physics'
import * as THREE from 'three'
import Label from '../ui/labels/Label'
import LayerLabel from '../ui/labels/LayerLabel'

export default function ConcentricInfiniteWires({ 
    id, 
    name,
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
    updateObject,
    isHovered,
    radiuses,
    direction,
    rotation,
    materials,
    quaternion,
    updateDirection,
    dielectrics,
    charges,
    showLabel,
    onHideLabel,
    
}) {
    const groupRef = useRef()
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)
  const chargePerSurfaceArr = useMemo(() => {
    return efields.chargePerSphereSurface(radiuses, charges, materials, dielectrics);
  }, [radiuses, materials, dielectrics, charges])
  const trueHeight = 20

    // Sync from external state only when NOT dragging
    useEffect(() => {
      if (!groupRef.current || isDraggingRef.current) return
      groupRef.current.position.set(position[0], position[1], position[2])
    }, [position])

useEffect(() => {
    if (!direction || direction.every(d => d === 0)) {
    // Set default direction along Z axis
    updateDirection?.(id, [0, 0, 1])
    }
}, [])

  // Apply rotation from saved quaternion or direction
  useLayoutEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return

    // Prefer quaternion if available (most accurate)
    if (quaternion && quaternion.length === 4) {
      const q = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      groupRef.current.quaternion.copy(q)

      // keep direction in sync with quaternion: local Z is our "forward"
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
        const [dx = 0, dy = 0, dz = 0] = direction || []
        const eps = 1e-6
        if (Math.abs(dx - dirWorld.x) > eps || Math.abs(dy - dirWorld.y) > eps || Math.abs(dz - dirWorld.z) > eps) {
          updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
        }
      }
      return
    }

    // If rotation Euler (radians) is provided, apply it (XYZ) and keep direction in sync
    if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      groupRef.current.rotation.copy(e)
      // compute resulting forward direction (local Z) and update object if changed
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyEuler(e).normalize()
        const [dx = 0, dy = 0, dz = 0] = direction || []
        const eps = 1e-6
        if (Math.abs(dx - dirWorld.x) > eps || Math.abs(dy - dirWorld.y) > eps || Math.abs(dz - dirWorld.z) > eps) {
          updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
        }
      }
      return
    }

    // Fallback to direction vector -> quaternion using local Z as base
    if (direction) {
      const dir = new THREE.Vector3(direction[0], direction[1], direction[2])
      if (dir.lengthSq() === 0) return
      dir.normalize()
      const from = new THREE.Vector3(0, 0, 1) // use Z as cylinder "neutral" axis
      const q = new THREE.Quaternion().setFromUnitVectors(from, dir)
      groupRef.current.quaternion.copy(q)
    }
  }, [direction, quaternion, rotation, updateDirection, id])

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
      onDragStart={(axes) => {
        isDraggingRef.current = true
        setIsDragging(true)
        handleAxisDragStart(axes, position)
      }}
      onDrag={(matrix) => {
        if (!groupRef.current) return
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        const s = new THREE.Vector3()
        matrix.decompose(p, q, s)


        const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
        // Cylinder "neutral" axis is Z for our UX: rotate local Z by the gizmo quaternion
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
        updateDirection(id, [dir.x, dir.y, dir.z])
        // Save full quaternion and Euler rotation (radians) so UI rotation fields stay in sync
        const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
        updateObject?.(id, {
          quaternion: [q.x, q.y, q.z, q.w],
          rotation: [e.x, e.y, e.z]
        })
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
     <group ref={groupRef}>
        {radiuses.map((rad, i) => <group key={i}>
            <mesh
            ref={meshRef}
            userData={{
            id,
            type: 'concentricInfWires',
            }}
            position={[0, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(e) => {
                if (isDraggingRef.current) return;
            if (e.button !== undefined && e.button !== 0) return
            e.stopPropagation()
            setSelectedId(id)
            }}
        >
            <cylinderGeometry args={[rad, rad, trueHeight, 16, 1, true]} />
            <meshStandardMaterial
              color={
                isHovered
                  ? 'lightblue'
                  : ((chargePerSurfaceArr?.[i] ?? 0) > 0
                      ? 'blue'
                      : (chargePerSurfaceArr?.[i] ?? 0) < 0
                        ? 'red'
                        : 'gray')
              }
              side={THREE.DoubleSide}
              opacity={Math.exp(-0.4 * i)}
              transparent={false}
              depthWrite={true}
              clippingPlanes={clippingPlanes}
            />
        </mesh>
         {/* Show label between this layer and next layer (skip for last layer) */}
          {i < radiuses.length - 1 && (
          <LayerLabel 
            layerIndex={i} 
            position={[(radiuses[i] + radiuses[i + 1]) / 2, 0, 0]} 
            />
          )}
        </group>)}
      </group> 
       {showLabel && (
                  <Label
                    objectName={name}
                    position={groupRef.current ? groupRef.current.position.toArray() : position}
                    value={chargePerSurfaceArr.map((charge, i) => `Charge ${i + 1} = ${charge.toExponential(2)} C`)}
                    offsetY={radiuses[radiuses.length - 1] + 0.5}
                    distanceFactor={10 * radiuses.length}
                    objectId={id}
                    onHideLabel={onHideLabel}
                  />
                )}
    </PivotControls>
  )
}