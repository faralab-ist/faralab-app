import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import './App.css'

// (mantém todos os teus imports de componentes e hooks originais)
import { Charge, Wire, Plane } from './components/models'
import { Sphere, Cylinder, Cuboid } from './components/models/surfaces'
import CreateButtons from './components/ui/CreateButtons'
import ObjectPopup from './components/ui/ObjectPopup/ObjectPopup'
import Sidebar from './components/ui/Sidebar/Sidebar'
import SettingsButtons from './components/ui/SettingsButtons'
import useSceneObjects from './hooks/useSceneObjects'
import FieldArrows from './hooks/useFieldArrows.jsx'
import useCameraPreset from './hooks/useCameraPreset.jsx'
import EquipotentialSurface from './components/models/surfaces/EquipotentialSurface.jsx'

// 🔹 Overlay que carrega o teu loading.html original
function LoadingOverlay() {
  const [opacity, setOpacity] = useState(1)
  const [hidden, setHidden] = useState(false)
  const [finalFade, setFinalFade] = useState(false)

  // 1️⃣ Fica transparente gradualmente depois de 1s
  useEffect(() => {
    const fadeTimer = setTimeout(() => setOpacity(0.3), 1000)
    return () => clearTimeout(fadeTimer)
  }, [])

  // 2️⃣ Ao clicar depois do fade → some com fade-out suave
  useEffect(() => {
    const handleClick = () => {
      if (opacity <= 0.3) {
        setFinalFade(true)
        setTimeout(() => setHidden(true), 1000) // tempo do fade final
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [opacity])

  if (hidden) return null

  const totalOpacity = finalFade ? 0 : opacity

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        zIndex: 9999,
        pointerEvents: 'auto',
        transition: 'opacity 1s ease-in-out',
        opacity: totalOpacity,
      }}
    >
      <iframe
        src="loading.html"
        title="Loading"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          pointerEvents: 'none', // deixa cliques passarem
          transition: 'opacity 3s ease-in-out', // anima mais lento o fade inicial
          opacity: totalOpacity,
        }}
      />
    </div>
  )
}




function CameraFnsMount({ onReady }) {
  const { setCameraPreset, animateCameraPreset } = useCameraPreset()
  useEffect(() => {
    onReady?.({ setCameraPreset, animateCameraPreset })
  }, [onReady, setCameraPreset, animateCameraPreset])
  return null
}

function WhiteAxes({ size = 1 }) {
  const axes = React.useMemo(() => new THREE.AxesHelper(size), [size])
  useEffect(() => {
    if (axes.setColors) axes.setColors(0xffffff, 0xffffff, 0xffffff)
  }, [axes])
  return <primitive object={axes} />
}

