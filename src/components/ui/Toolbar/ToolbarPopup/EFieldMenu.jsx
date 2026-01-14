import React, { useState } from 'react'
import EfieldButtons from '../../SettingsButtons/SubButtons/EfieldButtons'
import PotButtons from '../../SettingsButtons/SubButtons/PotButtons'
import PlaneButtons from '../../SettingsButtons/SubButtons/PlaneButtons'
import './EFieldMenu.css'

export const EFIELD_MENU_NAME = 'Visualization Menu'

export default function EFieldMenu({
  minimized,
  showField,
  onToggleField,
  showLines,
  onToggleLines,
  showEquipotentialSurface,
  onToggleEquipotentialSurface,
  vectorMinTsl,
  setVectorMinTsl,
  vectorScale,
  setVectorScale,
  vectorStep,
  setVectorStep,
  lineMin,
  setLineMin,
  lineNumber,
  setLineNumber,
  activePlane,
  onPlaneSelect,
  potentialTarget,
  setPotentialTarget,
  wavePropagationEnabled,
  setWavePropagationEnabled,
  waveDuration,
  setWaveDuration,
  sceneObjects,
  showBField,
  onToggleBField
}) {
  // Tab state: 'efield' | 'potential'
  const [fieldTab, setFieldTab] = useState('efield')

  // Check if there's any field in the scene
  const isGaussian = o =>
    o &&
    (['sphere','cylinder','cuboid'].includes(o.type) ||
     (o.type === 'surface' && ['sphere','cylinder','cuboid'].includes(o.surfaceType)))

  const hasField = React.useMemo(() => {
    if (!sceneObjects) return false
    return sceneObjects.some(o => {
      if (isGaussian(o)) return false
      const q = Number(o?.charge)
      return (Number.isFinite(q) && q !== 0) ||
        ((o.type === 'concentricSpheres' || o.type === 'concentricInfWires') && o.radiuses?.length !== 0) ||
        (o.type === 'stackedPlanes' && o.charge_densities?.length !== 0)
    })
  }, [sceneObjects])

  // Check if there's any magnetic field in the scene (path, coil, ringCoil, polygonCoil)
  const hasBField = React.useMemo(() => {
    if (!sceneObjects) return false
    return sceneObjects.some(o => 
      o.type === 'path' || 
      o.type === 'coil' || 
      o.type === 'ringCoil' || 
      o.type === 'polygonCoil' ||
      (o.type === 'coil' && (o.coilType === 'ring' || o.coilType === 'polygon')) ||
      o.type === 'barMagnet'
    )
  }, [sceneObjects])

  if (minimized) {
    return null
  }

  return (
    <div className="efield-menu-container">
      {/* Tabs header */}
      <div className="fieldview-tabs">
        <button
          className={`fieldview-tab ${fieldTab === 'efield' ? 'active' : ''}`}
          onClick={() => setFieldTab('efield')}
        >
          Field View
        </button>
        <button
          className={`fieldview-tab ${fieldTab === 'potential' ? 'active' : ''}`}
          onClick={() => setFieldTab('potential')}
        >
          Potential
        </button>
      </div>

      {/* Tab content */}
      <div className="fieldview-content">
        {fieldTab === 'efield' && (
          <EfieldButtons
            inline={true}
            hasField={hasField}
            hasBField={hasBField}
            showBField={showBField}
            onToggleBField={onToggleBField}
            wavePropagationEnabled={wavePropagationEnabled}
            setWavePropagationEnabled={setWavePropagationEnabled}
            waveDuration={waveDuration}
            setWaveDuration={setWaveDuration}
            onToggleField={onToggleField}
            onToggleLines={onToggleLines}
            vectorMinTsl={vectorMinTsl}
            setVectorMinTsl={setVectorMinTsl}
            vectorStep={vectorStep}
            setVectorStep={setVectorStep}
            activePlane={activePlane}
            onPlaneSelect={onPlaneSelect}
            showField={showField}
            vectorScale={vectorScale}
            setVectorScale={setVectorScale}
            lineMin={lineMin}
            setLineMin={setLineMin}
            showLines={showLines}
            lineNumber={lineNumber}
            setLineNumber={setLineNumber}
          />
        )}

        {fieldTab === 'potential' && (
          <PotButtons
            inline={true}
            onToggleEquipotentialSurface={onToggleEquipotentialSurface}
            showEquipotentialSurface={showEquipotentialSurface}
            potentialTarget={potentialTarget}
            setPotentialTarget={setPotentialTarget}
          />
        )}
      </div>

      {/* Plane buttons at the bottom */}
      <div className="fieldview-plane-bottom">
        <PlaneButtons activePlane={activePlane} onPlaneSelect={onPlaneSelect} />
      </div>
    </div>
  )
}
