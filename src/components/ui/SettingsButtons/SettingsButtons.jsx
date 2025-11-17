import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import './SettingsButtons.css'
import sphereIcon from '../../../assets/sphere.svg'
import cylinderIcon from '../../../assets/cylinder.svg'
import cuboidIcon from '../../../assets/cuboid.svg'
import flux from '../../../assets/flux.svg'
import PlaneButtons from './SubButtons/PlaneButtons'
import EfieldButtons from './SubButtons/EfieldButtons'
import PotButtons from './SubButtons/PotButtons'


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
  setCreativeMode,
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
  setLineNumber,
  activePlane,
  onPlaneSelect,
  useSlice,
  setUseSlice,
  slicePlane,
  setSlicePlane,
  slicePos,
  setSlicePos,
  showSliceHelper,
  setShowSliceHelper,
  slicePlaneFlip,
  setSlicePlaneFlip
  ,
  // optional wave propagation props (passed from App)
  wavePropagationEnabled,
  setWavePropagationEnabled,
  waveDuration,
  setWaveDuration
}) {
  const [open, setOpen] = useState(null)
  const toggle = (k) => setOpen(p => p === k ? null : k)

  // which tab inside FieldView: 'efield' | 'potential'
  const [fieldTab, setFieldTab] = useState('efield')

  // NEW: ref for outside-click detection
  const rootRef = useRef(null)

  // Close panels when clicking outside
  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target)) return
      setOpen(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

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

  // Has electric field: any non-gaussian object with a numeric non-zero `charge`
  const hasField = useMemo(() => {
    if (!sceneObjects) return false;
    return sceneObjects.some(o => {
      if (isGaussian(o)) return false;
      const q = Number(o?.charge);
      return Number.isFinite(q) && q !== 0;
    });
  }, [sceneObjects]);
  
  const exclusiveActiveType = !creativeMode && gaussianSurfaces.length === 1
    ? surfaceTypeOf(gaussianSurfaces[0])
    : null

  const anyGaussian = gaussianSurfaces.length > 0

  // disable Field View when there's nothing to show (no field sources and no gaussian surfaces)
  const fieldButtonDisabled = !hasField
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
  //const [fluxPrompt, setFluxPrompt] = useState({ open: false, x: 0, y: 0, surfaceType: null })
  //const prevSelectedRef = useRef(null)
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

 /* useEffect(() => {
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
  }, [showOnlyGaussianField, creativeMode])*/

  // Local edit buffers to allow clearing/backspacing
  const [scaleInput, setScaleInput] = useState(String(vectorScale ?? ''))
  const [lineNumInput, setLineNumInput] = useState(String(lineNumber ?? ''))

  useEffect(() => { setScaleInput(String(vectorScale ?? '')) }, [vectorScale])
  useEffect(() => { setLineNumInput(String(lineNumber ?? '')) }, [lineNumber])

  const commitScale = useCallback(() => {
    const v = parseFloat(scaleInput)
    if (Number.isFinite(v)) {
      const clamped = Math.max(0.1, Math.min(5, v))
      setVectorScale(clamped)
      setScaleInput(String(clamped))
    } else {
      setScaleInput(String(vectorScale ?? ''))
    }
  }, [scaleInput, setVectorScale, vectorScale])

  const commitLineNum = useCallback(() => {
    const v = parseInt(lineNumInput, 10)
    if (Number.isFinite(v)) {
      const clamped = Math.max(1, Math.min(50, v))
      setLineNumber(clamped)
      setLineNumInput(String(clamped))
    } else {
      setLineNumInput(String(lineNumber ?? ''))
    }
  }, [lineNumInput, setLineNumber, lineNumber])

  // wavePropagation props are accepted from parent; defaults handled in child

  return (
    <>
      <div ref={rootRef} className="settings-buttons-root horizontal">

        {/* FieldView button (replaces separate E-Field / Potential buttons) */}
        <div className="settings-group">
          <button
            className={`settings-main big ${open === 'fieldview' ? 'open' : ''} ${fieldButtonDisabled ? 'disabled' : ''}`}
            onClick={() => { if (fieldButtonDisabled) return; toggle('fieldview'); /* keep last selected tab */ }}
            disabled={fieldButtonDisabled}
            aria-disabled={fieldButtonDisabled}
            title={fieldButtonDisabled ? "There's no electric field in the scene" : 'Field View'}
          >
            Field View
          </button>

          {open === 'fieldview' && (
            <div className="settings-panel up fieldview-panel">   {/* single container */}
              {/* Tabs header */}
              <div className="fieldview-tabs" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  className={`fieldview-tab ${fieldTab === 'efield' ? 'active' : ''}`}
                  onClick={() => setFieldTab('efield')}
                >
                  E-Field
                </button>
                <button
                  className={`fieldview-tab ${fieldTab === 'potential' ? 'active' : ''}`}
                  onClick={() => setFieldTab('potential')}
                >
                  Potential
                </button>
              </div>

              {/* Tab content — inline (no separate popover) */}
              <div className="fieldview-content" style={{ paddingBottom: 8 }}>
                {fieldTab === 'efield' && (
                  <EfieldButtons
                    inline={true}                      // <--- render inline
                    hasField={hasField}
                    wavePropagationEnabled={wavePropagationEnabled}
                    setWavePropagationEnabled={setWavePropagationEnabled}
                    waveDuration={waveDuration}
                    setWaveDuration={setWaveDuration}
                    onToggleField={onToggleField}
                    onToggleLines={onToggleLines}
                    vectorMinTsl={vectorMinTsl}
                    setVectorMinTsl={setVectorMinTsl}
                    activePlane={activePlane}
                    onPlaneSelect={onPlaneSelect}
                    showField={showField}
                    scaleInput={scaleInput}
                    setScaleInput={setScaleInput}
                    commitScale={commitScale}
                    lineMin={lineMin}
                    setLineMin={setLineMin}
                    showLines={showLines}
                    lineNumInput={lineNumInput}
                    setLineNumInput={setLineNumInput}
                    commitLineNum={commitLineNum}
                  />
                )}

                {fieldTab === 'potential' && (
                  <PotButtons
                    inline={true}                      // <--- render inline
                    onToggleEquipotentialSurface={onToggleEquipotentialSurface}
                    showEquipotentialSurface={showEquipotentialSurface}
                    potentialTarget={potentialTarget}
                    setPotentialTarget={setPotentialTarget}
                  />
                )}
              </div>
              <div className="separator" />

              {/* Plane buttons are constant at the bottom of the FieldView panel */}
              <div className="fieldview-plane-bottom" style={{ marginTop: 0 }}>
                <PlaneButtons activePlane={activePlane} onPlaneSelect={onPlaneSelect} />
              </div>
            </div>
          )}
        </div>

        {/* Slicing / rest of controls remain unchanged */}
        <div className="settings-group">
          <button
            className={`settings-main big ${open === 'slicing' ? 'open' : ''}`}
            onClick={() => toggle('slicing')}
          >
            Slicing
          </button>
          {open === 'slicing' && (
            <div className="slicing-panel">
              <div className="slice-row">
                <button
                  onClick={() => setUseSlice?.(!useSlice)}
                >
                  {useSlice ? 'Slicing On' : 'Slicing Off'}
                </button>
                <button
                 className={`helper-btn ${showSliceHelper ? 'active' : ''}`}
                 onClick={() => setShowSliceHelper?.(!showSliceHelper)}
                 disabled={!useSlice}
                 title="Toggle slice helper"
               >
                 {showSliceHelper ? 'Hide Helper' : 'Show Helper'}
               </button>
               <button
                className={`flip-btn ${slicePlaneFlip ? 'active' : ''}`}
                onClick={() => setSlicePlaneFlip?.(!slicePlaneFlip)}
                disabled={!useSlice}
                title="Flip slice plane orientation"
              >
                Flip slice orientation
              </button>
              </div>

              <div className="efield-section">
                <div className="efield-section-title">Slicing Plane</div>
                <div className="plane-buttons-group">

                  <button
                    className={`plane-button ${slicePlane === 'xy' && useSlice ? 'active' : 'inactive'}`}
                    onClick={(e) => { if (!useSlice) return; setSlicePlane?.('xy') }}
                    disabled={!useSlice}
                    aria-disabled={!useSlice}
                    title={!useSlice ? "Enable slicing to change plane" : "Select XY plane"}
                  >
                    XY
                  </button>
                  <button
                    className={`plane-button ${slicePlane === 'yz' && useSlice ? 'active' : 'inactive'}`}
                    onClick={(e) => { if (!useSlice) return; setSlicePlane?.('yz') }}
                    disabled={!useSlice}
                    aria-disabled={!useSlice}
                    title={!useSlice ? "Enable slicing to change plane" : "Select YZ plane"}
                  >
                    YZ
                  </button>
                  <button
                    className={`plane-button ${slicePlane === 'xz' && useSlice ? 'active' : 'inactive'}`}
                    onClick={(e) => { if (!useSlice) return; setSlicePlane?.('xz') }}
                    disabled={!useSlice}
                    aria-disabled={!useSlice}
                    title={!useSlice ? "Enable slicing to change plane" : "Select XZ plane"}
                  >
                    XZ
                  </button>
                </div>
              </div>

              <div className="efield-section">
                <div className="efield-section-title">Slicing coordinate</div>
                <div className="efield-row compact">
               
                    <input
                      type="range"
                      //this shouldnt be hardcoded ill fix later
                      min={-10}
                      max={10}
                      step={0.1}
                      value={slicePos ?? 0}
                      onChange={e => setSlicePos?.(parseFloat(e.target.value))}
                      disabled={!useSlice}
                    />
                    <span className="slider-value">{Number(slicePos ?? 0).toFixed(2)}</span>
              
                </div>
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
                <div className='gaussian-panel'>
                  <div className="settings-info">
                {creativeMode ? 'Create multiple Gaussian surfaces.' : 'Create one surface at a time.'}
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

     {/* {fluxPrompt.open && (
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
      )} */}
    </>
  )
}