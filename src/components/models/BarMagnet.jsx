import React, { useRef, useLayoutEffect, useMemo, useEffect, useState } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export default function BarMagnet({
  id,
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
    frozen = false,
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)

  const clockRef = useRef(null);
  useEffect(() => {
    if (!clockRef.current) {
      clockRef.current = new THREE.Clock();
      clockRef.current.start();
    }
  }, []);

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
    if(catmullCurves.length === 0) return [];
    const positions = [];
    const tangents = [];
    // compute world transform (quaternion + position) to convert local curve points -> world
    const worldQuat = new THREE.Quaternion();
    if (Array.isArray(quaternion) && quaternion.length === 4) {
      worldQuat.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    } else if (Array.isArray(rotation) && rotation.length >= 3) {
      worldQuat.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'));
    } else if (Array.isArray(direction) && (direction[0] || direction[1] || direction[2])) {
      const dir = new THREE.Vector3(direction[0], direction[1], direction[2]).normalize();
      worldQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    } // else keep identity
    const offset = new THREE.Vector3(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0);

    catmullCurves.forEach((catmullCurve, index) => {
        const nCharges = Math.max(0, Math.floor(chargesPerCoil));

        if (catmullCurve.points.length === 0) return;
        if (radius <= 0) return;
        if (length <= 0) return;
        const curveLength = catmullCurve.getLength();

        const timePerLoop = curveLength / Math.max(0.1, Math.abs(velocity));
        const currLoopTime = clockRef.current ? clockRef.current.getElapsedTime() % timePerLoop : 0;
        let currLoopt = currLoopTime / timePerLoop;
        for (let i = 0; i < nCharges; i++) {
            if (velocity === 0) {
                currLoopt = 0;
            }
            let myt = (i / nCharges + currLoopt) % 1;
            myt = velocity >= 0 ? myt : (1 - myt);
            const pos = catmullCurve.getPointAt(myt);
            const tangent = catmullCurve.getTangentAt(myt);
            groupRef.current.updateWorldMatrix(true, false);

            pos.applyMatrix4(groupRef.current.matrixWorld);

            const normalMatrix = new THREE.Matrix3().getNormalMatrix(
            groupRef.current.matrixWorld
            );
            tangent.applyMatrix3(normalMatrix).normalize();

            const relX = pos.x - (position[0] ?? 0);
            const relY = pos.y - (position[1] ?? 0);
            const relZ = pos.z - (position[2] ?? 0);
            positions.push([relX, relY, relZ]);

            tangents.push([tangent.x, tangent.y, tangent.z]);
        }
    });
     updateObject?.(id, { tangents: tangents });
 
     return positions;
   };

  useFrame(() => {
    const pos = getChargePositions();
    updateObject?.(id, { charges: pos });
    setChargePositions(pos);
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
      <group ref={groupRef}>
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
        {/* debug: render each computed curve as a line */}
        {showDebug && catmullCurves.map((curve, idx) => {
          // build geometry from sampled points (memoize inside render is fine for debug)
          const pts = curve.getPoints(Math.max(32, pointsPerCoil * 4));
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: idx === 0 ? 'orange' : 'white' });
          const line = new THREE.Line(geom, mat);
          // render the THREE.Line as a primitive
          return <primitive key={`curve-${idx}`} object={line} />;
        })}
      </group>
    </PivotControls>
  )
}