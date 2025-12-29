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
      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onConfirm={handleExportConfirm}
      />
    </>
  )
}
