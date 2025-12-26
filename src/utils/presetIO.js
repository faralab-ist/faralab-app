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
      vectorStep: settings.vectorStep ?? 1,
      lineMin: settings.lineMin ?? 0.12,
      lineNumber: settings.lineNumber ?? 28,
      showField: settings.showField ?? false,
      showBField: settings.showBField ?? false,
      showLines: settings.showLines ?? false,
      showEquipotentialSurface: settings.showEquipotentialSurface ?? false,
      showOnlyGaussianField: settings.showOnlyGaussianField ?? false,
      planeFilter: settings.planeFilter ?? null,
      slicePlane: settings.slicePlane ?? null,
      slicePos: settings.slicePos ?? 0,
      useSlice: settings.useSlice ?? false,
      slicePlaneFlip: settings.slicePlaneFlip ?? false,
      showSlicePlaneHelper: settings.showSlicePlaneHelper ?? true
    },
    objects: sceneObjects.map(obj => {
      const baseProps = {
        position: obj.position || [0, 0, 0]
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

        case 'testPointCharge':
          return {
            type: 'testPointCharge',
            props: {
              ...baseProps,
              charge: obj.charge ?? 0,
              radius: obj.radius ?? 0.03
            }
          }
        
        case 'wire':
          // Extract direction from quaternion if available
          let wireDirection = obj.direction || [0, 0, 1]
          if (obj.quaternion && obj.quaternion.length === 4) {
            // Derive direction from quaternion
            const q = { x: obj.quaternion[0], y: obj.quaternion[1], z: obj.quaternion[2], w: obj.quaternion[3] }
            const dir = { x: 0, y: 1, z: 0 } // cylinder local axis
            // Apply quaternion rotation: v' = q * v * q^-1
            const ix = q.w * dir.x + q.y * dir.z - q.z * dir.y
            const iy = q.w * dir.y + q.z * dir.x - q.x * dir.z
            const iz = q.w * dir.z + q.x * dir.y - q.y * dir.x
            const iw = -q.x * dir.x - q.y * dir.y - q.z * dir.z
            wireDirection = [
              ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
              iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
              iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x
            ]
          }
          
          return {
            type: 'wire',
            props: {
              ...baseProps,
              direction: wireDirection,
              quaternion: obj.quaternion, // Save full rotation
              charge_density: obj.charge_density ?? 1,
              charge: obj.charge ?? 1,
              infinite: obj.infinite ?? false,
              height: obj.height ?? 1,
              radius: obj.radius ?? 0.03,
              material: obj.material || 'Dielectric'
            }
          }
        
        case 'plane':
          return {
            type: 'plane',
            props: {
              ...baseProps,
              direction: obj.direction || [0, 1, 0], // Keep for backwards compatibility
              quaternion: obj.quaternion, // Save full rotation
              charge_density: obj.charge_density ?? 5,
              charge: obj.charge ?? 1,
              infinite: obj.infinite ?? false,
              dimensions: obj.dimensions || [4, 4],
              material: obj.material || 'Dielectric'
            }
          }
        
        case 'chargedSphere':
          return {
            type: 'chargedSphere',
            props: {
              ...baseProps,
              direction: obj.direction || [0, 1, 0], // Keep for backwards compatibility
              quaternion: obj.quaternion, // Save full rotation
              charge: obj.charge ?? 1,
              charge_density: obj.charge_density ?? 5,
              radius: obj.radius ?? 1,
              isHollow: obj.isHollow ?? false,
              material: obj.material || 'Dielectric'
            }
          }

        case 'stackedPlanes':
          return {
            type: 'stackedPlanes',
            props: {
              ...baseProps,
              charge_densities: obj.charge_densities ?? [0.1],
              spacing: obj.spacing ?? 1,
              rotation: obj.rotation || [0, 0, 0],
              direction: obj.direction || [0, 1, 0],
              dimensions: obj.dimensions || [4, 4],
              planeWidth: obj.planeWidth ?? 5,
              planeHeight: obj.planeHeight ?? 5,
              infinite: obj.infinite ?? false
            }
          }

        case 'concentricSpheres':
          return {
            type: 'concentricSpheres',
            props: {
              ...baseProps,
              radiuses: obj.radiuses ?? [],
              materials: obj.materials ?? [],
              dielectrics: obj.dielectrics ?? [],
              charges: obj.charges ?? [],
              direction: obj.direction || [0, 1, 0]
            }
          }

        case 'concentricInfWires':
          return {
            type: 'concentricInfWires',
            props: {
              ...baseProps,
              radiuses: obj.radiuses ?? [],
              materials: obj.materials ?? [],
              dielectrics: obj.dielectrics ?? [],
              charges: obj.charges ?? [],
              direction: obj.direction || [0, 1, 0],
              rotation: obj.rotation || [0, 0, 0]
            }
          }

        case 'path':
          return {
            type: 'path',
            props: {
              ...baseProps,
              points: obj.points ?? [],
              charges: obj.charges ?? [],
              tangents: obj.tangents ?? [],
              chargeCount: obj.chargeCount ?? 1,
              charge: obj.charge ?? 1,
              velocity: obj.velocity ?? 1,
              isClosedPath: obj.isClosedPath ?? false
            }
          }

        case 'coil':
          return {
            type: 'coil',
            props: {
              ...baseProps,
              coilType: obj.coilType ?? 'ring',
              coilRadius: obj.coilRadius ?? 1.5,
              tubeRadius: obj.tubeRadius ?? 0.01,
              coilColor: obj.coilColor ?? '#6ea8ff',
              direction: obj.direction || [0, 1, 0],
              rotation: obj.rotation || [0, 0, 0],
              sides: obj.sides ?? 3,
              chargeCount: obj.chargeCount ?? 5,
              charge: obj.charge ?? 1,
              velocity: obj.velocity ?? 1,
              renderCharges: obj.renderCharges ?? true,
              charges: obj.charges ?? []
            }
          }
        
        case 'surface':
        case 'sphere':
        case 'cylinder':
        case 'cuboid': {
          const surfaceType =
            obj.surfaceType ??
            obj.subtype ??
            (obj.type === 'sphere' || obj.type === 'cylinder' || obj.type === 'cuboid' ? obj.type : undefined)

          return {
            type: 'surface',
            surfaceType: surfaceType,
            props: {
              ...baseProps,
              charge_density: obj.charge_density ?? 0,
              opacity: obj.opacity ?? 0.5,
              deformable: obj.deformable ?? true,
              fixed: obj.fixed ?? true,
              rotation: obj.rotation ?? [0, 0, 0],
              quaternion: obj.quaternion,
              sampleCount: obj.sampleCount ?? 64,
              // Surface-specific props
              ...(surfaceType === 'sphere' && { radius: obj.radius ?? 2 }),
              ...(surfaceType === 'cylinder' && { 
                radius: obj.radius ?? 2, 
                height: obj.height ?? 6 
              }),
              ...(surfaceType === 'cuboid' && { 
                width: obj.width ?? 2, 
                height: obj.height ?? 2, 
                depth: obj.depth ?? 5 
              })
            }
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
