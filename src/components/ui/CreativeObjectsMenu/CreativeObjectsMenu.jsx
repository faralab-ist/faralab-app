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
    id: 'testCoil',
    label: 'Test Loop',
    type: 'testCoil',
    defaultProps: { position: [0, 0, 0] },
    category: 'test'
  },
  {
    id: 'ringCoil',
    label: 'Ring Loop',
    type: 'ringCoil',
    defaultProps: { position: [0, 0, 0] },
    category: 'magnetic'
  },
  {
    id: 'polygonCoil',
    label: 'Polygon Loop',
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
    label: 'Faraday Loop',
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

export default function CreativeObjectsMenu({ addObject, sidebarState }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const handleAddObject = (obj) => {
    addObject?.(obj.type, obj.defaultProps)
  }

  const handleToggleMenu = () => {
    setIsExpanded(true)
  }

  const handleMouseLeave = () => {
    setIsExpanded(false)
  }

  // Group objects by category
  const electricObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'electric')
  const magneticObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'magnetic')
  const testObjects = CREATIVE_OBJECTS.filter(obj => obj.category === 'test')

  // Calculate left offset based on sidebar state
  const sidebarWidth = sidebarState?.width || 0;
  const leftOffset = 20 + sidebarWidth;

  return (
    <div 
      className={`creative-objects-menu ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseLeave={handleMouseLeave}
      style={{ left: `${leftOffset}px` }}
    >
      <div className={`creative-menu-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
        
        {!isExpanded && (
          <button 
            className="creative-menu-toggle-button" 
            title="Add Objects"
            onClick={handleToggleMenu}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="11" y1="4" x2="11" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="4" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
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
