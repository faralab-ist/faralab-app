import React from 'react'
import { Html } from '@react-three/drei'

/**
 * Layer number label for stacked/concentric objects.
 * Displays layer numbering in the 3D viewport.
 * 
 * @param {number} layerIndex - Zero-based index of the layer
 * @param {Array} position - [x, y, z] position in 3D space
 * @param {number} scale - Scale factor for the label (default: 0.8)
 */
export default function LayerLabel({ enabled = false, layerIndex, position, scale = 0.8 }) {
  if (!enabled) return null;
  return (
    <Html position={position} scale={scale} occlude={false} center>
      <div style={{
        background: 'transparent',
        opacity: 0.8,
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold',
        userSelect: 'none',
        pointerEvents: 'none',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      }}>
        {layerIndex + 1}
      </div>
    </Html>
  )
}
