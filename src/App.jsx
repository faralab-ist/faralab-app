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
      counts 
    } = useSceneObjects()
    
    const [selectedId, setSelectedId] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [showField, setShowField] = useState(false)
    const [showLines, setShowLines] = useState(false)
    const [showOnlyGaussianField, setShowOnlyGaussianField] = useState(false)
    const [showEquipotentialSurface, setShowEquipotentialSurface] = useState(false)
    const [equipotentialTarget, setEquipotentialTarget] = useState(5.0) 
    const [dragOwnerId, setDragOwnerId] = useState(null)
    const [isPanelMinimized, setIsPanelMinimized] = useState(false)
    const [creativeMode, setCreativeMode] = useState(false)  // stays here (single source)

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
    const [camFns, setCamFns] = useState(null)

    const toggleLines = () => setShowLines(v => !v)

    return (
      <div id="canvas-container">
        <CreateButtons
          addObject={addObject}
          setSceneObjects={setSceneObjects}
          showField={showField}
          showLines={showLines}
          onToggleField={toggleField}
          onToggleLines={toggleLines}
          showOnlyGaussianField={showOnlyGaussianField}
          onToggleOnlyGaussianField={toggleOnlyGaussianField}
          showEquipotentialSurface={showEquipotentialSurface}
          sceneObjects={sceneObjects}
          onToggleEquipotentialSurface={() => setShowEquipotentialSurface(v => !v)}
          counts={counts}
          setCameraPreset={camFns?.setCameraPreset}
          animateCameraPreset={camFns?.animateCameraPreset}
          creativeMode={creativeMode}
          setCreativeMode={setCreativeMode}            // pass setter down
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
      
        <Sidebar 
          objects={sceneObjects}
          counts={counts}
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
                creativeMode={creativeMode}            // NEW
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
          <FieldArrows objects={sceneObjects} 
          showOnlyGaussianField={showOnlyGaussianField} fieldThreshold={0.1} gridSize={10} step={1}
          />
        )}

        {showLines && (
          <FieldLines charges={sceneObjects} 
          stepsPerLine={30} stepSize={0.5} minStrength={0.1} linesPerCharge={20}
          />
        )}

          {showEquipotentialSurface && (
            <EquipotentialSurface objects={sceneObjects} targetValue={equipotentialTarget} /> 
          )}
        </Canvas>

        <SettingsButtons
          showField={showField}
          showLines={showLines}
          onToggleField={toggleField}
          onToggleLines={toggleLines} 
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
          potentialTarget={equipotentialTarget}                 // NEW
          setPotentialTarget={setEquipotentialTarget}           // NEW
        />
      </div>
    )
  }

  export default App
