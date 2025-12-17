import React, { useState } from 'react'
import ToolbarPopup from './ToolbarPopup/ToolbarPopup'
import './Toolbar.css'
import RecordingButtons from '../RecordingButtons/RecordingButtons'
import TestCharge from '../../../assets/lowercase_q2.svg'
import Slice from '../../../assets/slice.svg'
import Edit from '../../../assets/edit.svg'
import Clean from '../../../assets/clean.svg'
import EFieldIcon from '../../../assets/efield.svg'



export default function Toolbar({
  creativeMode,
  setCreativeMode,
  setSceneObjects,

  addObject,
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

  // Gaussian Props (to be passed down to Gaussian Popup)
  showOnlyGaussianField,
  setOnlyGaussianField
}) {
  // State: An array of strings, e.g., ['Slice', 'TestCharge']
  const [activePopups, setActivePopups] = useState([])

  // Toggle logic: Add if missing, remove if present
  const handleClick = (name, e) => {
    if (e) e.preventDefault()
    setActivePopups((prev) =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  const handleClearCanvas = () => { setSceneObjects?.([]) }

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
    // Gaussian props
    showOnlyGaussianField,
    setOnlyGaussianField
  }

  return (
    <div className="top-toolbar">
        <RecordingButtons />
        


      <div className="tb-group">
        <button
          className={`tb-btn ${activePopups.includes('EField') ? 'active' : ''}`}
          onClick={(e) => handleClick('EField', e)}
          title="Electric Field"
          aria-pressed={activePopups.includes('EField')}
        >
          <img className="tb-icon" src={EFieldIcon} alt="" />
        </button>

        <button
          className={`tb-btn ${activePopups.includes('Gaussian') ? 'active' : ''}`}
          onClick={(e) => handleClick('Gaussian', e)}
          title="Gaussian Surfaces"
          aria-pressed={activePopups.includes('Gaussian')}
        >
          <span style={{ fontWeight: 800, fontSize: 12, lineHeight: 1 }}>G</span>
        </button>

        <button
          className={`tb-btn ${activePopups.includes('TestCharge') ? 'active' : ''}`}
          onClick={(e) => handleClick('TestCharge', e)}
          title="TestCharge"
          aria-pressed={activePopups.includes('TestCharge')}
        >
          <img className="tb-icon" src={TestCharge} alt="" />
        </button>

        <button
          className={`tb-btn ${activePopups.includes('Slice') ? 'active' : ''}`}
          onClick={(e) => handleClick('Slice', e)}
          title="Slice"
          aria-pressed={activePopups.includes('Slice')}
        >
          <img className="tb-icon" src={Slice} alt="" />
        </button>

        <button
          className={`tb-btn ${creativeMode ? 'active' : ''}`}
          onClick={() => setCreativeMode(v => !v)}
          title="Enable manual object creation"
          aria-pressed={creativeMode}
        >
          <img className="tb-icon" src={Edit} alt="" />
        </button>

        <button
          className={`tb-btn`}
          onClick={() => handleClearCanvas()}
          title="Clear canvas"
        >
          <img className="tb-icon" src={Clean} alt="" />
        </button>

      </div>

      {/* Render a Window for EVERY active tool in the list.
         The ToolbarPopup component handles the positioning and content.
      */}
      {activePopups.map((popupId) => (
        <ToolbarPopup
          key={popupId}
          id={popupId}
          onClose={() => handleClick(popupId)} // Passing the toggle function to close it
          popupProps={sharedPopupProps}
        />
      ))}

    </div>
  )
}
