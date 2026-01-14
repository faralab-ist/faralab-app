import React from 'react'
import sphereIcon from '../../../../assets/sphere.svg'
import cylinderIcon from '../../../../assets/cylinder.svg'
import cuboidIcon from '../../../../assets/cuboid.svg'
import flux from '../../../../assets/flux.svg'
import './GaussianMenu.css'

export const GAUSSIAN_MENU_NAME = 'Gaussian Menu'

export default function GaussianMenu({
  minimized,
  addObject,
  sceneObjects,
  setSceneObjects,
  showOnlyGaussianField,
  setOnlyGaussianField,
  showField,
  onToggleField
}) {
  if (minimized) return null

  const isGaussian = o =>
    o &&
    (['sphere','cylinder','cuboid'].includes(o.type) ||
     (o.type === 'surface' && ['sphere','cylinder','cuboid'].includes(o.surfaceType)))

  const surfaceTypeOf = o => (o.type === 'surface' ? o.surfaceType : o.type)

  const gaussianSurfaces = React.useMemo(
    () => (sceneObjects ?? []).filter(isGaussian),
    [sceneObjects]
  )

  const exclusiveActiveType = gaussianSurfaces.length === 1
    ? surfaceTypeOf(gaussianSurfaces[0])
    : null

  const anyGaussian = gaussianSurfaces.length > 0

  const ensureFieldVisible = () => {
    if (!showField) onToggleField?.()
  }

  const addSurface = (type) => {
    addObject?.(type, { position: [0,0,0] })
    ensureFieldVisible()
  }

  const handleSurfaceButton = (type) => {
    // Always add surface directly
    addSurface(type)
  }

  return (
    <div className="gaussian-menu-container">
      <div className="settings-info">
        Create Gaussian surfaces for flux calculations.
      </div>
      
      <div className="surface-buttons-row">
        <button
          className={`surface-icon-btn ${exclusiveActiveType === 'sphere' ? 'active' : ''}`}
          onClick={() => handleSurfaceButton('sphere')}
          title="Create Gaussian Sphere"
        >
          <img src={sphereIcon} alt="" />
          <span>Guassian Sphere</span>
        </button>
        <button
          className={`surface-icon-btn ${exclusiveActiveType === 'cylinder' ? 'active' : ''}`}
          onClick={() => handleSurfaceButton('cylinder')}
          title="Create Cylinder"
        >
          <img src={cylinderIcon} alt="" />
          <span>Cylinder</span>
        </button>
        <button
          className={`surface-icon-btn ${exclusiveActiveType === 'cuboid' ? 'active' : ''}`}
          onClick={() => handleSurfaceButton('cuboid')}
          title="Create Cuboid"
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
  )
}
