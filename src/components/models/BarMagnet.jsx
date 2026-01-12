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
  charges,
  setCharges,
  charge,
  length,
  radius,
  numOfCoils,
  direction = [0, 0, 1],
  rotation,
  quaternion,
  chargesPerCoil,
  pointsPerCoil,
  velocity,
  creativeMode,
    updateObject,
    showDebug = false,
    slicePlane,
    slicePos,
    useSlice,
    slicePlaneFlip,
    frozen = true,
    animated,
    amplitude,
    freq,
    dragOwnerId = null,
    showLabel = true,
    onHideLabel,
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const meshRef = useRef()
  const isDraggingRef = useRef(false)
  const clickArmed = useRef(false)

  // --- small: reusable temporaries to avoid allocations every frame ---
  const tmpVec = useRef(new THREE.Vector3())
  const tmpTangent = useRef(new THREE.Vector3())
  const tmpQuat = useRef(new THREE.Quaternion())
  const tmpEuler = useRef(new THREE.Euler())
  const tmpNormalMat = useRef(new THREE.Matrix3())
  const Z_VEC = useRef(new THREE.Vector3(0, 0, 1))

  const positionsRef = useRef([])    // array of [x,y,z] (reused)
  const tangentsRef = useRef([])     // array of [x,y,z] (reused)
  const lastSetPositionsRef = useRef(null) // to compare before calling setState

  const clockRef = useRef(null);
  useEffect(() => {
    if (!clockRef.current) {
      clockRef.current = new THREE.Clock();
      clockRef.current.start();
    }
  }, []);

  // animated motion state
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
      updateObject?.(id, { frozen: true });
      clockRef.current?.start();
    } else {
      if (isAnimatingRef.current) {
        isAnimatingRef.current = false;
        updateObject?.(id, { frozen: frozen });
        clockRef.current?.stop();
      }
    }
  }, [animated, id, updateObject]);

  // stop clock when frozen
  useEffect(() => {
    if (clockRef.current) {
      if (frozen) {
        clockRef.current.stop();
      } else {
        clockRef.current.start();
      }
    }
  }, [frozen]);

  // Sync PivotControls matrix when position changes externally (preset load)
  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return

    const pos = new THREE.Vector3(position[0], position[1], position[2])
    const mat = new THREE.Matrix4().setPosition(pos)

    // Update PivotControls internal state
    if (pivotRef.current.matrix) {
      pivotRef.current.matrix.copy(mat)
    }
  }, [position])

  const [chargePositions, setChargePositions] = useState(() => Array.isArray(charges) ? charges : [])

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
    if (slicePlaneFlip) sliceFlip = 1;
    switch (slicePlane) {
      case 'xy': return [new THREE.Plane(new THREE.Vector3(0, 0, -sliceFlip), sliceFlip * slicePos)];
      case 'yz': return [new THREE.Plane(new THREE.Vector3(-sliceFlip, 0, 0), sliceFlip * slicePos)];
      case 'xz': return [new THREE.Plane(new THREE.Vector3(0, -sliceFlip, 0), sliceFlip * slicePos)];
      default: return [];
    }
  }, [slicePlane, slicePos, useSlice, slicePlaneFlip]);

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

  const getChargePositions = () => {
    const outPos = positionsRef.current
    const outTan = tangentsRef.current
    if (catmullCurves.length === 0) {
      outPos.length = 0
      outTan.length = 0
      updateObject?.(id, { tangents: outTan })
      return outPos
    }

    if (!groupRef.current) {
      outPos.length = 0
      outTan.length = 0
      updateObject?.(id, { tangents: outTan })
      return outPos
    }

    groupRef.current.updateWorldMatrix(true, false)
    const worldMatrix = groupRef.current.matrixWorld
    tmpNormalMat.current.getNormalMatrix(worldMatrix)

    if (Array.isArray(quaternion) && quaternion.length === 4) {
      tmpQuat.current.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
    } else if (Array.isArray(rotation) && rotation.length >= 3) {
      tmpEuler.current.set(rotation[0], rotation[1], rotation[2], 'XYZ')
      tmpQuat.current.setFromEuler(tmpEuler.current)
    } else if (Array.isArray(direction) && (direction[0] || direction[1] || direction[2])) {
      tmpVec.current.set(direction[0], direction[1], direction[2]).normalize()
      tmpQuat.current.setFromUnitVectors(Z_VEC.current, tmpVec.current)
    } else {
      tmpQuat.current.identity()
    }

    const elapsed = clockRef.current ? clockRef.current.getElapsedTime() : 0

    outPos.length = 0
    outTan.length = 0

    for (let c = 0; c < catmullCurves.length; c++) {
      const catmullCurve = catmullCurves[c]
      const nCharges = Math.max(0, Math.floor(chargesPerCoil || 0));
      if (nCharges === 0) continue
      if (catmullCurve.points.length === 0) continue;
      if (radius <= 0) continue;
      if (length <= 0) continue;

      const curveLength = catmullCurve.getLength();
      const timePerLoop = curveLength / Math.max(0.1, Math.abs(velocity));
      const currLoopTime = clockRef.current ? clockRef.current.getElapsedTime() % timePerLoop : 0;
      let currLoopt = currLoopTime / timePerLoop;

      for (let i = 0; i < nCharges; i++) {
        if (velocity === 0) currLoopt = 0;
        let myt = (i / nCharges + currLoopt) % 1;
        myt = velocity >= 0 ? myt : (1 - myt);

        catmullCurve.getPointAt(myt, tmpVec.current)
        catmullCurve.getTangentAt(myt, tmpTangent.current)

        tmpVec.current.applyMatrix4(worldMatrix)
        tmpTangent.current.applyMatrix3(tmpNormalMat.current).normalize()

        const idx = outPos.length
        if (outPos[idx]) {
          outPos[idx][0] = tmpVec.current.x - (position[0] ?? 0)
          outPos[idx][1] = tmpVec.current.y - (position[1] ?? 0)
          outPos[idx][2] = tmpVec.current.z - (position[2] ?? 0)
        } else {
          outPos[idx] = [tmpVec.current.x - (position[0] ?? 0),
          tmpVec.current.y - (position[1] ?? 0),
          tmpVec.current.z - (position[2] ?? 0)]
        }

        if (outTan[idx]) {
          outTan[idx][0] = tmpTangent.current.x
          outTan[idx][1] = tmpTangent.current.y
          outTan[idx][2] = tmpTangent.current.z
        } else {
          outTan[idx] = [tmpTangent.current.x, tmpTangent.current.y, tmpTangent.current.z]
        }

        outPos.length = idx + 1
        outTan.length = idx + 1
      }
    }

    updateObject?.(id, { tangents: outTan })
    return outPos
  };

  const positionsEqual = (a, b) => {
    if (a === b) return true
    if (!a || !b) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      const ai = a[i], bi = b[i]
      if (!ai || !bi) return false
      if (ai.length !== 3 || bi.length !== 3) return false
      // small epsilon to avoid float jitter triggering state updates
      if (Math.abs(ai[0] - bi[0]) > 1e-6 || Math.abs(ai[1] - bi[1]) > 1e-6 || Math.abs(ai[2] - bi[2]) > 1e-6) return false
    }
    return true
  }

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

    const pos = getChargePositions()

    updateObject?.(id, { charges: pos })

    const last = lastSetPositionsRef.current
    if (!positionsEqual(last, pos)) {
      setChargePositions(pos)
      lastSetPositionsRef.current = pos.slice()
    }
  });

  const magnetization = useMemo(() => {
    if (radius === 0 || length === 0) return 0;
    if (!charge || !chargesPerCoil || !velocity) return 0;

    return (numOfCoils * charge * chargesPerCoil * Math.abs(velocity)) /
      (2 * Math.PI * radius * length);
  }, [numOfCoils, charge, chargesPerCoil, velocity, radius, length]);

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
          />
        )}
        {/* Invisible hitbox for selection */}
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
          <mesh position={[0, 0, -(length / 4)]} castShadow receiveShadow>
            <boxGeometry args={[radius * 2, radius * 2, Math.max(0.001, length / 2)]} />
            <meshStandardMaterial color={'#2e86ff'} metalness={0.6} roughness={0.35} clippingPlanes={clippingPlanes} />
          </mesh>
          {/* positive side (red) - right half */}
          <mesh position={[0, 0, (length / 4)]} castShadow receiveShadow>
            <boxGeometry args={[radius * 2, radius * 2, Math.max(0.001, length / 2)]} />
            <meshStandardMaterial color={'#ff4d4d'} metalness={0.6} roughness={0.35} clippingPlanes={clippingPlanes} />
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
