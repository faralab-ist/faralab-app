import React, { useRef, useEffect, useState, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import NormalArrow from './NormalArrow'


export default function Cuboid({
  id,
  position,
  width = 2,
  height = 2,
  depth = 2,
  opacity = 0.5,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  fixed = false,
  isDragging = false,
  dragOwnerId = null,
  creativeMode
}) {
  const isSelected = id === selectedId
  const meshRef = useRef()
  const pivotRef = useRef()
  const rootRef = useRef()                 // 👈 new: move this group, not the mesh
  const [center, setCenter] = useState([0, 0, 0])
  const clickArmed = useRef(false) // 👈 adia a seleção para o pointerup

  // ⚙️ Recalcula o centro da geometria sempre que as dimensões e posição mudam
  useEffect(() => {
    if (meshRef.current?.geometry) {
      meshRef.current.geometry.computeBoundingBox()
      const box = meshRef.current.geometry.boundingBox
      const centerVec = new THREE.Vector3()
      box.getCenter(centerVec)
      setCenter([centerVec.x, centerVec.y, centerVec.z])
    }
  }, [width, height, depth])

  // ⚙️ Mantém o objeto sincronizado com a posição global
  useEffect(() => {
    if (rootRef.current) rootRef.current.position.set(...position)   // 👈 move o grupo
  }, [position])

  const faceNormals = useMemo(() => {
    const n = []
    n.push({ origin: new THREE.Vector3(+width / 2, 0, 0), dir: new THREE.Vector3(1, 0, 0) })
    n.push({ origin: new THREE.Vector3(-width / 2, 0, 0), dir: new THREE.Vector3(-1, 0, 0) })
    n.push({ origin: new THREE.Vector3(0, +height / 2, 0), dir: new THREE.Vector3(0, 1, 0) })
    n.push({ origin: new THREE.Vector3(0, -height / 2, 0), dir: new THREE.Vector3(0, -1, 0) })
    n.push({ origin: new THREE.Vector3(0, 0, +depth / 2), dir: new THREE.Vector3(0, 0, 1) })
    n.push({ origin: new THREE.Vector3(0, 0, -depth / 2), dir: new THREE.Vector3(0, 0, -1) })
    return n
  }, [width, height, depth])

  const arrowLen = useMemo(
    () => Math.max(0.1, Math.min(width, height, depth) * 0.35),
    [width, height, depth]
  )

  return (
    <PivotControls
      ref={pivotRef}
      anchor={center}
      visible={isSelected}
      enabled={!fixed && (!isDragging || dragOwnerId === id) && creativeMode}
      disableScaling={true}
      depthTest={false}
      onDragStart={() => setIsDragging(true)}
      onDrag={(matrix) => {
        const newPos = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [newPos.x, newPos.y, newPos.z])
        if (rootRef.current) rootRef.current.position.copy(newPos)   // 👈 move o grupo durante o drag
      }}
      onDragEnd={() => setIsDragging(false)}
    >
      <group ref={rootRef} position={position}>
        <mesh
          ref={meshRef}
          userData={{ id, type: 'surface' }}
          position={[0, 0, 0]}                                       // 👈 fica local no grupo
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            // se outro objeto já está em drag, ignore
            if (isDragging && dragOwnerId !== id) return
            clickArmed.current = true
          }}
          onPointerUp={(e) => {
            if (!clickArmed.current) return
            clickArmed.current = false
            // se houve drag no meio, não seleciona
            if (isDragging && dragOwnerId !== id) return

            if (!fixed) e.stopPropagation()
            setSelectedId(id)
          }}
          // Evita que a superfície intercepte cliques enquanto outro objeto está em drag
          raycast={(raycaster, intersects) => {
            if (!meshRef.current) return
            if (isDragging && dragOwnerId !== id) return
            const hitsBefore = intersects.length
            THREE.Mesh.prototype.raycast.call(meshRef.current, raycaster, intersects)
            if (intersects.length > hitsBefore + 1) {
              intersects.splice(hitsBefore, 1)
            }
          }}
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={isSelected ? 'lightblue' : 'white'}
            transparent
            opacity={opacity}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
          />
        </mesh>

        {isSelected && (
          <group name="cuboid-normals">
            {faceNormals.map((n, i) => (
              <NormalArrow
                key={i}
                origin={n.origin}
                dir={n.dir}
                length={arrowLen}
                color="red"
                opacity={opacity}
              />
            ))}
          </group>
        )}
      </group>
    </PivotControls>
  )
}

