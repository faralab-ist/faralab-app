import React, { useState, useEffect, useMemo } from 'react'
  import { Canvas } from '@react-three/fiber'
  import { OrbitControls } from '@react-three/drei'
  import './App.css'
  import * as THREE from 'three'


  // Core components
  import { Charge, Wire, Plane} from './components/models'

  // Surface components
  import { Sphere, Cylinder, Cuboid } from './components/models/surfaces'

  // UI components
  import CreateButtons from './components/ui/CreateButtons'
  import ObjectPopup from './components/ui/ObjectPopup/ObjectPopup'
  import Sidebar from './components/ui/Sidebar/Sidebar'
  import SettingsButtons from './components/ui/SettingsButtons'
  //import ScreenPosUpdater from './components/ui/ObjectPopup/ScreenPosUpdater'

  // Hooks
  import useSceneObjects from './hooks/useSceneObjects' 
  import FieldArrows from './hooks/useFieldArrows.jsx'
  import useCameraPreset from './hooks/useCameraPreset.jsx'
  import EquipotentialSurface from './components/models/surfaces/EquipotentialSurface.jsx'
  import FieldLines from './hooks/useFieldLines.jsx'
  import useApplyPreset from './hooks/useApplyPreset'

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
        setTimeout(() => setHidden(true), 2000) // tempo do fade final
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
    React.useEffect(() => {
      onReady?.({ setCameraPreset, animateCameraPreset })
    }, [onReady, setCameraPreset, animateCameraPreset])
    return null
  }

  function WhiteAxes({ size = 1 }) {
  const axes = useMemo(() => new THREE.AxesHelper(size), [size])

  useEffect(() => {
    if (axes.setColors) {
      axes.setColors(0xffffff, 0xffffff, 0xffffff)
    }
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
      counts,
    } = useSceneObjects()
    
    const [selectedId, setSelectedId] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false) // <- novo estado para a sidebar
    const [showField, setShowField] = useState(false)
    const [showLines, setShowLines] = useState(false)
    const [showOnlyGaussianField, setShowOnlyGaussianField] = useState(false)
    const [showEquipotentialSurface, setShowEquipotentialSurface] = useState(false)
    const [equipotentialTarget, setEquipotentialTarget] = useState(5.0) 
    const [dragOwnerId, setDragOwnerId] = useState(null)
    const [isPanelMinimized, setIsPanelMinimized] = useState(false)
    const [creativeMode, setCreativeMode] = useState(false)  // stays here (single source)
    const [vectorMinTsl, setVectorMinTsl] = useState(0.1)
    const [vectorScale, setVectorScale] = useState(1)
    const [lineMin, setLineMin] = useState(0.1)         //LINE SETTINGS NEW
    const [lineNumber, setLineNumber] = useState(20)          //LINE SETTINGS NEW
    const [activePlane, setActivePlane] = useState(null) // null, 'xy', 'yz', 'xz'

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
    const toggleLines = () => setShowLines(v => !v)
    const toggleEquip = () => setShowEquipotentialSurface(v => !v)
    useEffect(() => {
      if (counts.surface === 0 && showOnlyGaussianField) {
        setShowOnlyGaussianField(false)
      }
    }, [counts.surface, showOnlyGaussianField])
    const [camFns, setCamFns] = useState(null)

    const handlePlaneSelect = (plane) => {
      // Toggle: se clicar no mesmo plano, desativa
      if (activePlane === plane) {
        setActivePlane(null)
        // Volta para visão padrão
        if (camFns?.animateCameraPreset) {
          camFns.animateCameraPreset({
            position: [15, 15, 15],
            target: [0, 0, 0],
            duration: 0.8
          })
        }
      } else {
        setActivePlane(plane)
        
        // Move câmera de acordo com o plano
        if (camFns?.animateCameraPreset) {
          let cameraConfig
          switch (plane) {
            case 'xy': // Vista de cima (olhando para baixo no eixo Z)
              cameraConfig = {
                position: [0, 0, 8],
                target: [0, 0, 0],
                duration: 0.8
              }
              break
            case 'yz': // Vista lateral (olhando do eixo X)
              cameraConfig = {
                position: [8, 0, 0],
                target: [0, 0, 0],
                duration: 0.8
              }
              break
            case 'xz': // Vista frontal (olhando do eixo Y)
              cameraConfig = {
                position: [0, 8, 0],
                target: [0, 0, 0],
                duration: 0.8
              }
              break
          }
          if (cameraConfig) {
            camFns.animateCameraPreset(cameraConfig)
          }
        }
      }
    }

    const applyPreset = useApplyPreset({
      addObject,
      setSceneObjects,
      updatePosition,
      // camera fns come from camFns
      animateCameraPreset: camFns?.animateCameraPreset,
      setCameraPreset: camFns?.setCameraPreset,
      // map your local toggles to the hook’s expected keys
      showField, onToggleField: toggleField,
      showOnlyGaussianField, onToggleOnlyGaussianField: toggleOnlyGaussianField,
      showLines, onToggleLines: toggleLines,
      showEquipotentialSurface, onToggleEquipotentialSurface: toggleEquip,
      // settings setters
      setVectorMinTsl, setVectorScale, setLineMin, setLineNumber
    })

    return (

      <>
      <LoadingOverlay /> {/* 🔹 Aqui o overlay real */}

      <div id="canvas-container">
        <CreateButtons
          addObject={addObject}
          setSceneObjects={setSceneObjects}
          sceneObjects={sceneObjects}
          counts={counts}
          creativeMode={creativeMode}
          setCreativeMode={setCreativeMode}
          sidebarOpen={sidebarOpen}
          onApplyPreset={applyPreset}

        />
        
        <ObjectPopup
          selectedObject={sceneObjects.find(o => o.id === selectedId)}
          updateObject={updateObject}
          removeObject={removeObject}
          screenPosition={null}
          isMinimized={isPanelMinimized}
          setIsMinimized={setIsPanelMinimized}
          setSelectedId={setSelectedId}
          sidebarOpen={sidebarOpen} 
        />
      
        <Sidebar
          objects={sceneObjects}
          counts={counts}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          updateObject={updateObject}     // <- ensure these are passed
          removeObject={removeObject}     // <- <- 
        />

        <Canvas onPointerMissed={handleBackgroundClick}>
          <CameraFnsMount onReady={setCamFns} />               {/* inside Canvas */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 2, 5]} />
          <OrbitControls enabled={!isDragging} />
          <WhiteAxes args={[20]} />
          <group position={[0,-0.001,0]}>
            
          </group>

        {/*}  <ScreenPosUpdater
            selectedId={selectedId}
            setInfoScreenPos={setInfoScreenPos}
          /> */}

          {sceneObjects.map((obj) => {
            let ObjectComponent
            if (obj.type === 'surface') {
              switch(obj.surfaceType) {
                case 'sphere': ObjectComponent = Sphere; break
                case 'cylinder': ObjectComponent = Cylinder; break
                case 'cuboid': ObjectComponent = Cuboid; break
                default: return null
              }
            } else {
              switch(obj.type) {
                case 'charge': ObjectComponent = Charge; break
                case 'wire': ObjectComponent = Wire; break
                case 'plane': ObjectComponent = Plane; break
                default: return null;
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
  key={`arrows-${vectorMinTsl}-${vectorScale}-${showOnlyGaussianField}-${showField}-${activePlane}`}
  objects={sceneObjects}
  showOnlyGaussianField={showOnlyGaussianField}
  minThreshold={vectorMinTsl}
  scaleMultiplier={vectorScale}
  planeFilter={activePlane}
/>
        )}

        {showLines && (
          <FieldLines key={`field-lines-${sceneObjects.length}-${sceneObjects.map(obj => obj.id).join('-')}-${activePlane}`}   //LINE BUGFIX
          charges={sceneObjects}  
          stepsPerLine={30} stepSize={0.5} minStrength={lineMin} linesPerCharge={lineNumber}         //LINE SETTINGS NEW
          planeFilter={activePlane}
          />
        )}

          {showEquipotentialSurface && (
            <EquipotentialSurface objects={sceneObjects} targetValue={equipotentialTarget} /> 
          )}
        </Canvas>

        <SettingsButtons //epa, ya its ugly, i know - yours truly, gabriel; All gud g
          showField={showField}
          showLines={showLines}
          onToggleField={toggleField}
          onToggleLines={toggleLines} 
          showEquipotentialSurface={showEquipotentialSurface}
          onToggleEquipotentialSurface={() => setShowEquipotentialSurface(v => !v)}
          showOnlyGaussianField={showOnlyGaussianField}
          setOnlyGaussianField={setShowOnlyGaussianField}
          creativeMode={creativeMode}
          addObject={addObject}
          sceneObjects={sceneObjects}
          setSceneObjects={setSceneObjects}
          selectedObjectId={selectedId}
          potentialTarget={equipotentialTarget}                 
          setPotentialTarget={setEquipotentialTarget}           
          vectorMinTsl={vectorMinTsl}
          setVectorMinTsl={setVectorMinTsl}
          vectorScale={vectorScale}
          setVectorScale={setVectorScale}
          lineMin={lineMin}         //LINE SETTINGS NEW
          setLineMin={setLineMin}         //LINE SETTINGS NEW
          lineNumber={lineNumber}         //LINE SETTINGS NEW
          setLineNumber={setLineNumber}          //LINE SETTINGS NEW
          activePlane={activePlane}
          onPlaneSelect={handlePlaneSelect}
        />
      </div>
      </>
    )
  }

  export default App
