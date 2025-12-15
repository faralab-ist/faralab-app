import { useCallback } from 'react'
import { applyPresetByName } from '../presets/loader'

export default function useApplyPreset({
  // scene ops
  addObject,
  setSceneObjects,
  updatePosition,
  // camera ops
  animateCameraPreset,
  setCameraPreset,
  // UI states + toggles
  showField,
  onToggleField,
  showOnlyGaussianField,
  onToggleOnlyGaussianField,
  showLines,
  onToggleLines,
  showEquipotentialSurface,
  onToggleEquipotentialSurface,
  // settings setters
  setVectorMinTsl,
  setVectorScale,
  setLineMin,
  setLineNumber,
  onToggleBField,
  showBField
}) {
  return useCallback((nameOrPreset, { animate = true, isCustom = false } = {}) => {
    const onCamera = animate ? animateCameraPreset : setCameraPreset
    const visProvided = { field: false, onlyGauss: false, lines: false, equip: false }

    const onSettings = (st = {}) => {
      if (st.vectorMinTsl != null) setVectorMinTsl?.(st.vectorMinTsl)
      if (st.vectorScale  != null) setVectorScale?.(st.vectorScale)
      if (st.lineMin      != null) setLineMin?.(st.lineMin)
      if (st.lineNumber   != null) setLineNumber?.(st.lineNumber)

      if (st.showField !== undefined && onToggleField) {
        visProvided.field = true
        if (st.showField !== showField) onToggleField()
      }
      if (st.showBField !== undefined && onToggleBField) {
        visProvided.field = true
        if (st.showBField !== showBField) onToggleBField()
      }
      if (st.showOnlyGaussianField !== undefined && onToggleOnlyGaussianField) {
        visProvided.onlyGauss = true
        if (st.showOnlyGaussianField !== showOnlyGaussianField) onToggleOnlyGaussianField()
      }
      if (st.showLines !== undefined && onToggleLines) {
        visProvided.lines = true
        if (st.showLines !== showLines) onToggleLines()
      }
      if (st.showEquipotentialSurface !== undefined && onToggleEquipotentialSurface) {
        visProvided.equip = true
        if (st.showEquipotentialSurface !== showEquipotentialSurface) onToggleEquipotentialSurface()
      }
    }

    // Handle custom preset (imported JSON) or preset name
    if (isCustom && typeof nameOrPreset === 'object') {
      // Custom preset object
      const preset = nameOrPreset
      
      // Clear scene
      setSceneObjects?.([])
      
      // Apply camera
      if (preset.camera) {
        onCamera?.(preset.camera)
      }
      
      // Apply settings
      if (preset.settings) {
        onSettings(preset.settings)
      }
      
      // Add objects
      if (preset.objects) {
        preset.objects.forEach(({ type, props, surfaceType }) => {
          if (type === 'surface') {
            addObject?.(surfaceType, props)
          } else {
            addObject?.(type, props)
          }
        })
      }
    } else {
      // Named preset
      applyPresetByName(nameOrPreset, addObject, setSceneObjects, updatePosition, onCamera, onSettings)
    }

    // Legacy auto-on behavior if preset didn't specify
    if (!visProvided.field && showField === false && onToggleField) onToggleField()
    if (!visProvided.onlyGauss && showOnlyGaussianField === false && onToggleOnlyGaussianField) onToggleOnlyGaussianField()
  }, [
    addObject, setSceneObjects, updatePosition,
    animateCameraPreset, setCameraPreset,
    showField, onToggleField,
    showOnlyGaussianField, onToggleOnlyGaussianField,
    showLines, onToggleLines,
    showEquipotentialSurface, onToggleEquipotentialSurface,
    setVectorMinTsl, setVectorScale, setLineMin, setLineNumber
  ])
}