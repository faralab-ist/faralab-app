import React, { useState, useEffect } from 'react'
import { Html } from '@react-three/drei'
import './Label.css'
import { useSetHoveredId } from '../../../hooks/useHoverContext'


/**
 * Reusable 3D label component for displaying info about scene objects.
 * Renders as floating HTML positioned in 3D space.
 * 
 * @param {Array} position - [x, y, z] position in 3D space
 * @param {string} objectName - Name of the object being labeled; shown as the main header when provided
 * @param {string|Array} name - Label name(s) to display. Can be single string or array of strings.
 * @param {string|number|Array} value - Value(s) to display. Can be single value or array matching names.
 * @param {number} offsetY - Vertical offset from position (default: 0.5)
 * @param {number} distanceFactor - Scale factor for distance-based sizing (default: 8)
 * @param {string} className - Additional CSS class for custom styling
 * @param {string} objectId - ID of the object to hide label for
 * @param {Function} onHideLabel - Callback to hide this label
 */
export default function Label({ 
  position = [0, 0, 0], 
  objectName,
  headerContent,
  name, 
  value, 
  offsetY = 0.5,
  distanceFactor = 8,
  className = '',
  objectId,
  onHideLabel,
  isObjectHovered,
 }) {
  const [isHovered, setIsHovered] = useState(false)
  const setHoveredId = useSetHoveredId()
  
  // Support both single and multiple name-value pairs
  const isSingleHeader = typeof name === 'string' && Array.isArray(value)
  const renderSingleHeader = !objectName && isSingleHeader
  const names = Array.isArray(name) ? name : [name]
  const values = Array.isArray(value) ? value : [value]

  const labelPosition = [position[0], position[1] + offsetY, position[2]]

  const interactive = Boolean(headerContent) || Boolean(onHideLabel)

  // Update hover state when object is hovered
  useEffect(() => {
    if (isObjectHovered) {
      setIsHovered(true)
    } else {
      setIsHovered(false)
    }
  }, [isObjectHovered])

  const handleCloseClick = (e) => {
    e.stopPropagation()
    if (onHideLabel && objectId) {
      onHideLabel(objectId)
    }
  }


  return (
    <Html
      position={labelPosition}
      distanceFactor={distanceFactor}
      zIndexRange={[0, 100]}
      style={{ 
        transform: 'translate3d(-50%, -100%, 0)',
        pointerEvents: 'auto',
        userSelect: 'auto',
        paddingBottom: '10px'
      }}
    >
      <div 
        className={`label-wrap ${className}`}
        onMouseEnter={() => {
          setIsHovered(true)
          setHoveredId?.(objectId)
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          setHoveredId?.(null)
        }}
      >
        <div className={`label-panel ${isHovered ? 'label-hovered' : ''}`}>
          {isHovered && onHideLabel && objectId && (
            <button 
              className="label-close-btn"
              onClick={handleCloseClick}
              title="Hide label"
            >
              ×
            </button>
          )}
          {/* Custom header content (e.g., editable POS for test charges) */}
          {headerContent ? (
            <div className="label-header">{headerContent}</div>
          ) : (
            objectName && (
              <div className="label-header">{objectName}</div>
            )
          )}
          {/* Show values when objectName is present OR when headerContent is provided */}
          {objectName || headerContent ? (
            // When objectName or headerContent is present, suppress subheaders and show values only
            <div className="label-content">
              {Array.isArray(value)
                ? value.map((val, idx) => (<div key={idx} className="label-value">{val}</div>))
                : (<span className="label-value">{value ?? ''}</span>)}
            </div>
          ) : (
            renderSingleHeader ? (
              <>
                <div className="label-header">{name}</div>
                <div className="label-content">
                  {values.map((val, idx) => (
                    <div key={idx} className="label-value">{val}</div>
                  ))}
                </div>
              </>
            ) : (
              names.map((n, idx) => (
                <div key={idx}>
                  {n && <div className="label-header">{n}</div>}
                  <div className="label-content">
                    <span className="label-value">{values[idx] ?? ''}</span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </Html>
  )
}
