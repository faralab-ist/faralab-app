import React, { useRef, useLayoutEffect, useMemo, useEffect, useState } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { calculateMagFluxThroughCircularLoop } from '../../../physics/magFieldCpu'

export default function FaradayCoil({
  objects,
  id,
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
  chargeCount = 12,
}) {
  const radialSamples = 10;
  const angularSamples = 10;

  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)
  
  // Track accumulated rotation for the charges based on EMF
  const flowOffset = useRef(0);

  // local value
  const [emfValue, setEmfValue] = useState(0);

  const glowTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;
    
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

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
      color: '#444',
      metalness: 0.8,
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
        
        const prevT = prevTimeRef.current;
        const prevFlux = prevFluxRef.current;
        const dt = Math.max(1e-6, now - prevT);
        
        const currentEmf = - (flux - prevFlux) / dt;
        
        prevFluxRef.current = flux;
        prevTimeRef.current = now;
        
        updateObject(id, { magneticFlux: flux, emf: currentEmf });
        setEmfValue(currentEmf * 1e6);
    }
    
    const speed = emfValue * 15; 
    flowOffset.current += speed * state.clock.getDelta();
  });

  const { glowColor, intensity } = useMemo(() => {
    const absEmf = Math.abs(emfValue);
    if (absEmf < 0.01) return { glowColor: new THREE.Color('#444'), intensity: 0 };

    const isPositive = emfValue >= 0;
    const c = isPositive ? new THREE.Color('#6ea8ff') : new THREE.Color('#ff6e6e');
    
    const i = Math.min(1.5, absEmf * 100); 
    return { glowColor: c, intensity: i };
  }, [emfValue]);


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
      <group ref={groupRef}>
        
        <mesh 
          geometry={coilGeom} 
          material={wireMaterial} 
          receiveShadow 
          castShadow
          onPointerDown={(e) => { e.stopPropagation(); setSelectedId && setSelectedId(id); }}
        />

        {Array.from({ length: chargeCount }).map((_, i) => {
          const angleStep = (Math.PI * 2) / chargeCount;
          const baseAngle = i * angleStep;
          
          const currentAngle = baseAngle + flowOffset.current;
          
          const x = Math.cos(currentAngle) * radius;
          const y = Math.sin(currentAngle) * radius;

          return (
            <sprite 
                key={i} 
                position={[x, y, 0]} 
                scale={[0.4, 0.4, 0.4]}
            >
              <spriteMaterial 
                map={glowTexture} 
                color={glowColor} 
                opacity={intensity}
                transparent
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
          )
        })}

      </group>
    </PivotControls>
  )
}