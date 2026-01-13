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
    category: 'electrostatic'
  },
  {
    id: 'dipole',
    label: 'Dipole',
    name: 'dipole',
    category: 'electrostatic'
  },
  {
    id: 'tripole',
    label: 'Tripole',
    name: 'tripole',
    category: 'electrostatic'
  },
  {
    id: 'wire_w_gaussian',
    label: 'Wire',
    name: 'wire_w_gaussian',
    category: 'electrostatic'
  },
  {
    id: 'singlePlane',
    label: '1 Plane',
    name: 'singlePlane',
    category: 'electrostatic'
  },
  {
    id: 'capacitor',
    label: 'Plate Capacitor',
    name: 'capacitor',
    category: 'electrostatic'
  },
  {
    id: 'sphericalCapacitor',
    label: 'Sphere Capacitor',
    name: 'sphericalCapacitor',
    category: 'electrostatic'
  },
  /*{
    id: 'cylinder',
    label: 'Cylinder',
    name: 'cylinder',
    category: 'electrostatic'
  },*/
  {
    id: 'currentLoop',
    label: 'Current Loop',
    name: 'currentLoop',
    category: 'magnetostatic'
  },
  {
    id: 'induction',
    label: 'Induction',
    name: 'induction',
    category: 'magnetostatic'
  },
  {
    id: 'solenoid',
    label: 'Solenoid',
    name: 'solenoid',
    category: 'magnetostatic'
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

  // Group presets by category
  const groupedPresets = {
    electrostatic: PRESETS.filter(p => p.category === 'electrostatic'),
    magnetostatic: PRESETS.filter(p => p.category === 'magnetostatic')
  }

  return (
    <>
      <div className="presets-menu">
        <div className="presets-menu-panel">
          
          {/* Electrostatic Presets */}
          {groupedPresets.electrostatic.length > 0 && (
            <div className="presets-menu-section">
              <div className="presets-menu-category-label">Electrostatic</div>
              <div className="presets-menu-grid">
                {groupedPresets.electrostatic.map(preset => (
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
          )}

          {/* Magnetostatic Presets */}
          {groupedPresets.magnetostatic.length > 0 && (
            <div className="presets-menu-section">
              <div className="presets-menu-category-label">Magnetostatic</div>
              <div className="presets-menu-grid">
                {groupedPresets.magnetostatic.map(preset => (
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
          )}

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
