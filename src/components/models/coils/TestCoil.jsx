import React, { useRef, useLayoutEffect, useMemo, useEffect, useState } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { calculateMagFluxThroughCircularLoop } from '../../../physics/magFieldCpu'
import { calculateEFluxThroughCircularLoop } from '../../../physics/electricFieldCpu'
import Label from '../../ui/labels/Label'

export default function TestCoil({
  objects,
  id,
  name,
  position,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  updateDirection,
  radius = 2,
  direction = [0, 0, 1],
  rotation,
  quaternion,
  creativeMode,
  updateObject,
  tubeRadius = 0.05,
  showLabel = true,
  onHideLabel,
}) {
  const radialSamples = 10;
  const angularSamples = 10;

  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)
  
  const coilGeom = useMemo(() => {
    return new THREE.TorusGeometry(
      Math.max(0.001, radius),
      Math.max(0.01, tubeRadius),
      12, 
      64
    );
  }, [radius, tubeRadius]);

  const wireMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      metalness: 0.5,
      roughness: 0.2,
    });
  }, []);

  // Clean up
  useEffect(() => {
    return () => {
      try { coilGeom.dispose() } catch (e) {}
      try { wireMaterial.dispose() } catch (e) {}
    };
  }, [coilGeom, wireMaterial]);

  // Sync PivotControls matrix
  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    const pos = new THREE.Vector3(position[0], position[1], position[2])
    const mat = new THREE.Matrix4().setPosition(pos)
    if (pivotRef.current.matrix) {
      pivotRef.current.matrix.copy(mat)
    }
  }, [position])

  // Handle Rotation/Orientation
  useLayoutEffect(() => {
    if (!groupRef.current || isDraggingRef.current) return

    if (quaternion && quaternion.length === 4) {
      const q = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      groupRef.current.quaternion.copy(q)
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
        updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
      }
      return
    }

    if (Array.isArray(rotation) && rotation.length >= 3) {
      const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
      groupRef.current.rotation.copy(e)
      if (typeof updateDirection === 'function') {
        const dirWorld = new THREE.Vector3(0, 0, 1).applyEuler(e).normalize()
        updateDirection(id, [dirWorld.x, dirWorld.y, dirWorld.z])
      }
      return
    }

    if (direction) {
      const dir = new THREE.Vector3(direction[0], direction[1], direction[2])
      if (dir.lengthSq() === 0) return
      dir.normalize()
      const from = new THREE.Vector3(0, 0, 1)
      const q = new THREE.Quaternion().setFromUnitVectors(from, dir)
      groupRef.current.quaternion.copy(q)
    }
  }, [direction, quaternion, rotation, updateDirection, id])

  const prevFluxRef = useRef(0);
  const prevTimeRef = useRef(0);
  const lastSampleRef = useRef(0);
  const sampleInterval = 0.05;

  const [displayFlux, setDisplayFlux] = useState(null);
  const [displayEmf, setDisplayEmf] = useState(null);
  const [displayEFlux, setDisplayEFlux] = useState(null);

   useFrame((state) => {
     const now = state.clock.getElapsedTime();
     
     if (now - lastSampleRef.current > sampleInterval) {
        lastSampleRef.current = now;
        
        const flux = calculateMagFluxThroughCircularLoop(
            position,
            direction,
            radius,
            radialSamples,
            angularSamples,
            objects,
        );

        const eFlux = calculateEFluxThroughCircularLoop(
            position,
            direction,
            radius,
            radialSamples,
            angularSamples,
            objects,
        );
        
        setDisplayEFlux(eFlux);

        const prevT = prevTimeRef.current;
        const prevFlux = prevFluxRef.current;
        const dt = Math.max(1e-6, now - prevT);
        
        const currentEmf = - (flux - prevFlux) / dt;
        
        prevFluxRef.current = flux;
        prevTimeRef.current = now;
         
        setDisplayFlux(flux);
        setDisplayEmf(currentEmf);
        updateObject(id, { magneticFlux: flux, emf: currentEmf, electricFlux: eFlux });
     }
   });
 
  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected}
      disableScaling
      disableRotations
      onDragStart={(axes) => {
        isDraggingRef.current = true
        setIsDragging(true)
        handleAxisDragStart(axes, position)
      }}
      onDrag={(matrix) => {
        const pWorld = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [pWorld.x, pWorld.y, pWorld.z])
      }}
      onDragEnd={() => {
        isDraggingRef.current = false
        setIsDragging(false)
      }}
      scale={0.86}
      lineWidth={2.5}
    >
      {/* Store label info for Data sidebar */}
      {React.useMemo(() => {
        updateObject?.(id, {
          labelInfo: [
            `B-Flux = ${displayFlux != null ? displayFlux.toExponential(2) : '—'} Wb`,
            `ε: ${displayEmf != null ? displayEmf.toExponential(2) + ' V' : '—'}`,
            `E-Flux = ${displayEFlux != null ? displayEFlux.toExponential(2) : '—'} V·m`,
          ]
        })
        return null
      }, [displayFlux, displayEmf, displayEFlux, id, updateObject])}

      {showLabel &&  <Label
        position={[0, 0, 0]}
        objectName={name}
        value={[
          `B-Flux = ${displayFlux != null ? displayFlux.toExponential(3) : '—'} Wb`,
          `ε: ${displayEmf != null ? displayEmf.toExponential(3) + ' V' : '—'}`,
          `E-Flux = ${displayEFlux != null ? displayEFlux.toExponential(3) : '—'} V·m`,
        ]}
        offsetY={radius + 0.2}
        distanceFactor={8}
        objectId={id}
        onHideLabel={onHideLabel}
      />}
      <group ref={groupRef}>
        <mesh 
          geometry={coilGeom} 
          material={wireMaterial} 
          receiveShadow 
          castShadow
          onPointerDown={(e) => { e.stopPropagation(); setSelectedId && setSelectedId(id); }}
        />
      </group>
    </PivotControls>
  )
}