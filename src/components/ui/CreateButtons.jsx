import React, { useState, useRef, useEffect } from 'react'
import './CreateButtons.css'
import { applyPresetByName } from '../../presets/loader'

export default function CreateButtons({ 
  addObject,
  showField,
  onToggleField,
  showOnlyGaussianField,
  onToggleOnlyGaussianField,
  counts,
  sceneObjects,
  setSceneObjects,
  setCameraPreset,
  animateCameraPreset,
  creativeMode,
  setCreativeMode
}) {
  const [openGroup, setOpenGroup] = useState(null)
  const hasSurfaces = (counts?.surface ?? 0) > 0

  // Refs for outside-click
  const panelRef = useRef(null)
  const presetBtnRef = useRef(null)

  const toggleGroup = (g) => setOpenGroup(prev => prev === g ? null : g)

  const loadPreset = (name, animate = true) => {
    const onCamera = animate ? animateCameraPreset : setCameraPreset
    applyPresetByName(name, addObject, setSceneObjects, undefined, onCamera)
    if (!showField) onToggleField()
    if (!showOnlyGaussianField) onToggleOnlyGaussianField()
    setOpenGroup(null)
  }

  // Clear canvas (confirm if >= 2 items)
  const totalObjects = sceneObjects.length
  const handleClearCanvas = () => {
    if (totalObjects >= 2) {
      const ok = window.confirm(`Remove all ${totalObjects} objects from the scene?`)
      if (!ok) return
    }
    setSceneObjects?.([])
  }

  // Outside click + Escape to close presets dropdown
  useEffect(() => {
    if (openGroup !== 'presets') return
    const handleDown = (e) => {
      if (panelRef.current?.contains(e.target)) return
      if (presetBtnRef.current?.contains(e.target)) return
      setOpenGroup(null)
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpenGroup(null)
    }
    window.addEventListener('mousedown', handleDown)
    window.addEventListener('touchstart', handleDown, { passive: true })
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleDown)
      window.removeEventListener('touchstart', handleDown)
      window.removeEventListener('keydown', handleKey)
    }
  }, [openGroup])

  return (
    <>
      {/* Top-left Presets button (no container) */}
      <button
        ref={presetBtnRef}
        className="presets-btn"
        onClick={() => toggleGroup('presets')}
        aria-expanded={openGroup === 'presets'}
      >
        Presets
      </button>

      {/* Presets dropdown */}
      {openGroup === 'presets' && (
        <div ref={panelRef} className="preset-dropdown tl" role="menu" aria-label="Presets">
          <div className="expanded-panel">
            <button onClick={() => loadPreset('monopole')}>Monopole</button>
            <button onClick={() => loadPreset('dipole')}>Dipole</button>
            <button onClick={() => loadPreset('tripole')}>Tripole</button>
            <button onClick={() => loadPreset('infiniteWire')}>Wire</button>
            <button onClick={() => loadPreset('cylinder')}>Cylinder</button>
            <div className="spacer" />
            <button onClick={() => loadPreset('singlePlane')}>1 Plane</button>
            <button onClick={() => loadPreset('parallelPlanes')}>2 Planes</button>
            <div className="spacer" />
            <button onClick={() => loadPreset('sphere')}>Sphere</button>
          </div>
        </div>
      )}

      <div className="create-buttons-container">
        <div className="toolbar">
          {creativeMode && (                                   // SHOW ONLY IN CREATIVE MODE
            <button
              className="clear-canvas-btn"
              onClick={handleClearCanvas}
              title="Clear all objects"
            >
              Clear canvas
            </button>
          )}

          <button
            className={`creative-toggle ${creativeMode ? 'on' : ''}`}
            onClick={() => setCreativeMode(v => !v)}
            title="Enable manual object creation"
            aria-pressed={creativeMode}
          >
            Creative mode
          </button>
        </div>

        {creativeMode && (
          <div className="field-objects">
            <h4>Field Objects</h4>
            <div className="buttons-group">
              <button onClick={() => addObject('charge', { position: [0,0,0], charge: 1 })}>Add Charge</button>
              <button onClick={() => addObject('wire', { position: [0,0,0], direction: [0,1,0] })}>Add Wire</button>
              <button onClick={() => addObject('plane', { position: [0,0,0], direction: [0,1,0] })}>Add Plane</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

