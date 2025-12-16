import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import './CreateButtons.css'
import { exportPreset, importPreset } from '../../utils/presetIO'
import ExportDialog from './ExportDialog/ExportDialog'

export default function CreateButtons({ 
  addObject,
  counts,
  sceneObjects,
  setSceneObjects,
  creativeMode,
  setCreativeMode,
  sidebarOpen = false,
  sidebarMinimized = false,
  onApplyPreset,
  // New props for export/import
  camera,
  settings
}) {
  const [openGroup, setOpenGroup] = useState(null)
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Refs
  const panelRef = useRef(null)
  const presetBtnRef = useRef(null)
  const toolbarRef = useRef(null)

  const toggleGroup = (g) => setOpenGroup(prev => prev === g ? null : g)

  const loadPreset = (name, animate = true) => {
    onApplyPreset?.(name, { animate })
    setOpenGroup(null)
  }


  const handleClearCanvas = () => {
    setSceneObjects?.([])
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleExportConfirm = (presetName) => {
    exportPreset({
      sceneObjects,
      camera,
      settings,
      name: presetName
    })
    setShowExportDialog(false)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      importPreset(file, (error, preset) => {
        if (error) {
          alert(`Failed to import preset: ${error.message}`)
          return
        }
        
        // Apply imported preset
        onApplyPreset?.(preset, { animate: false, isCustom: true })
      })
    }
    input.click()
  }

  useEffect(() => {
    if (openGroup !== 'presets') return
    const handleDown = (e) => {
      if (panelRef.current?.contains(e.target)) return
      if (presetBtnRef.current?.contains(e.target)) return
      setOpenGroup(null)
    }
    const handleKey = (e) => { if (e.key === 'Escape') setOpenGroup(null) }
    window.addEventListener('mousedown', handleDown)
    window.addEventListener('touchstart', handleDown, { passive: true })
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleDown)
      window.removeEventListener('touchstart', handleDown)
      window.removeEventListener('keydown', handleKey)
    }
  }, [openGroup])

  // OFFSET — exatamente a largura da sidebar (não exagerar)
  const sidebarWidth = sidebarMinimized ? 80 : 325
  const sidebarExtraOffset = 0 // deixar 0 para deslocar exactamente a sidebar; ajustar se quiser pequeno gap
  const totalSidebarOffset = sidebarOpen || sidebarMinimized ? sidebarWidth + sidebarExtraOffset : 0

  const [appliedOffset, setAppliedOffset] = useState(0)

  const computeOffset = () => {
    const rect = toolbarRef.current?.getBoundingClientRect()
    const anchorLeft = rect?.left ?? window.innerWidth * 0.1
    const maxMove = Math.max(0, anchorLeft - 8) // nunca mover além da margem esquerda (8px)
    setAppliedOffset(Math.min(totalSidebarOffset, maxMove))
  }

  useLayoutEffect(() => {
    computeOffset()
    window.addEventListener('resize', computeOffset)
    return () => window.removeEventListener('resize', computeOffset)
  }, [totalSidebarOffset])

  useEffect(() => { computeOffset() }, [sidebarOpen, openGroup])

  const toolbarStyle = appliedOffset > 0
    ? { transform: `translateX(-${appliedOffset}px)`, transition: 'transform 140ms ease', zIndex: 1000 }
    : { transition: 'transform 140ms ease', zIndex: 1000 }

  return (
    <>
      {/* Presets (não deslocar) */}
      <button
        ref={presetBtnRef}
        className="presets-btn"
        onClick={() => toggleGroup('presets')}
        aria-expanded={openGroup === 'presets'}
      >
        PRESETS
      </button>

      {/* Presets dropdown (não desloca) */}
      {openGroup === 'presets' && (
        <div ref={panelRef} className="preset-dropdown tl" role="menu" aria-label="Presets">
          <div className="expanded-panel">
            <button onClick={() => loadPreset('monopole')}>Monopole</button>
            <button onClick={() => loadPreset('dipole')}>Dipole</button>
            <button onClick={() => loadPreset('tripole')}>Tripole</button>
            <button onClick={() => loadPreset('infiniteWire')}>Wire</button>
            <button onClick={() => loadPreset('currentLoop')}>Current Loop</button>
            <div className="spacer" />
            <button onClick={() => loadPreset('singlePlane')}>1 Plane</button>
            <button onClick={() => loadPreset('parallelPlanes')}>2 Planes</button>
            <div className="spacer" />
            <button onClick={() => loadPreset('sphere')}>Sphere</button>

            <div className="preset-separator" aria-hidden="true" />

            <div className="preset-actions">
              <button onClick={handleImport} >Import Preset</button>
              <button onClick={handleExport}>Export Preset</button>
            </div>
          </div>
        </div>
      )}

      <div className="create-buttons-container">

        {/* Field objects — NÃO deslocar */}
        {creativeMode && (
          <div className="field-objects">
            <h4>Field Objects</h4>
            <div className="buttons-group">
              <button onClick={() => addObject('charge', { position: [0,0,0], charge: 1 })}>Add Charge</button>
              <button onClick={() => addObject('wire', { position: [0,0,0]})}>Add Wire</button>
            <button onClick={() => addObject('plane', { position: [0,0,0] })}>Add Plane</button>
              <button onClick={() => addObject('chargedSphere', { position: [0,0,0] })}>Add Charged Sphere</button>
              <button onClick={() => addObject('path', { position: [0,0,0] })}>Add Path</button>
              <button onClick={() => addObject('ringCoil', { position: [0,0,0] }) }>Add Ring Coil</button>
              <button onClick={() => addObject('polygonCoil', { position: [0,0,0]}) }>Add Polygon Coil</button>
              <button onClick={() => addObject('solenoid', { position: [0,0,0]}) }>Add Solenoid Coil</button>
              <button onClick={() => addObject('barMagnet', { position: [0,0,0]}) }>Add Bar Magnet</button>
              <button onClick={() => addObject('faradayCoil', { position: [0,0,0]}) }>Add Faraday Coil</button>
           {/*    <button onClick={() => addObject('concentricSpheres', { position: [0,0,0] })}>Add Concentric Sphere System</button>
              <button onClick={() => addObject('concentricInfWires', { position: [0,0,0] })}>Add Concentric Infinite Wire System</button>
              <button onClick={() => addObject('stackedPlanes', { position: [0,0,0] })}>Add Stacked Planes</button> */} 
            </div>
          </div>
        )}
      </div>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onConfirm={handleExportConfirm}
      />
    </>
  )
}
