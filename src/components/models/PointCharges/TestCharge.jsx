import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import BaseCharge from './BaseCharge'
import './TestCharge.css'

export default function TestCharge({ eFieldValue = 0, eFieldDirection = [0, 0, 0], position = [0, 0, 0], ...props }) {
  
  // Fixed visuals for a test charge
  const visuals = useMemo(() => ({
    baseColor: new THREE.Color(0xffffff), // White
    glowString: 'rgba(255, 255, 255,',      // White string for canvas
    visualScale: 1.0,                     // Fixed small size
    visualOpacity: 0.2,                   // Slightly distinct opacity
    hitboxRadius: 0.4
  }), [])

  // Format the field magnitude
  const fieldMagnitude = useMemo(() => {
    return eFieldValue.toExponential(2)
  }, [eFieldValue])

  // Format direction vector (normalized)
  const directionText = useMemo(() => {
    const [x, y, z] = eFieldDirection
    const mag = Math.sqrt(x*x + y*y + z*z)
    if (mag === 0) return '(0, 0, 0)'
    return `(${(x/mag).toFixed(2)}, ${(y/mag).toFixed(2)}, ${(z/mag).toFixed(2)})`
  }, [eFieldDirection])

  return (
    <group>
      <BaseCharge
        {...props}
        position={position}
        baseColor={visuals.baseColor}
        glowString={visuals.glowString}
        visualScale={visuals.visualScale}
        visualOpacity={visuals.visualOpacity}
        hitboxRadius={visuals.hitboxRadius}
        type="testPointCharge"
      />
      
      {/* Floating Nametag */}
      <Html
        position={[position[0], position[1] + 0.5, position[2]]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="test-charge-label">
          <div className="test-charge-magnitude">
            E = {fieldMagnitude} N/C
          </div>
          <div className="test-charge-direction">
            dir: {directionText}
          </div>
        </div>
      </Html>
    </group>
  )
}