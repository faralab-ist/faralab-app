import React, { useRef, useLayoutEffect, useMemo, useEffect, useState } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import Label from '../ui/labels/Label'

export default function Path({
  id,
  position,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  points,
  charges,
  setCharges,
  chargeCount,
  charge,
  velocity,
  creativeMode,
  updateObject,
  isClosedPath,
  isChild,
  renderCharges = true,
  renderPoints = true,
  parentRotation,
  parentQuaternion,
  groupRef: parentGroupRef,
  showLabel = true,
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)
  const glowRef = useRef()

  const clockRef = useRef(null);
  useEffect(() => {
    if (!clockRef.current) {
      clockRef.current = new THREE.Clock();
      clockRef.current.start();
    }
  }, []);

  // compute glow color and base scale from charge
  const { glowColor, baseGlowScale, glowIntensity } = useMemo(() => {
    const sign = charge >= 0 ? 1 : -1
    // positive -> blue, negative -> red
    const glowColor = sign >= 0 ? new THREE.Color(0x6ea8ff) : new THREE.Color(0xff6e6e)
    const magnitude = Math.min(4, Math.max(0.2, Math.abs(charge)))
    const baseGlowScale = 1 + magnitude * 0.6
    const glowIntensity = 0.6 + Math.min(2.0, Math.abs(charge) * 0.15)
    return { glowColor, baseGlowScale, glowIntensity }
  }, [charge])

  // apply static glow (no pulsing) — user requested no inner sphere and no pulsing
  useLayoutEffect(() => {
    if (!glowRef.current) return
    // scale tightly around the intended visual radius
    glowRef.current.scale.setScalar(baseGlowScale)
    if (glowRef.current.material) {
      // make the sprite visually very intense in the center (white) and strong overall
      glowRef.current.material.opacity = Math.min(1, 0.65 + Math.abs(charge) * 0.22)
      glowRef.current.material.color.set(glowColor)
    }
  }, [baseGlowScale, glowColor, charge])

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

  // Precompute a single visual for charges (all charges use global `charge` value)
  const chargeVisual = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const cx = size / 2
    const cy = size / 2
    const r = size / 2
    const color = (charge >= 0) ? 'rgba(110,168,255,' : 'rgba(255,110,110,'
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0.0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.06, `${color}0.95)`)
    grad.addColorStop(0.18, `${color}0.75)`)
    grad.addColorStop(0.45, `${color}0.22)`)
    grad.addColorStop(1.0, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter

    const magnitude = Math.min(4, Math.max(0.2, Math.abs(charge)))
    const baseGlowScale = 1 + magnitude * 0.6
    const opacity = Math.min(1, 0.65 + Math.abs(charge) * 0.22)
    return { tex, scale: baseGlowScale, opacity, charge }
  }, [charge])

  const catmullCurve = useMemo(() => {
    if (!Array.isArray(points) || points.length < 2) {
      return new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0.01,0.01,0.01)]);
    }
    const pts = points.map(pt => {
      const p = Array.isArray(pt) ? pt : [0, 0, 0]
      return new THREE.Vector3(p[0], p[1], p[2])
    })
    //remove duplicate points 
    const uniquePts = pts.filter((v, i, a) => a.findIndex(t => t.equals(v)) === i);
    if (uniquePts.length < 2) {
      return new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0.01,0.01,0.01)]);
    }

    let curve = new THREE.CatmullRomCurve3(uniquePts);
    curve.closed = isClosedPath;
    //console.log("is closed: ", curve.closed);
    return curve;
  }, [points, isClosedPath]);

  const curvePoints = useMemo(() => {
    if (!Array.isArray(points) || points.length < 2) {
      return [];
    }
    const divisions = Math.max(10, points.length * 10);
    return catmullCurve.getPoints(divisions);
  }, [catmullCurve, points]);

  const curveGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(curvePoints);
    return geom;
  }, [curvePoints]);

  const curveMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({ color: 'gray' });
  }, []);

  // Calculate electric current: I = Q/t = (total charge) × (frequency)
  // Current = charge × chargeCount × (velocity / path_length)
  // NÃO SE ISTO TA BEM XD 
  const electricCurrent = useMemo(() => {
    if (!catmullCurve || velocity === 0) return 0;
    const curveLength = catmullCurve.getLength();
    if (curveLength === 0) return 0;
    // I = (charge per particle) × (number of particles) × (loops per second)
    // loops per second = velocity / curveLength
    return Math.abs(charge * chargeCount * velocity / curveLength);
  }, [charge, chargeCount, velocity, catmullCurve]);

  const getChargePositions = () => {
    if (points?.length < 2) return [];
    const positions = [];
    const tangents = [];
    const nCharges = Math.max(0, Math.floor(chargeCount));
    const curveLength = catmullCurve.getLength();
    //console.log(catmullCurve.points)

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
        tangents.push([tangent.x, tangent.y, tangent.z]);
        positions.push([pos.x, pos.y, pos.z]);
    }
    // Note: tangents are now updated in useFrame to include rotation

    return positions;
  };

  useFrame(() => {
    const pos = getChargePositions();
    //console.log(pos)
    
    // If this is a child of a rotated parent (like a coil), apply parent's rotation

    const curveLength = catmullCurve.getLength();
    const nCharges = pos.length;
    const timePerLoop = curveLength / Math.max(0.1, Math.abs(velocity));
    const currLoopTime = clockRef.current ? clockRef.current.getElapsedTime() % timePerLoop : 0;
    let currLoopt = currLoopTime / timePerLoop;
    if (isChild && parentGroupRef?.current) {
      //console.log("aaaaa")
      const parentQuat = parentGroupRef.current.quaternion;
      
      // Transform charge positions and tangents by parent rotation
      const rotatedPositions = pos.map(p => {
        const vec = new THREE.Vector3(p[0], p[1], p[2]);
        vec.applyQuaternion(parentQuat);
        return [vec.x, vec.y, vec.z];
      });
      
      // Get tangents from the current frame
      const tangents = [];
      const nCharges = pos.length;
      for (let i = 0; i < nCharges; i++) {
        let t = (i / nCharges + currLoopt) % 1;
        t = velocity >= 0 ? t : (1 - t);
        const tangent = catmullCurve.getTangentAt(t);
        //console.log("Original tangent:", tangent);
        const rotatedTangent = tangent.clone().applyQuaternion(parentQuat);
        tangents.push([rotatedTangent.x, rotatedTangent.y, rotatedTangent.z]);
      }
  
      // Store in local state instead of updating parent on every frame
      setChargePositions(rotatedPositions);
    } else {
  
      // Original behavior for non-rotated paths
      const tangents = [];
      const nCharges = pos.length;
      for (let i = 0; i < nCharges; i++) {
        let t = (i / nCharges + currLoopt) % 1;
        t = velocity >= 0 ? t : (1 - t);
        const tangent = catmullCurve.getTangentAt(t);
        //console.log("Tangent:", tangent);
        tangents.push([tangent.x, tangent.y, tangent.z]);
      }
      updateObject?.(id, { charges: pos, tangents: tangents });
    }
    setChargePositions(pos);
  });

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected && !isChild}   // CHANGED
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
      {showLabel && (
        <Label
          
          name="Electrical Current"
          value={`${electricCurrent.toExponential(2)} A`}
          offsetY={0.5}
        />
      )}
      <group ref={groupRef}>
        {/* debug points for path */}
        {renderPoints && points?.map((pt, i) => {
          const pos = Array.isArray(pt) ? pt : [0, 0, 0]
          return (
            <mesh
              key={`pt-${i}`}
              position={[pos[0], pos[1], pos[2]]}
              onPointerDown={(e) => {
                if (e.button !== undefined && e.button !== 0) return
                e.stopPropagation()
                setSelectedId(id)
              }}
            >
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color={'gray'} />
            </mesh>
          )
        })}
        {/* curve line */}
        <line geometry={curveGeometry} material={curveMaterial} />

        {renderCharges && chargePositions.map((chPos, i) => {
          const pos = Array.isArray(chPos) ? chPos : [0, 0, 0]
          const pv = chargeVisual
          const hitRadius = Math.max(0.3, 0.2 * pv.scale)
          return (
            <group key={`ch-${i}`} position={[pos[0], pos[1], pos[2]]}>
              <sprite ref={i === 0 ? glowRef : null} scale={[pv.scale, pv.scale, 1]}>
                <spriteMaterial
                  map={pv.tex}
                  transparent={true}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  opacity={pv.opacity}
                  toneMapped={false}
                />
              </sprite>

              <mesh
                position={[0, 0, 0]}
                userData={{ id, type: 'path-charge', idx: i, charge: pv.charge }}
                onPointerDown={(e) => {
                  if (e.button !== undefined && e.button !== 0) return
                  e.stopPropagation()
                  setSelectedId(id)
                }}
              >
                <sphereGeometry args={[hitRadius]} />
                <meshBasicMaterial transparent={true} opacity={0} depthWrite={false} />
              </mesh>
            </group>
          )
        })}
      </group>
    </PivotControls>
  )
}