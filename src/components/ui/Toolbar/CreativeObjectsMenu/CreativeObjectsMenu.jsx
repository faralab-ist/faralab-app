import React from 'react'
import './CreativeObjectsMenu.css'

// Configuration array - easy to modify and maintain
const CREATIVE_OBJECTS = [
  {
    id: 'charge',
    label: 'Charge',
    type: 'charge',
    defaultProps: { position: [0, 0, 0], charge: 1 },
    category: 'electric'
  },
  {
    id: 'wire',
    label: 'Wire',
    type: 'wire',
    defaultProps: { position: [0, 0, 0] },
    category: 'electric'
  },
  {
    id: 'plane',
    label: 'Plane',
    type: 'plane',
    defaultProps: { position: [0, 0, 0] },
    category: 'electric'
  },
  {
    id: 'chargedSphere',
    label: 'Charged Sphere',
    type: 'chargedSphere',
    defaultProps: { position: [0, 0, 0] },
    category: 'electric'
  },
  {
    id: 'path',
    label: 'Path',
    type: 'path',
    defaultProps: { position: [0, 0, 0] },
    category: 'magnetic'
  },
  {
    id: 'ringCoil',
    label: 'Ring Coil',
    type: 'ringCoil',
    defaultProps: { position: [0, 0, 0] },
    category: 'magnetic'
  },
  {
    id: 'polygonCoil',
    label: 'Polygon Coil',
    type: 'polygonCoil',
    defaultProps: { position: [0, 0, 0] },
    category: 'magnetic'
  },
  {
    id: 'testPointCharge',
    label: 'Test Charge',
    type: 'testPointCharge',
    defaultProps: { position: [0, 0, 0] },
    category: 'test'
  }
]

export default function CreativeObjectsMenu({ addObject, isVisible }) {
  if (!isVisible) return null

  const handleAddObject = (obj) => {
    addObject?.(obj.type, obj.defaultProps)
  }

  // Group objects by category
  const electricObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'electric')
  const magneticObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'magnetic')
  const testObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'test')

  return (
    <div className="creative-objects-menu">
      <div className="creative-menu-panel">
        
        {/* Electric Objects */}
        {electricObjects.length > 0 && (
          <div className="creative-menu-section">
            <div className="creative-menu-grid">
              {electricObjects.map(obj => (
                <button
                  key={obj.id}
                  className="creative-menu-item"
                  onClick={() => handleAddObject(obj)}
                  title={`Add ${obj.label}`}
                >
                  {obj.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Magnetic Objects */}
        {magneticObjects.length > 0 && (
          <div className="creative-menu-section">
            <div className="creative-menu-grid">
              {magneticObjects.map(obj => (
                <button
                  key={obj.id}
                  className="creative-menu-item"
                  onClick={() => handleAddObject(obj)}
                  title={`Add ${obj.label}`}
                >
                  {obj.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Test Objects */}
        {testObjects.length > 0 && (
          <div className="creative-menu-section">
            <div className="creative-menu-grid">
              {testObjects.map(obj => (
                <button
                  key={obj.id}
                  className="creative-menu-item"
                  onClick={() => handleAddObject(obj)}
                  title={`Add ${obj.label}`}
                >
                  {obj.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// Export the configuration for potential reuse
export { CREATIVE_OBJECTS }
