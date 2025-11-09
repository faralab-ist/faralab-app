import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import './SettingsButtons.css'
import sphereIcon from '../../assets/sphere.svg'
import cylinderIcon from '../../assets/cylinder.svg'
import cuboidIcon from '../../assets/cuboid.svg'
import flux from '../../assets/flux.svg'


export default function SettingsButtons({
  showField,
  onToggleField,
  showLines,        // result of Field Lines first merge
  onToggleLines,    // result of Field Lines first merge
  showEquipotentialSurface,
  onToggleEquipotentialSurface,
  showOnlyGaussianField,
  setOnlyGaussianField,
  creativeMode,
  addObject,
  sceneObjects,
  setSceneObjects,
  selectedObjectId,
  potentialTarget,
  setPotentialTarget,
  vectorMinTsl,
  setVectorMinTsl,
  vectorScale,
  setVectorScale,
  lineMin,
  setLineMin,
  lineNumber,
  setLineNumber
}) {
  const [open, setOpen] = useState(null)
  const toggle = (k) => setOpen(p => p === k ? null : k)

  // NEW: ref for outside-click detection
  const rootRef = useRef(null)

  // Close panels when clicking outside
  /*useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target)) return
      setOpen(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])*/

  // Optional: close with Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) 

  const isGaussian = o =>
    o &&
    (['sphere','cylinder','cuboid'].includes(o.type) ||
     (o.type === 'surface' && ['sphere','cylinder','cuboid'].includes(o.surfaceType)))

  const surfaceTypeOf = o => (o.type === 'surface' ? o.surfaceType : o.type)

  const gaussianSurfaces = useMemo(
    () => (sceneObjects ?? []).filter(isGaussian),
    [sceneObjects]
  )

  const exclusiveActiveType = !creativeMode && gaussianSurfaces.length === 1
    ? surfaceTypeOf(gaussianSurfaces[0])
    : null

  const anyGaussian = gaussianSurfaces.length > 0

  const ensureFieldVisible = () => {
    if (!showField) onToggleField()
  }

  const addSurface = (type) => {
    addObject?.(type, { position: [0,0,0] })
    ensureFieldVisible()
  }

  const handleSurfaceButton = (type) => {
    if (creativeMode) {
      addSurface(type)
      return
    }
    // exclusive replace: if same single, do nothing
    if (gaussianSurfaces.length === 1 && surfaceTypeOf(gaussianSurfaces[0]) === type) {
      ensureFieldVisible()
      setSceneObjects?.(prev => prev.filter(o => !isGaussian(o)))
      return
    }
    // clear then add
    setSceneObjects?.(prev => prev.filter(o => !isGaussian(o)))
    addSurface(type)
  }

  // Popup on selection
  const [fluxPrompt, setFluxPrompt] = useState({ open: false, x: 0, y: 0, surfaceType: null })
  const prevSelectedRef = useRef(null)
  const lastPointer = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

  useEffect(() => {
    const move = e => { lastPointer.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  const clampPos = useCallback((x, y) => {
    const pad = 8, w = 200, h = 120
    return {
      x: Math.min(Math.max(pad, x), window.innerWidth - w - pad),
      y: Math.min(Math.max(pad, y), window.innerHeight - h - pad)
    }
  }, [])

  useEffect(() => {
    if (selectedObjectId === prevSelectedRef.current) return
    prevSelectedRef.current = selectedObjectId

    // Do not show the popup if Flux is already on OR creativeMode is ON
    if (showOnlyGaussianField) {
      setFluxPrompt(p => ({ ...p, open: false }))
      return
    }

    const sel = (sceneObjects ?? []).find(o => o?.id === selectedObjectId)
    if (sel && isGaussian(sel)) {
      const { x, y } = clampPos(lastPointer.current.x + 12, lastPointer.current.y - 20)
      setFluxPrompt({ open: true, x, y, surfaceType: surfaceTypeOf(sel) })
    } else {
      setFluxPrompt(p => ({ ...p, open: false }))
    }
  }, [selectedObjectId, sceneObjects, clampPos, showOnlyGaussianField])

  useEffect(() => {
    if (!fluxPrompt.open) return
    const onDown = e => {
      if (e.target.closest('.flux-popup')) return
      setFluxPrompt(p => ({ ...p, open: false }))
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [fluxPrompt.open])

  const acceptFlux = () => {
    setOnlyGaussianField?.(true)
    setFluxPrompt(p => ({ ...p, open: false }))
  }
  const closeFlux = () => setFluxPrompt(p => ({ ...p, open: false }))

  // Close popup if Flux becomes ON or creativeMode turns ON while it's open
  useEffect(() => {
    if (showOnlyGaussianField) {
      setFluxPrompt(p => ({ ...p, open: false }))
    }
  }, [showOnlyGaussianField, creativeMode])

  return (
    <>
      <div ref={rootRef} className="settings-buttons-root horizontal">

        <div className="settings-group">
          <button
            className={`settings-main big ${open === 'field' ? 'open' : ''}`}
            onClick={() => toggle('field')}
          >
            E-Field
          </button>
          {open === 'field' && (
            <div className="settings-panel up">
              <div className="field-buttons-row">
                <button onClick={onToggleField}>
                  {showField ? 'Hide Field' : 'Show Field'}
                </button>
                <button onClick={onToggleLines}>
                  {showLines ? 'Hide Lines' : 'Show Lines'}
                </button>
              </div> 
              
              {/* E-Field visualization controls */}
              <div className="efield-section">
                <div className="efield-section-title">Vectors</div>
                <div className="efield-row compact">
                  <label className="efield-label">
                    <span className="label-text">Min Threshold</span>
                    <input
                      type="number"
                      min={0.00}
                      step={0.05}
                      value={vectorMinTsl}
                      onChange={e => setVectorMinTsl(Number(e.target.value))}
                    />
                  </label>
                  <label className="efield-label">
                    <span className="label-text">Scale</span>
                    <input
                      type="number"
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={vectorScale}
                      onChange={e => setVectorScale(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="efield-section">
                <div className="efield-section-title">Lines</div>
                <div className="efield-row compact">
                  <label className="efield-label">
                    <span className="label-text">Min Threshold</span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={lineMin}
                      onChange={e => setLineMin(Number(e.target.value))}
                      disabled={!showLines}
                      placeholder="0.1"
                    />
                  </label>
                  <label className="efield-label">
                    <span className="label-text">Nº of Lines</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={lineNumber}
                      onChange={e => setLineNumber(Number(e.target.value))}
                      disabled={!showLines}
                      placeholder="20"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-group">
          <button
            className={`settings-main big ${open === 'potential' ? 'open' : ''}`}
            onClick={() => toggle('potential')}
          >
            Potential
          </button>
          {open === 'potential' && (
            <div className="settings-panel up">
              <button onClick={onToggleEquipotentialSurface}>
                {showEquipotentialSurface ? 'Hide Equipotential' : 'Show Equipotential'}
              </button>

             
              <div className="slider-row">
                <label className="slider-label">
                  Target V: <span className="slider-value">{Number(potentialTarget).toFixed(2)}</span>
                </label>
                <input
                  className="potential-slider"                
                  type="range"
                  min={-20}
                  max={20}
                  step={0.1}
                  value={potentialTarget ?? 0}
                  onChange={(e) => setPotentialTarget?.(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="settings-group">
          <button
            className={`settings-main big ${open === 'gaussian' ? 'open' : ''}`}
            onClick={() => toggle('gaussian')}
          >
            Gaussian
          </button>
          {open === 'gaussian' && (
            <div className="settings-panel up">
              <div className="settings-info">
                {creativeMode ? 'Create multiple Gaussian surfaces.' : 'One Gaussian surface at a time.'}
              </div>
              <div className="surface-buttons-row">
                <button
                  className={`surface-icon-btn ${exclusiveActiveType === 'sphere' ? 'active' : ''}`}
                  onClick={() => handleSurfaceButton('sphere')}
                  title={creativeMode ? 'Create Sphere' : 'Use Sphere'}
                >
                  <img src={sphereIcon} alt="" />
                  <span>Sphere</span>
                </button>
                <button
                  className={`surface-icon-btn ${exclusiveActiveType === 'cylinder' ? 'active' : ''}`}
                  onClick={() => handleSurfaceButton('cylinder')}
                  title={creativeMode ? 'Create Cylinder' : 'Use Cylinder'}
                >
                  <img src={cylinderIcon} alt="" />
                  <span>Cylinder</span>
                </button>
                <button
                  className={`surface-icon-btn ${exclusiveActiveType === 'cuboid' ? 'active' : ''}`}
                  onClick={() => handleSurfaceButton('cuboid')}
                  title={creativeMode ? 'Create Cuboid' : 'Use Cuboid'}
                >
                  <img src={cuboidIcon} alt="" />
                  <span>Cuboid</span>
                </button>
              </div>

              {/* separator between Gaussian surface buttons and Flux control */}
              <div className="gaussian-sep" />

              <div className={`flux-button-row ${anyGaussian ? '' : 'disabled'}`}>
                <button
                  className={`flux-icon-btn ${showOnlyGaussianField ? 'active' : ''}`}
                  disabled={!anyGaussian}
                  onClick={() => setOnlyGaussianField?.(!showOnlyGaussianField)}
                  title={showOnlyGaussianField ? 'Hide Flux' : 'Show Flux'}
                >
                  <img src={flux} alt="Flux" />
                  <span>{showOnlyGaussianField ? 'Hide Flux' : 'Show Flux'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {fluxPrompt.open && (
        <div className="flux-popup" style={{ top: fluxPrompt.y, left: fluxPrompt.x }}>
          <div className="flux-popup-header">
            <span>Gaussian surface</span>
            <button className="flux-popup-close" onClick={closeFlux} aria-label="Close">×</button>
          </div>
          <div className="flux-popup-body">Show flux on this surface?</div>
          <div className="flux-popup-actions">
            <button className="yes" onClick={acceptFlux}>Show Flux</button>
          </div>
        </div>
      )}
    </>
  )
}