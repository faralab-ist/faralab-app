import React, { useState } from 'react'
import './PresetsMenu.css'
import { exportPreset, importPreset } from '../../../../utils/presetIO'
import ExportDialog from '../../ExportDialog/ExportDialog'

// Configuration array with all presets
const PRESETS = [
  {
    id: 'monopole',
    label: 'Monopole',
    name: 'monopole',
    category: 'basic'
  },
  {
    id: 'dipole',
    label: 'Dipole',
    name: 'dipole',
    category: 'basic'
  },
  {
    id: 'tripole',
    label: 'Tripole',
    name: 'tripole',
    category: 'basic'
  },
  {
    id: 'infiniteWire',
    label: 'Wire',
    name: 'infiniteWire',
    category: 'basic'
  },
  {
    id: 'currentLoop',
    label: 'Current Loop',
    name: 'currentLoop',
    category: 'magnetic'
  },
  {
    id: 'singlePlane',
    label: '1 Plane',
    name: 'singlePlane',
    category: 'plane'
  },
  {
    id: 'parallelPlanes',
    label: '2 Planes',
    name: 'parallelPlanes',
    category: 'plane'
  },
  {
    id: 'sphericalCapacitor',
    label: 'Spherical Capacitor',
    name: 'sphericalCapacitor',
    category: 'geometry'
  },
  /*{
    id: 'cylinder',
    label: 'Cylinder',
    name: 'cylinder',
    category: 'geometry'
  },*/
  {
    id: 'induction',
    label: 'Induction',
    name: 'induction',
    category: 'magnetic'
  }
]

const PresetsMenu = ({ 
  isVisible, 
  onApplyPreset,
  sceneObjects,
  camera,
  settings
}) => {
  const [showExportDialog, setShowExportDialog] = useState(false)

  if (!isVisible) return null

  const handleLoadPreset = (presetName) => {
    onApplyPreset?.(presetName, { animate: true })
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

  return (
    <>
      <div className="presets-menu">
        <div className="presets-menu-panel">
          
          {/* All Presets */}
          <div className="presets-menu-section">
            <div className="presets-menu-grid">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  className="presets-menu-item"
                  onClick={() => handleLoadPreset(preset.name)}
                  title={`Load ${preset.label} preset`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="presets-menu-separator" />

          {/* Import/Export Actions */}
          <div className="presets-menu-section">
            <div className="presets-menu-actions">
              <button
                className="presets-menu-action"
                onClick={handleImport}
                title="Import preset from file"
              >
                Import
              </button>
              <button
                className="presets-menu-action"
                onClick={handleExport}
                title="Export current scene as preset"
              >
                Export
              </button>
            </div>
          </div>

        </div>
      </div>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onConfirm={handleExportConfirm}
      />
    </>
  )
}

export default PresetsMenu
export { PRESETS }
