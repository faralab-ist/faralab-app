import React, { useState, useEffect, useRef } from 'react'
import ToolbarPopup from './ToolbarPopup/ToolbarPopup'
import CreativeObjectsMenu from './CreativeObjectsMenu'
import PresetsMenu from './PresetsMenu'
import './Toolbar.css'
import RecordingButtons from '../RecordingButtons/RecordingButtons'
import TestCharge from '../../../assets/lowercase_q2.svg'
import Slice from '../../../assets/slice.svg'
import Edit from '../../../assets/edit.svg'
import Clean from '../../../assets/clean.svg'
import FieldViewIcon from '../../../assets/field_view.svg'
import PresetIcon from '../../../assets/preset.svg'
import GaussianIcon from '../../../assets/gaussian_surface.svg'


import FullscreenIcon from '../../../assets/fullscreen.svg'
import ExitFullscreenIcon from '../../../assets/exit-fullscreen.svg'

export default function Toolbar({
  creativeMode,
  setCreativeMode,
  setSceneObjects,

  addObject,
  setFieldVersion,
  setFieldChangeType,
  updatePosition,
  sceneObjects,
  counts,
  
  // Slicing Props (to be passed down to Slicer Popup)
  useSlice, setUseSlice,
  showSliceHelper, setShowSliceHelper,
  slicePlane, setSlicePlane,
  slicePos, setSlicePos,
  slicePlaneFlip, setSlicePlaneFlip,

  // EField Props (to be passed down to EField Popup)
  showField,
  onToggleField,
  showLines,
  onToggleLines,
  showEquipotentialSurface,
  onToggleEquipotentialSurface,
  vectorMinTsl,
  setVectorMinTsl,
  vectorScale,
  setVectorScale,
  vectorStep,
  setVectorStep,
  lineMin,
  setLineMin,
  lineNumber,
  setLineNumber,
  activePlane,
  onPlaneSelect,
  potentialTarget,
  setPotentialTarget,
  wavePropagationEnabled,
  setWavePropagationEnabled,
  waveDuration,
  setWaveDuration,

  // BField Props (to be passed down to EField Popup)
  showBField,
  onToggleBField,

  // Gaussian Props (to be passed down to Gaussian Popup)
  showOnlyGaussianField,
  setOnlyGaussianField,

  // Presets Props
  onApplyPreset,
  camera,
  settings,
  
  // Docker props
  dockedWindows,
  onDock,
  onEnsureActive, // Callback to ensure a window is in activePopups
  undockPositions, // Positions for undocked windows
}) {
  // State: An array of strings, e.g., ['Slice', 'TestCharge']
  const [activePopups, setActivePopups] = useState([])
  // State for presets menu visibility
  const [presetsMenuVisible, setPresetsMenuVisible] = useState(false)
  
  // Refs for click outside detection
  const presetsBtnRef = useRef(null)
  const presetsMenuRef = useRef(null)

  // Expose function to add window to activePopups
  React.useEffect(() => {
    if (onEnsureActive) {
      onEnsureActive((windowName) => {
        setActivePopups(prev => {
          if (!prev.includes(windowName)) {
            return [...prev, windowName];
          }
          return prev;
        });
      });
    }
  }, [onEnsureActive]);
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Toggle logic: Add if missing, remove if present
  const handleClick = (name, e) => {
    if (e) e.preventDefault()
    
    setActivePopups((prev) =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  // Close presets menu when clicking outside
  useEffect(() => {
    if (!presetsMenuVisible) return

    const handleClickOutside = (e) => {
      // Don't close if clicking the button itself or inside the menu
      if (
        presetsBtnRef.current?.contains(e.target) ||
        presetsMenuRef.current?.contains(e.target)
      ) {
        return
      }
      setPresetsMenuVisible(false)
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setPresetsMenuVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [presetsMenuVisible])

  const handleClearCanvas = () => { setSceneObjects?.([]) }

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Bundle props to pass to popups
  // (The popup component decides which ones it needs based on its ID)
  const sharedPopupProps = {
    useSlice, setUseSlice,
    showSliceHelper, setShowSliceHelper,
    slicePlane, setSlicePlane,
    slicePos, setSlicePos,
    slicePlaneFlip, setSlicePlaneFlip,
    addObject,
    updatePosition,
    sceneObjects,
    counts,
    showField,
    onToggleField,
    showLines,
    onToggleLines,
    showEquipotentialSurface,
    onToggleEquipotentialSurface,
    vectorMinTsl,
    setVectorMinTsl,
    vectorScale,
    setVectorScale,
    vectorStep,
    setVectorStep,
    lineMin,
    setLineMin,
    lineNumber,
    setLineNumber,
    activePlane,
    onPlaneSelect,
    potentialTarget,
    setPotentialTarget,
    wavePropagationEnabled,
    setWavePropagationEnabled,
    waveDuration,
    setWaveDuration,
    // BField props
    showBField,
    onToggleBField,
    // Gaussian props
    showOnlyGaussianField,
    setOnlyGaussianField,
    creativeMode,
    setSceneObjects
  }

  return (
    <div className="top-toolbar">
        <RecordingButtons />
        


      <div className="tb-group">
        <button
          className={`tb-btn ${activePopups.includes('EField') || dockedWindows?.EField ? 'active' : ''}`}
          onClick={(e) => handleClick('EField', e)}
          title="Field View"
          aria-pressed={activePopups.includes('EField') || dockedWindows?.EField}
        >
          <img className="tb-icon" src={FieldViewIcon} alt="" />
        </button>

        <button
          className={`tb-btn ${activePopups.includes('Gaussian') || dockedWindows?.Gaussian ? 'active' : ''}`}
          onClick={(e) => handleClick('Gaussian', e)}
          title="Gaussian Surfaces"
          aria-pressed={activePopups.includes('Gaussian') || dockedWindows?.Gaussian}
        >
          <img className="tb-icon" src={GaussianIcon} alt="" />
        </button>

        <button
          className={`tb-btn ${activePopups.includes('TestCharge') || dockedWindows?.TestCharge ? 'active' : ''}`}
          onClick={(e) => handleClick('TestCharge', e)}
          title="TestCharge"
          aria-pressed={activePopups.includes('TestCharge') || dockedWindows?.TestCharge}
        >
          <img className="tb-icon" src={TestCharge} alt="" />
        </button>

        <button
          className={`tb-btn ${activePopups.includes('Slice') || dockedWindows?.Slice ? 'active' : ''}`}
          onClick={(e) => handleClick('Slice', e)}
          title="Slice"
          aria-pressed={activePopups.includes('Slice') || dockedWindows?.Slice}
        >
          <img className="tb-icon" src={Slice} alt="" />
        </button>

        <div className="tb-divider"></div>

        <button
          ref={presetsBtnRef}
          className={`tb-btn ${presetsMenuVisible ? 'active' : ''}`}
          onClick={() => setPresetsMenuVisible(v => !v)}
          title="Presets"
          aria-pressed={presetsMenuVisible}
        >
          <img className="tb-icon" src={PresetIcon} alt="" />
        </button>

        <button
          className={`tb-btn ${creativeMode ? 'active' : ''}`}
          onClick={() => setCreativeMode(v => !v)}
          title="Enable manual object creation"
          aria-pressed={creativeMode}
        >
          <img className="tb-icon" src={Edit} alt="" />
        </button>

        
         

      </div>

      <button
          className={`tb-btn tb-btn-right ${isFullscreen ? 'active' : ''}`}
          onClick={handleFullscreenToggle}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
        >
          <img className="tb-icon" src={isFullscreen ? ExitFullscreenIcon : FullscreenIcon} alt="" />
        </button>

      <button
        className={`tb-btn tb-btn-right`}
        onClick={() => handleClearCanvas()}
        title="Clear canvas"
      >
        <img className="tb-icon" src={Clean} alt="" />
      </button>

      {/* Render a Window for EVERY active tool in the list.
         The ToolbarPopup component handles the positioning and content.
         Only render popups that are NOT docked.
      */}
      {activePopups
        .filter(popupId => !dockedWindows?.[popupId])
        .map((popupId) => (
        <ToolbarPopup
          key={popupId}
          id={popupId}
          onClose={() => handleClick(popupId)} // Passing the toggle function to close it
          popupProps={sharedPopupProps}
          onDock={onDock}
          undockPosition={undockPositions?.[popupId]}
        />
      ))}

      {/* Creative Objects Menu - appears below toolbar when creative mode is active */}
      <CreativeObjectsMenu 
        addObject={addObject}
        setFieldVersion={setFieldVersion}
        setFieldChangeType={setFieldChangeType}
        isVisible={creativeMode}
      />

      {/* Presets Menu - appears below toolbar when P button is active */}
      <div ref={presetsMenuRef}>
        <PresetsMenu 
          isVisible={presetsMenuVisible}
          onApplyPreset={onApplyPreset}
          sceneObjects={sceneObjects}
          camera={camera}
          settings={settings}
        />
      </div>

    </div>
  )
}
