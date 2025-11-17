import React, { useState, useEffect, useMemo } from 'react'
  import { Canvas, useThree } from '@react-three/fiber'
  import { OrbitControls } from '@react-three/drei'
  import './App.css'
  import * as THREE from 'three'


  // Core components
  import { Charge, Wire, Plane, ChargedSphere, SlicePlaneHelper} from './components/models'

  // Surface components
  import { Sphere, Cylinder, Cuboid, EquipotentialSurface} from './components/models/surfaces'

  // UI components
  import CreateButtons from './components/ui/CreateButtons'
  import ObjectPopup from './components/ui/ObjectPopup/ObjectPopup'
  import Sidebar from './components/ui/Sidebar/Sidebar'
  import SettingsButtons from './components/ui/SettingsButtons/SettingsButtons'
  //import ScreenPosUpdater from './components/ui/ObjectPopup/ScreenPosUpdater'

  // Hooks
  import {useSceneObjects, 
    FieldArrows,
    useCameraPreset,  
    FieldLines, useApplyPreset, 
    useSceneHover 
} from "./hooks"


// Fullscreen loading overlay that fades away
function LoadingOverlay() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Prevent the page from scrolling while the fullscreen overlay is visible
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Fade away after a bit longer
    const fadeTimer = setTimeout(() => setHidden(true), 4000)
    return () => {
      clearTimeout(fadeTimer)
      document.body.style.overflow = previous
    }
  }, [])

  if (hidden) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'fadeOut 2.2s ease-out forwards',
        overflow: 'hidden',
      }}
    >
      <iframe
        src="loading.html"
        title="Loading"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          transform: 'scale(1)',
          transformOrigin: 'center center',
        }}
      />
      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
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

  function CameraStateCapture({ onCameraUpdate }) {
    const { camera } = useThree()
    
    useEffect(() => {
      const interval = setInterval(() => {
        onCameraUpdate?.({
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [0, 0, 0] // OrbitControls target is usually origin
        })
      }, 500) // Update every 500ms
      
      return () => clearInterval(interval)
    }, [camera, onCameraUpdate])
    
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

  // small bridge used inside <Canvas /> to forward hover -> App state
  function SceneHoverBridge({ onChange }) {
    // useSceneHover runs inside the fiber renderer (uses useThree)
    useSceneHover((id) => {
      onChange?.(id ?? null)
    })
    return null
  }

  function App() {
    const { 
      sceneObjects,
      setSceneObjects,
      updateObject, 
      removeObject,
      updatePosition,
      updateChargeDensity,
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
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)

    const [creativeMode, setCreativeMode] = useState(false)  // stays here (single source)
    const [vectorMinTsl, setVectorMinTsl] = useState(0.1)
    const [vectorScale, setVectorScale] = useState(1)
    const [lineMin, setLineMin] = useState(0.1)         //LINE SETTINGS NEW
    const [lineNumber, setLineNumber] = useState(20)          //LINE SETTINGS NEW
    const [activePlane, setActivePlane] = useState(null) // null, 'xy', 'yz', 'xz'
    
    const [hoveredId, setHoveredId] = useState(null)
    
    // slicing planes stuff
    const [slicePlane, setSlicePlane] = useState('xz') // 'xy', 'yz', 'xz'
    const [slicePos, setSlicePos] = useState(-0.1)
    const [useSlice, setUseSlice] = useState(false)
    const [showSlicePlaneHelper, setShowSlicePlaneHelper] = useState(true)
    const [slicePlaneFlip, setSlicePlaneFlip] = useState(false)
      // Wave propagation settings for field arrows
      const [wavePropagationEnabled, setWavePropagationEnabled] = useState(true)
      const [waveDuration, setWaveDuration] = useState(0.1) // seconds per instance reveal
    const [cameraState, setCameraState] = useState({ position: [15, 15, 15], target: [0, 0, 0] })

    const handleSelect = (id) => {
      setSelectedId(id)
      setIsPanelMinimized(false)
      setSidebarOpen(true)
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
        setSelectedId(null)
        setSidebarOpen(false)
      }
    }

    // Global outside-click handler: when clicking outside UI panels AND canvas objects, deselect and close UI menus
    useEffect(() => {
      const uiSelectors = [
        '.sidebar-wrap',
        '.create-buttons-container',
        '.presets-btn',
        '.preset-dropdown',
        '.plane-buttons-container',
        '.settings-buttons-root',
        '.export-dialog',
        '.object-popup',
        '.preset-expand-list'
      ]

      const onDocMouseDown = (ev) => {
        const path = ev.composedPath ? ev.composedPath() : (ev.path || [])
        
        // if path contains any UI element, do nothing
        for (const sel of uiSelectors) {
          const el = document.querySelector(sel)
          if (el && path.includes && path.includes(el)) return
          if (el && ev.target && el.contains(ev.target)) return
        }

        // Check if clicking on canvas - if so, only close menus but don't deselect
        // (let the canvas handle object selection/deselection internally)
        const canvas = ev.target?.tagName === 'CANVAS'
        if (canvas) {
          // Just close UI menus, let canvas objects handle their own selection
          window.dispatchEvent(new CustomEvent('app:close-all-ui'))
          return
        }

        // clicked outside UI and outside canvas -> deselect and broadcast close event
        setSelectedId(null)
        window.dispatchEvent(new CustomEvent('app:close-all-ui'))
      }

      document.addEventListener('mousedown', onDocMouseDown)
      return () => document.removeEventListener('mousedown', onDocMouseDown)
    }, [setSelectedId]) 

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
            position: [10, 10, 10],
            target: [0, 0, 0],
            up: [0, 1, 0],
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
                  up: [0, 1, 0],
                  duration: 0.8
              }
              break
            case 'yz': // Vista lateral (olhando do eixo X)
              cameraConfig = {
                position: [8, 0, 0],
                  target: [0, 0, 0],
                  up: [0, 1, 0],
                  duration: 0.8
              }
              break
            case 'xz': // Vista frontal (olhando do eixo Y)
              cameraConfig = {
                position: [0, 8, 0],
                  target: [0, 0, 0],
                  up: [0, 0, 1],
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

    useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      const active = document.activeElement
      if (!active) return
      const tag = active.tagName
      const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable
      if (isFormField) return
      if (selectedId == null) return
      e.preventDefault() // avoid back-navigation on Backspace
      removeObject?.(selectedId)
      setSelectedId(null)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selectedId, removeObject, setSelectedId])

    return (

    <>
    {/* <LoadingOverlay /> */}

    <div id="canvas-container">
        <CreateButtons
          addObject={addObject}
          setSceneObjects={setSceneObjects}
          sceneObjects={sceneObjects}
          counts={counts}
          creativeMode={creativeMode}
          setCreativeMode={setCreativeMode}
          sidebarOpen={sidebarOpen}
          sidebarMinimized={isSidebarMinimized}
          onApplyPreset={applyPreset}
          camera={cameraState}
          settings={{
            vectorMinTsl,
            vectorScale,
            lineMin,
            lineNumber,
            showField,
            showLines,
            showEquipotentialSurface,
            showOnlyGaussianField
          }}
        />
        
       {/* <ObjectPopup
          selectedObject={sceneObjects.find(o => o.id === selectedId)}
          updateObject={updateObject}
          removeObject={removeObject}
          screenPosition={null}
          isMinimized={isPanelMinimized}
          setIsMinimized={setIsPanelMinimized}
          setSelectedId={setSelectedId}
          sidebarOpen={sidebarOpen} 
          isSidebarMinimized={isSidebarMinimized}
        /> */}
        
        <Sidebar
          objects={sceneObjects}
          counts={counts}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          onMinimizedChange={setIsSidebarMinimized}
          updateObject={updateObject}     // <- ensure these are passed
          removeObject={removeObject}     // <- <- 
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />

        <Canvas gl={{localClippingEnabled: true}} onPointerMissed={handleBackgroundClick}>
          <CameraFnsMount onReady={setCamFns} />
          <CameraStateCapture onCameraUpdate={setCameraState} />
          <SceneHoverBridge onChange={setHoveredId} />
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
                case 'chargedSphere': ObjectComponent = ChargedSphere; break
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
                updateChargeDensity={updateChargeDensity}
                updateDirection={updateDirection}
                updateObject={updateObject}
                removeObject={removeObject}
                slicePlane={slicePlane}
                slicePos={slicePos}
                useSlice={useSlice}
                slicePlaneFlip={slicePlaneFlip}
                dragOwnerId={dragOwnerId}
                isHovered={obj.id === hoveredId}
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
        slicePlane={slicePlane}
        slicePos={slicePos}
        useSlice={useSlice}
        slicePlaneFlip={slicePlaneFlip}
        wavePropagationEnabled={wavePropagationEnabled}
        waveDuration={waveDuration}
        />
        )}

        {showLines && (
          <FieldLines key={`field-lines-${sceneObjects.length}-${sceneObjects.map(obj => obj.id)
                           .join('-')}-${activePlane}-${lineMin}-${lineNumber}`}   //LINE BUGFIX
          charges={sceneObjects}  
          stepsPerLine={30} stepSize={0.5} minStrength={lineMin} linesPerCharge={lineNumber}         //LINE SETTINGS NEW
          planeFilter={activePlane}  slicePlane={slicePlane}
          slicePos={slicePos}
          useSlice={useSlice}
          slicePlaneFlip={slicePlaneFlip}
          />
        )}

          {showEquipotentialSurface && (
            <EquipotentialSurface objects={sceneObjects} targetValue={equipotentialTarget} 
                slicePlane={slicePlane}
                slicePos={slicePos}
                useSlice={useSlice}
                slicePlaneFlip={slicePlaneFlip}
            /> 
          )}

          {useSlice && showSlicePlaneHelper && (<SlicePlaneHelper 
                slicePlane={slicePlane}
                slicePos={slicePos}/>)}
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
          useSlice={useSlice}
          setUseSlice={setUseSlice}
          slicePlane={slicePlane}
          setSlicePlane={setSlicePlane}
          slicePos={slicePos}
          setSlicePos={setSlicePos}
          showSliceHelper={showSlicePlaneHelper}
          setShowSliceHelper={setShowSlicePlaneHelper}
          slicePlaneFlip={slicePlaneFlip}
          setSlicePlaneFlip={setSlicePlaneFlip}
          // Wave propagation controls for field arrows
          wavePropagationEnabled={wavePropagationEnabled}
          setWavePropagationEnabled={setWavePropagationEnabled}
          waveDuration={waveDuration}
          setWaveDuration={setWaveDuration}
        />
      </div>
      </>
    )
  }

  export default App
