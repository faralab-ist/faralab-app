import React, { useState, useEffect } from 'react'
import ToolbarPopup from './ToolbarPopup/ToolbarPopup'
import './Toolbar.css'
import RecordingButtons from '../RecordingButtons/RecordingButtons'
import TestCharge from '../../../assets/lowercase_q2.svg'
import Slice from '../../../assets/slice.svg'
import Edit from '../../../assets/edit.svg'
import Clean from '../../../assets/clean.svg'
import FullscreenIcon from '../../../assets/fullscreen.svg'
import ExitFullscreenIcon from '../../../assets/exit-fullscreen.svg'

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
  slicePlaneFlip, setSlicePlaneFlip
}) {
  // State: An array of strings, e.g., ['Slice', 'TestCharge']
  const [activePopups, setActivePopups] = useState([])
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
  }

  return (
    <div className="top-toolbar">
        <RecordingButtons />
        


      <div className="tb-group">
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

         {/* Maybe not needed, as fullscreen is browser-handled?
         <button
          className={`tb-btn ${isFullscreen ? 'active' : ''}`}
          onClick={handleFullscreenToggle}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
        >
          <img className="tb-icon" src={isFullscreen ? ExitFullscreenIcon : FullscreenIcon} alt="" />
        </button>*/}

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
