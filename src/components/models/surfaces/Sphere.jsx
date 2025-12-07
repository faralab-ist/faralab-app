import React, { useRef, useEffect, useState, useMemo } from 'react'
import { PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import NormalArrow from './NormalArrow'

import { Html } from '@react-three/drei' // <--- 1. Importar Html
import FluxWindow from '../../../components/ui/FluxWindow/fluxWindow' // <--- 2. Importar FluxWindow

function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip){
    if(!useSlice) return true;
    switch(slicePlane){
        case 'xy':
            return slicePlaneFlip ^ point.z > slicePos;
        case 'yz':
            return slicePlaneFlip ^ point.x > slicePos;
        case 'xz':
            return slicePlaneFlip ^ point.y > slicePos;
    }
}

export default function Sphere({
  id,
  position,
  radius = 2,
  fluxValue = 0,
  opacity = 0.5,
  selectedId,
  setSelectedId,
  setIsDragging,
  updatePosition,
  fixed = false,
  dragOwnerId = null,
  creativeMode,
  slicePlane,
  slicePos,
  useSlice,
  slicePlaneFlip,
  isHovered
}) {
  const isSelected = id === selectedId
  const meshRef = useRef()
  const pivotRef = useRef()
  const rootRef = useRef() // 👈 move this group, not just the mesh
  const [center, setCenter] = useState([0, 0, 0])
  const clickArmed = useRef(false)
  const arrowLen = useMemo(() => Math.max(0.1, radius * 0.35), [radius])

  // Use a diagonal direction by default (not at the poles)
  const normalUnitDir = useMemo(
    () => new THREE.Vector3(1, 1, 1).normalize(),
    []
  )

  // One normal at that diagonal spot on the surface
  const mainNormal = useMemo(
    () => ({
      origin: normalUnitDir.clone().multiplyScalar(radius),
      dir: normalUnitDir.clone(),
    }),
    [normalUnitDir, radius]
  )

  // ⚙️ Recalcula o centro da geometria sempre que o raio muda
  useEffect(() => {
    if (meshRef.current?.geometry) {
      meshRef.current.geometry.computeBoundingBox()
      const box = meshRef.current.geometry.boundingBox
      const centerVec = new THREE.Vector3()
      box.getCenter(centerVec)
      setCenter([centerVec.x, centerVec.y, centerVec.z])
    }
  }, [radius])

  // 👇 sync world position via root group so gizmo + arrow follow
  useEffect(() => {
    if (rootRef.current) rootRef.current.position.set(...position)
  }, [position])

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
      anchor={center} // ✅ gizmo centrado geometricamente
      visible={isSelected}
      enabled={!fixed && (dragOwnerId === null || dragOwnerId === id) && creativeMode} // 👈 ativa se não houver drag de outro
      disableRotations={true}
      disableScaling={true}
      depthTest={false}
      onDragStart={() => setIsDragging(true)}
      onDrag={(matrix) => {
        const newPos = new THREE.Vector3().setFromMatrixPosition(matrix)
        updatePosition(id, [newPos.x, newPos.y, newPos.z])
        if (rootRef.current) rootRef.current.position.copy(newPos) // keep gizmo + arrow together
      }}
      onDragEnd={() => setIsDragging(false)}
    >
      <group ref={rootRef} position={position}>
        <mesh
          ref={meshRef}
          userData={{ id, type: 'surface' }}
          position={[0, 0, 0]}
          // ✅ seleção adiada; ignora se outro objeto está em drag
          onPointerDown={(e) => {
            if (e.button !== undefined && e.button !== 0) return
            if (dragOwnerId !== null && dragOwnerId !== id) return
            clickArmed.current = true
          }}
          onPointerUp={(e) => {
            if (!clickArmed.current) return
            clickArmed.current = false
            if (dragOwnerId !== null && dragOwnerId !== id) return
            if (!fixed) e.stopPropagation()
            setSelectedId(id)
          }}
          // ✅ ignora raycast se outro objeto está em drag; mantém "pass-through" de cliques
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
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={isSelected || isHovered ? 'lightblue'  : 'white'}
            transparent
            opacity={opacity}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
            clippingPlanes={clippingPlanes}
          />
        </mesh>

        <Html
          // 1. Colocamos exatamente na superfície (radius), sem folga extra
          position={[0, radius, 0]} 
          
          // 2. Removemos a prop 'center' (que causava o deslize visual)
          
          // 3. DistanceFactor mantém o tamanho consistente com o zoom
          distanceFactor={10} 
          
          // 4. Z-index alto para não cortar dentro da esfera
          zIndexRange={[100, 0]} 
          
          // 5. O segredo está no transform:
          // -50% (X): Centraliza horizontalmente
          // -100% (Y): Puxa a etiqueta para cima, fazendo a base tocar no ponto
          style={{ 
            transform: 'translate3d(-50%, -100%, 0)',
            pointerEvents: 'none',
            userSelect: 'none',
            paddingBottom: '10px' // Dá um pequeno respiro visual sem perder a âncora
          }} 
        >
          <FluxWindow value={fluxValue} visible={true} />
        </Html>

        {isSelected && (
          <group name="sphere-normal">
            {sliceByPlane(mainNormal.origin, slicePlane, slicePos, useSlice, slicePlaneFlip) && 
            <NormalArrow
              origin={mainNormal.origin}
              dir={mainNormal.dir}
              length={arrowLen}
              color="red"
              opacity={opacity}
            />}
          </group>
        )}
      </group>
    </PivotControls>
  )
}

