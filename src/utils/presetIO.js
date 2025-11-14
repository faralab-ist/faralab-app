/**
 * Export/Import utilities for custom presets
 * Exports scene state to JSON matching context.json format
 */

/**
 * Export current scene as JSON and trigger download
 * @param {Object} params
 * @param {Array} params.sceneObjects - Current scene objects
 * @param {Object} params.camera - Camera state { position, target }
 * @param {Object} params.settings - UI settings (vectorMinTsl, vectorScale, etc.)
 * @param {string} params.name - Preset name (default: 'custom-preset')
 */
export function exportPreset({ sceneObjects, camera, settings, name = 'custom-preset' }) {
  // Build preset structure matching context.json format
  const preset = {
    context: {}, // Empty context by default, user can add variables manually
    camera: {
      position: camera.position || [5, 5, 5],
      target: camera.target || [0, 0, 0]
    },
    settings: {
      vectorMinTsl: settings.vectorMinTsl ?? 0.08,
      vectorScale: settings.vectorScale ?? 1.2,
      lineMin: settings.lineMin ?? 0.12,
      lineNumber: settings.lineNumber ?? 28,
      showField: settings.showField ?? false,
      showLines: settings.showLines ?? false,
      showEquipotentialSurface: settings.showEquipotentialSurface ?? false,
      showOnlyGaussianField: settings.showOnlyGaussianField ?? false
    },
    objects: sceneObjects.map(obj => {
      const baseProps = {
        position: obj.position || [0, 0, 0]
      }

      // Add direction if it exists (for wires, planes, charged spheres)
      if (obj.direction) {
        baseProps.direction = obj.direction
      }

      // Map object types to props
      switch (obj.type) {
        case 'charge':
          return {
            type: 'charge',
            props: {
              ...baseProps,
              charge: obj.charge ?? 1,
              radius: obj.radius ?? 0.1
            }
          }
        
        case 'wire':
          return {
            type: 'wire',
            props: {
              ...baseProps,
              charge_density: obj.charge_density ?? 0.1,
              charge: obj.charge,
              infinite: obj.infinite ?? true,
              length: obj.length ?? 5,
              radius: obj.radius ?? 0.03,
              material: obj.material
            }
          }
        
        case 'plane':
          return {
            type: 'plane',
            props: {
              ...baseProps,
              charge_density: obj.charge_density ?? 0.1,
              charge: obj.charge,
              infinite: obj.infinite ?? true,
              dimensions: obj.dimensions || [10, 10, 0.1],
              material: obj.material
            }
          }
        
        case 'chargedSphere':
          return {
            type: 'chargedSphere',
            props: {
              ...baseProps,
              charge: obj.charge ?? 1,
              charge_density: obj.charge_density,
              radius: obj.radius ?? 1,
              isHollow: obj.isHollow ?? false,
              material: obj.material
            }
          }
        
        case 'surface':
          return {
            type: 'surface',
            surfaceType: obj.surfaceType,
            props: {
              ...baseProps,
              charge_density: obj.charge_density ?? 0,
              opacity: obj.opacity ?? 0.5,
              // Surface-specific props
              ...(obj.surfaceType === 'sphere' && { radius: obj.radius ?? 1 }),
              ...(obj.surfaceType === 'cylinder' && { 
                radius: obj.radius ?? 1, 
                height: obj.height ?? 2 
              }),
              ...(obj.surfaceType === 'cuboid' && { 
                width: obj.width ?? 2, 
                height: obj.height ?? 2, 
                depth: obj.depth ?? 2 
              })
            }
          }
        
        default:
          return { type: obj.type, props: baseProps }
      }
    })
  }

  // Convert to JSON and trigger download
  const json = JSON.stringify(preset, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Import preset from JSON file
 * @param {File} file - JSON file from input
 * @param {Function} callback - Callback with parsed preset data
 */
export function importPreset(file, callback) {
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const preset = JSON.parse(e.target.result)
      
      // Validate basic structure
      if (!preset.objects || !Array.isArray(preset.objects)) {
        throw new Error('Invalid preset format: missing objects array')
      }
      
      callback(null, preset)
    } catch (error) {
      callback(error, null)
    }
  }
  
  reader.onerror = () => {
    callback(new Error('Failed to read file'), null)
  }
  
  reader.readAsText(file)
}
