import React, { useState } from 'react'
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
  },
  {
    id: 'faradayCoil',
    label: 'Faraday Coil',
    type: 'faradayCoil',
    defaultProps: { position: [0, 0, 0] },
    category: 'magnetic'
  },
  {
    id: 'barMagnet',
    label: 'Bar Magnet',
    type: 'barMagnet',
    defaultProps: { position: [0, 0, 0] },
    category: 'magnetic'
  },
  {
    id: 'solenoid',
    label: 'Solenoid',
    type: 'solenoid',
    defaultProps: { position: [0, 0, 0] },
    category: 'magnetic'
  }
]

export default function CreativeObjectsMenu({ addObject, isVisible }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!isVisible) return null

  const handleAddObject = (obj) => {
    addObject?.(obj.type, obj.defaultProps)
  }

  const handleMouseEnter = () => {
    setIsExpanded(true)
  }

  const handleMouseLeave = () => {
    setIsExpanded(false)
  }

  // Group objects by category
  const electricObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'electric')
  const magneticObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'magnetic')
  const testObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'test')

  return (
    <div 
      className="creative-objects-menu"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`creative-menu-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
        
        {!isExpanded && (
          <button className="creative-menu-toggle-button" title="Add Objects">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L19 7.5V16.5L12 21L5 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 12V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 12L19 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 12L5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="19" cy="5" r="3" fill="currentColor"/>
              <line x1="19" y1="3.5" x2="19" y2="6.5" stroke="rgba(19, 19, 19, 0.92)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="17.5" y1="5" x2="20.5" y2="5" stroke="rgba(19, 19, 19, 0.92)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {isExpanded && (
          <>
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
          </>
        )}

      </div>
    </div>
  )
}

// Export the configuration for potential reuse
export { CREATIVE_OBJECTS }
