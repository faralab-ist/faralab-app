import React from 'react'
import { Html } from '@react-three/drei'
import './Label.css'

/**
 * Reusable 3D label component for displaying info about scene objects.
 * Renders as floating HTML positioned in 3D space.
 * 
 * @param {Array} position - [x, y, z] position in 3D space
 * @param {string|Array} name - Label name(s) to display. Can be single string or array of strings.
 * @param {string|number|Array} value - Value(s) to display. Can be single value or array matching names.
 * @param {number} offsetY - Vertical offset from position (default: 0.5)
 * @param {number} distanceFactor - Scale factor for distance-based sizing (default: 8)
 * @param {string} className - Additional CSS class for custom styling
 */
export default function Label({ 
  position = [0, 0, 0], 
  name, 
  value, 
  offsetY = 0.5,
  distanceFactor = 8,
  className = ''
}) {
  // Support both single and multiple name-value pairs
  const isSingleHeader = typeof name === 'string' && Array.isArray(value)
  const names = Array.isArray(name) ? name : [name]
  const values = Array.isArray(value) ? value : [value]

  const labelPosition = [position[0], position[1] + offsetY, position[2]]

  return (
    <Html
      position={labelPosition}
      distanceFactor={distanceFactor}
      zIndexRange={[100, 0]}
      style={{ 
        transform: 'translate3d(-50%, -100%, 0)',
        pointerEvents: 'none',
        userSelect: 'none',
        paddingBottom: '10px'
      }}
    >
      <div className={`label-wrap ${className}`}>
        <div className="label-panel">
          {isSingleHeader ? (
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
          )}
        </div>
      </div>
    </Html>
  )
}
