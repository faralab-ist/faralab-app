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
  setLineNumber
}) {
  return useCallback((name, { animate = true } = {}) => {
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

    applyPresetByName(name, addObject, setSceneObjects, updatePosition, onCamera, onSettings)

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