function App() {
  const {
    sceneObjects,
    setSceneObjects,
    updateObject,
    removeObject,
    updatePosition,
    updateDirection,
    addObject,
    counts
  } = useSceneObjects()

  const [selectedId, setSelectedId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showField, setShowField] = useState(false)
  const [showOnlyGaussianField, setShowOnlyGaussianField] = useState(false)
  const [showEquipotentialSurface, setShowEquipotentialSurface] = useState(false)
  const [equipotentialTarget, setEquipotentialTarget] = useState(5.0)
  const [dragOwnerId, setDragOwnerId] = useState(null)
  const [isPanelMinimized, setIsPanelMinimized] = useState(false)
  const [creativeMode, setCreativeMode] = useState(false)
  const [camFns, setCamFns] = useState(null)

  const handleSelect = (id) => {
    setSelectedId(id)
    setIsPanelMinimized(false)
  }

  const handleDragging = (dragging) => {
    setIsDragging(dragging)
    if (dragging) {
      setDragOwnerId(selectedId)
      setIsPanelMinimized(true)
    } else {
      setDragOwnerId(null)
    }
  }

  const handleBackgroundClick = (e) => {
    if (e.target.id === 'canvas-container' || e.target.tagName === 'CANVAS') {
      setIsPanelMinimized(true)
    }
  }

  const toggleField = () => setShowField(v => !v)
  const toggleOnlyGaussianField = () => setShowOnlyGaussianField(v => !v)

  useEffect(() => {
    if (counts.surface === 0 && showOnlyGaussianField) {
      setShowOnlyGaussianField(false)
    }
  }, [counts.surface, showOnlyGaussianField])

  return (
    <>
      <LoadingOverlay /> {/* 🔹 Aqui o overlay real */}

      <div id="canvas-container">
        <CreateButtons
          addObject={addObject}
          setSceneObjects={setSceneObjects}
          showField={showField}
          onToggleField={toggleField}
          showOnlyGaussianField={showOnlyGaussianField}
          onToggleOnlyGaussianField={toggleOnlyGaussianField}
          showEquipotentialSurface={showEquipotentialSurface}
          sceneObjects={sceneObjects}
          onToggleEquipotentialSurface={() => setShowEquipotentialSurface(v => !v)}
          counts={counts}
          setCameraPreset={camFns?.setCameraPreset}
          animateCameraPreset={camFns?.animateCameraPreset}
          creativeMode={creativeMode}
          setCreativeMode={setCreativeMode}
        />

        <ObjectPopup
          selectedObject={sceneObjects.find(o => o.id === selectedId)}
          updateObject={updateObject}
          removeObject={removeObject}
          screenPosition={null}
          isMinimized={isPanelMinimized}
          setIsMinimized={setIsPanelMinimized}
          setSelectedId={setSelectedId}
        />

        <Sidebar objects={sceneObjects} counts={counts} />

        <Canvas onPointerMissed={handleBackgroundClick}>
          <CameraFnsMount onReady={setCamFns} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 2, 5]} />
          <OrbitControls enabled={!isDragging} />
          <WhiteAxes args={[20]} />

          {sceneObjects.map((obj) => {
            let ObjectComponent
            if (obj.type === 'surface') {
              switch (obj.surfaceType) {
                case 'sphere': ObjectComponent = Sphere; break
                case 'cylinder': ObjectComponent = Cylinder; break
                case 'cuboid': ObjectComponent = Cuboid; break
                default: return null
              }
            } else {
              switch (obj.type) {
                case 'charge': ObjectComponent = Charge; break
                case 'wire': ObjectComponent = Wire; break
                case 'plane': ObjectComponent = Plane; break
                default: return null
              }
            }

            return (
              <ObjectComponent
                key={obj.id}
                {...obj}
                creativeMode={creativeMode}
                selectedId={selectedId}
                setSelectedId={handleSelect}
                setIsDragging={handleDragging}
                updatePosition={updatePosition}
                updateDirection={updateDirection}
                updateObject={updateObject}
                removeObject={removeObject}
                dragOwnerId={dragOwnerId}
                gridDimensions={obj.type === 'wire' || obj.type === 'plane' ? [20, 20] : undefined}
              />
            )
          })}

          {showField && (
            <FieldArrows
              objects={sceneObjects}
              showOnlyGaussianField={showOnlyGaussianField}
              fieldThreshold={0.1}
              gridSize={10}
              step={1}
            />
          )}

          {showEquipotentialSurface && (
            <EquipotentialSurface objects={sceneObjects} targetValue={equipotentialTarget} />
          )}
        </Canvas>

        <SettingsButtons
          showField={showField}
          onToggleField={toggleField}
          showEquipotentialSurface={showEquipotentialSurface}
          onToggleEquipotentialSurface={() => setShowEquipotentialSurface(v => !v)}
          showOnlyGaussianField={showOnlyGaussianField}
          onToggleOnlyGaussianField={toggleOnlyGaussianField}
          setOnlyGaussianField={setShowOnlyGaussianField}
          hasSurfaces={(counts?.surface ?? 0) > 0}
          creativeMode={creativeMode}
          addObject={addObject}
          sceneObjects={sceneObjects}
          setSceneObjects={setSceneObjects}
          selectedObjectId={selectedId}
          potentialTarget={equipotentialTarget}
          setPotentialTarget={setEquipotentialTarget}
        />
      </div>
    </>
  )
}

export default App
