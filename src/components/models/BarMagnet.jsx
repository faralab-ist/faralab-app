import React, { useRef, useLayoutEffect, useMemo, useEffect, useState } from 'react'
import { PivotControls } from '@react-three/drei'
import Label from '../ui/labels/Label'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

//tecnicaly a solenoid / a bunch of spires
export default function BarMagnet({
  id,
  name,
  position,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  updateDirection,
  // removed charge/velocity, use current
  current = 1,
  length,
  radius,
  numOfCoils,
  direction = [0, 0, 1],
  rotation,
  quaternion,
  chargesPerCoil,
  pointsPerCoil,
  creativeMode,
    updateObject,
    showDebug = false,
    slicePlane,
    slicePos,
    useSlice,
    slicePlaneFlip,
    animated,
    amplitude,
    freq,
    dragOwnerId = null,
    showLabel = true,
    onHideLabel,
    segments = 24, // NEW: samples per coil curve (fixed sampling)
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)
  const clickArmed = useRef(false)

  const tmpVec = useRef(new THREE.Vector3())
  const tmpTangent = useRef(new THREE.Vector3())
  const tmpQuat = useRef(new THREE.Quaternion())
  const tmpEuler = useRef(new THREE.Euler())
  const tmpNormalMat = useRef(new THREE.Matrix3())
  const Z_VEC = useRef(new THREE.Vector3(0, 0, 1))

  const clockRef = useRef(null);
  useEffect(() => {
    if (!clockRef.current) {
      clockRef.current = new THREE.Clock();
      clockRef.current.start();
    }
  }, []);

  const animBasePosRef = useRef([position[0], position[1], position[2]]);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (animated) {
      let worldPos = null;
      if (groupRef.current) {
        groupRef.current.updateWorldMatrix(true, false);
        const tmp = new THREE.Vector3().setFromMatrixPosition(groupRef.current.matrixWorld);
        worldPos = [tmp.x, tmp.y, tmp.z];
      } else {
        worldPos = [position[0], position[1], position[2]];
      }
      animBasePosRef.current = worldPos;
      isAnimatingRef.current = true;
      clockRef.current?.start();
    } else {
      if (isAnimatingRef.current) {
        isAnimatingRef.current = false;
        clockRef.current?.stop();
      }
    }
  }, [animated, id, updateObject]);

  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return
    
    const pos = new THREE.Vector3(position[0], position[1], position[2])
    const mat = new THREE.Matrix4().setPosition(pos)
    
    if (pivotRef.current.matrix) {
      pivotRef.current.matrix.copy(mat)
    }
  }, [position])

  const catmullCurves = useMemo(() => {
    const curves = [];
    const coils = Math.max(1, Math.floor(numOfCoils || 1));
    const separation = length / Math.max(1, coils);
    const halfLength = length / 2;
    const dTheta = 2 * Math.PI / Math.max(8, pointsPerCoil);

    for (let z = -halfLength; z < halfLength; z += separation) {
      const pts = [];
      for (let theta = 0; theta < 2 * Math.PI; theta += dTheta) {
        pts.push(new THREE.Vector3(
          radius * Math.cos(theta),
          radius * Math.sin(theta),
          z + separation / 2
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      curve.closed = true;
      curves.push(curve);
    }
    return curves;
  }, [length, radius, pointsPerCoil, numOfCoils, direction, position, quaternion, rotation]);

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


    useLayoutEffect(() => {
      if (!groupRef.current || isDraggingRef.current) return
  
      if (quaternion && quaternion.length === 4) {
        const q = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
        groupRef.current.quaternion.copy(q)
  
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
  
      if (Array.isArray(rotation) && rotation.length >= 3) {
        const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
        groupRef.current.rotation.copy(e)
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
  
      if (direction) {
        const dir = new THREE.Vector3(direction[0], direction[1], direction[2])
        if (dir.lengthSq() === 0) return
        dir.normalize()
        const from = new THREE.Vector3(0, 0, 1) // use Z as cylinder "neutral" axis
        const q = new THREE.Quaternion().setFromUnitVectors(from, dir)
        groupRef.current.quaternion.copy(q)
      }
    }, [direction, quaternion, rotation, updateDirection, id])

  useEffect(() => {
    if (!Array.isArray(catmullCurves) || catmullCurves.length === 0) {
      updateObject?.(id, { charges: [], tangents: [] })
      return
    }

    const n = Math.max(1, Math.floor(segments))
    const positions = []
    const tangents = []

    for (let c = 0; c < catmullCurves.length; c++) {
      const curve = catmullCurves[c]
      if (!curve || curve.points.length === 0) continue

      for (let i = 0; i < n; i++) {
        let t
        if (curve.closed) {
          t = i / n
        } else {
          t = (n === 1) ? 0 : i / (n - 1)
        }
        const p = curve.getPointAt(t)
        const tan = curve.getTangentAt(t)
        positions.push([p.x, p.y, p.z])
        tangents.push([tan.x, tan.y, tan.z])
      }
    }

    if (groupRef.current) {
      const q = groupRef.current.quaternion
      const rotatedPositions = positions.map(p => {
        const v = new THREE.Vector3(p[0], p[1], p[2]).applyQuaternion(q)
        return [v.x, v.y, v.z]
      })
      const rotatedTangents = tangents.map(t => {
        const v = new THREE.Vector3(t[0], t[1], t[2]).applyQuaternion(q)
        return [v.x, v.y, v.z]
      })
      updateObject?.(id, { charges: rotatedPositions, tangents: rotatedTangents })
    } else {
      updateObject?.(id, { charges: positions, tangents: tangents })
    }
  }, [
    catmullCurves,
    segments,
    quaternion,
    rotation,
    direction,
    position,
    radius,
    length,
    pointsPerCoil,
    numOfCoils,
    id,
    updateObject,
  ])

  useFrame((state) => {
    if (animated && isAnimatingRef.current && !isDraggingRef.current) {
      const t = state.clock.getElapsedTime();
      const w = 2 * Math.PI * freq;
      const phase = 0;

      const worldQuat = new THREE.Quaternion();
      if (Array.isArray(quaternion) && quaternion.length === 4) {
        worldQuat.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
      } else if (Array.isArray(rotation) && rotation.length >= 3) {
        worldQuat.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'));
      } else if (Array.isArray(direction) && (direction[0] || direction[1] || direction[2])) {
        const dirVec = new THREE.Vector3(direction[0], direction[1], direction[2]).normalize();
        worldQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirVec);
      }
      const worldDir = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize();

      const disp = Math.sin(w * t + phase) * amplitude;
      const base = animBasePosRef.current;
      const newPos = new THREE.Vector3(base[0], base[1], base[2]).addScaledVector(worldDir, disp);
      updatePosition?.(id, [newPos.x, newPos.y, newPos.z]);
    }
  });

  // expose current to the scene/store
  useEffect(() => {
    updateObject?.(id, { current })
  }, [current, id, updateObject])

   const magnetization = useMemo(() => {
    if (length === 0 || numOfCoils === 0) return 0;

    // M = n×I where n is turn density (turns/length)
    // This gives magnetization in A/m (ampere-turns per meter)
    return (numOfCoils * current) / length;
  }, [numOfCoils, current, length]);

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
         {showLabel && (
                <Label
                  objectName={name}
                  value={[
                    `M = ${magnetization.toExponential(2)} A/m`,
                  ]}
                  offsetY={0.5 + radius}
                  distanceFactor={8}
                  objectId={id}
                  onHideLabel={onHideLabel}
                />
              )}
        <mesh
          ref={meshRef}
          position={[0, 0, 0]}
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            if (dragOwnerId !== null && dragOwnerId !== id) return
            clickArmed.current = true
          }}
          onPointerUp={(e) => {
            if (!clickArmed.current) return
            clickArmed.current = false
            if (dragOwnerId !== null && dragOwnerId !== id) return
            e.stopPropagation()
            setSelectedId(id)
          }}
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
          <boxGeometry args={[radius * 2.2, radius * 2.2, length * 1.1]} />
          <meshBasicMaterial visible={false} />
        </mesh>
        
        <group>
          {/* negative side (blue) - left half */}
          <mesh position={[0, 0, -(length/4)]} castShadow receiveShadow>
            <boxGeometry args={[radius * 2, radius * 2, Math.max(0.001, length / 2)]} />
            <meshStandardMaterial color={'#2e86ff'} metalness={0.6} roughness={0.35} clippingPlanes={clippingPlanes}/>
          </mesh>
          {/* positive side (red) - right half */}
          <mesh position={[0, 0, (length/4)]} castShadow receiveShadow>
            <boxGeometry args={[radius * 2, radius * 2, Math.max(0.001, length / 2)]} />
            <meshStandardMaterial color={'#ff4d4d'} metalness={0.6} roughness={0.35} clippingPlanes={clippingPlanes}/>
          </mesh>
        </group>
        {showDebug && catmullCurves.map((curve, idx) => {
          const pts = curve.getPoints(Math.max(32, pointsPerCoil * 4));
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: idx === 0 ? 'orange' : 'white' });
          const line = new THREE.Line(geom, mat);
          return <primitive key={`curve-${idx}`} object={line} />;
        })}
      </group>
      
    </PivotControls>
  )
}
