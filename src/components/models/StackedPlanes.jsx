import React, { useRef, useLayoutEffect, useEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import Label from '../ui/labels/Label'
import LayerLabel from '../ui/labels/LayerLabel'


export default function StackedPlanes({ 
  id, 
  name,
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
  spacing,
  charge_densities,
  gridDimensions,
  dimensions,
  direction,
  creativeMode,            // NEW
  planeWidth,
  planeHeight,
  rotation,
  quaternion,
  hoveredId,
  showLabel = true,
  onHideLabel,
}) {
  const isSelected = id === selectedId
  const isHovered = id === hoveredId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)

  // Use dimensions (width/height) or fallback
  const finiteWidth  = planeWidth  ?? dimensions?.[0] ?? 4
  const finiteHeight = planeHeight ?? dimensions?.[1] ?? 4
  
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
        updateObject?.(id, { planeWidth, planeHeight, quaternion: [qGroup.x, qGroup.y, qGroup.z, qGroup.w], rotation: [e.x, e.y, e.z] })
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      {/* Render a stack of planes centered at origin, spaced along local normal (Y in local space after baseEuler).
          color each plane blue if its charge density is positive, red otherwise. */}
      <group>
        {(() => {
          const planes = Array.isArray(charge_densities) && charge_densities.length > 0
            ? charge_densities
            : [charge_density ?? 0]
          const s = typeof spacing === 'number' ? spacing : 1.0
          const n = planes.length
          const center = (n - 1) / 2

          return planes.map((q, i) => {
            const offset = (i) * s
            const color = (q ?? 0) > 0 ? 'blue' : (q ?? 0) < 0 ?'red' : 'gray'
            return (
              <group key={i}>
                <mesh
                  ref={i === 0 ? meshRef : undefined}
                  rotation={baseEuler}               // lay plane flat
                  userData={{
                    id,
                    type: 'stackedPlanes',
                    idx: i,
                    charge_density: q,
                    infinite,
                    material
                  }}
                  position={[0, offset, 0]}
                  onPointerDown={(e) => {
                    if (e.button !== undefined && e.button !== 0) return
                    e.stopPropagation()
                    setSelectedId(id)
                  }}
                >
                  <planeGeometry args={[width, height, 10, 6]} />
                  <meshStandardMaterial
                    color={color}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <LayerLabel layerIndex={i} position={[width / 2 + 0.3, offset, 0]} />
              </group>
            )
          })
        })()}
      </group>
      {showLabel && (
              <Label
                objectName={name}
                value={charge_densities.map((charge, i) => `E-Field ${i + 1} = ${charge.toExponential(2)} C`)}
                offsetY={spacing * charge_densities.length / 2 + 0.8}
                distanceFactor={8 * charge_densities.length}
                objectId={id}
                onHideLabel={onHideLabel}
              />
            )}
    </PivotControls>
  )
}