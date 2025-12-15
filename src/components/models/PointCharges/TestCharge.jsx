import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import BaseCharge from './BaseCharge'
import calculateFieldAtPoint from '../../../utils/calculateField'
import './TestCharge.css'

export default function TestCharge({ eFieldValue = 0, eFieldDirection = [0, 0, 0], position = [0, 0, 0], sceneObjects, updateObject, ...props }) {
  
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


  // Calculate E-field, excluding this test charge itself
  const otherObjects = useMemo(() => 
    sceneObjects.filter(obj => obj.id !== props.id),
    [sceneObjects, props.id]
  )
  
  const { efieldMagnitude, efieldDirection } = useMemo(() => {
    const targetPos = new THREE.Vector3(...position)
    const efield = calculateFieldAtPoint(otherObjects, targetPos)
    const mag = efield.length()
    const dir = mag > 0 ? efield.clone().normalize().toArray() : [0, 0, 0]
    return { efieldMagnitude: mag, efieldDirection: dir }
  }, [otherObjects, position])

  // Update the object with calculated E-field values
  useEffect(() => {
    if (updateObject && props.id) {
      updateObject(props.id, {
        eFieldValue: efieldMagnitude,
        eFieldDirection: efieldDirection
      })
    }
  }, [efieldMagnitude, efieldDirection, props.id, updateObject])

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
            E = {efieldMagnitude.toExponential(2)} N/C
          </div>
          <div className="test-charge-direction">
            dir: {`(${efieldDirection.map(v => v.toFixed(2)).join(', ')})`}
          </div>
        </div>
      </Html>
    </group>
  )
}