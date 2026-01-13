import React, { useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { PivotControls } from '@react-three/drei'
import useCameraSnap from '../../hooks/useCameraSnapOnSlider'
import * as THREE from 'three'
import Label from '../ui/labels/Label'

export default function Path({
  id,
  position,
  name,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  points,
  chargeCount,
  charge,
  velocity,
  creativeMode,
  updateObject,
  isClosedPath,
  isChild,
  renderPoints = true,
  groupRef: parentGroupRef,
  showLabel = true,
  glowMultiplier = 1.0,
  onHideLabel,
  segments = 500,
}) {
  const isSelected = id === selectedId
  const { handleAxisDragStart } = useCameraSnap()
  const pivotRef = useRef()
  const groupRef = useRef()
  const isDraggingRef = useRef(false)

  const { glowColor, baseGlowIntensity } = useMemo(() => {
    const sign = charge >= 0 ? 1 : -1
    const glowColor = sign >= 0 ? new THREE.Color(0x6ea8ff) : new THREE.Color(0xff6e6e)
    const magnitude = Math.min(4, Math.max(0.2, Math.abs(charge)))
    const baseGlowIntensity = (0.5 + magnitude * 0.12) * glowMultiplier
    return { glowColor, baseGlowIntensity }
  }, [charge, glowMultiplier])

  useLayoutEffect(() => {
    if (isDraggingRef.current || !pivotRef.current) return

    const pos = new THREE.Vector3(position[0], position[1], position[2])
    const mat = new THREE.Matrix4().setPosition(pos)

    if (pivotRef.current.matrix) {
      pivotRef.current.matrix.copy(mat)
    }
  }, [position])

  const catmullCurve = useMemo(() => {
    if (!Array.isArray(points) || points.length < 2) {
      return new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0.01,0.01,0.01)]);
    }
    const pts = points.map(pt => {
      const p = Array.isArray(pt) ? pt : [0, 0, 0]
      return new THREE.Vector3(p[0], p[1], p[2])
    })
    const uniquePts = pts.filter((v, i, a) => a.findIndex(t => t.equals(v)) === i);
    if (uniquePts.length < 2) {
      return new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0.01,0.01,0.01)]);
    }

    let curve = new THREE.CatmullRomCurve3(uniquePts);
    curve.closed = isClosedPath;
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

  // subtle glowing line material (additive, semi-transparent)
  const curveMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: Math.min(1, 0.25 + baseGlowIntensity * 0.6),
      depthTest: true,
      blending: THREE.AdditiveBlending,
    })
  }, [glowColor, baseGlowIntensity])

  useEffect(() => {
    if (!catmullCurve || !updateObject) return
    if (!Array.isArray(points) || points.length < 2) {
      updateObject?.(id, { charges: [], tangents: [] })
      return
    }

    const n = Math.max(1, Math.floor(segments))
    const positions = []
    const tangents = []

    for (let i = 0; i < n; i++) {
      let t
      if (catmullCurve.closed) {
        t = i / n
      } else {
        t = (n === 1) ? 0 : i / (n - 1)
      }
      const p = catmullCurve.getPointAt(t)
      const tan = catmullCurve.getTangentAt(t)
      positions.push([p.x, p.y, p.z])
      tangents.push([tan.x, tan.y, tan.z])
    }

    if (isChild && parentGroupRef?.current) {
      const parentQuat = parentGroupRef.current.quaternion
      const rotatedPositions = positions.map(p => {
        const v = new THREE.Vector3(p[0], p[1], p[2]).applyQuaternion(parentQuat)
        return [v.x, v.y, v.z]
      })
      const rotatedTangents = tangents.map(t => {
        const v = new THREE.Vector3(t[0], t[1], t[2]).applyQuaternion(parentQuat)
        return [v.x, v.y, v.z]
      })
      updateObject?.(id, { charges: rotatedPositions, tangents: rotatedTangents })
    } else {
      updateObject?.(id, { charges: positions, tangents: tangents })
    }

  }, [catmullCurve, segments, isChild, parentGroupRef, points, id, updateObject])

  return (
    <PivotControls
      ref={pivotRef}
      anchor={[0, 0, 0]}
      depthTest={false}
      enabled={creativeMode && isSelected && !isChild}
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
          objectName={name}
          value={`I = ${(() => {
            try {
              const curveLength = catmullCurve?.getLength() || 0
              const I = (curveLength === 0) ? 0 : Math.abs(charge * (chargeCount || 0) * (velocity || 0) / curveLength)
              return I.toExponential(2)
            } catch (e) {
              return '0.00e+0'
            }
          })()} A`}
          offsetY={0.5}
          objectId={id}
          onHideLabel={onHideLabel}
        />
      )}
      <group ref={groupRef}>
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
        <line geometry={curveGeometry} material={curveMaterial} />
      </group>
    </PivotControls>
  )
}