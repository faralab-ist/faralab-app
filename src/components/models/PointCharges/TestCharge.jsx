import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import BaseCharge from './BaseCharge'
import calculateFieldAtPoint from '../../../utils/calculateField'
import Label from '../../ui/labels/Label'

export default function TestCharge({position = [0, 0, 0], sceneObjects, updateObject, showLabel = true, ...props }) {
  
  // Fixed visuals for a test charge - subtle glow to prevent recording bloom
  const visuals = useMemo(() => ({
    baseColor: new THREE.Color(0xaaaaaa), // Medium gray
    glowString: 'rgba(170,170,170,',        // Medium gray string for proper gradient
    visualScale: 1.15,                       // Small scale to prevent bloom
    visualOpacity: 0.6,                    // Low opacity to prevent solid appearance
    hitboxRadius: 0.4
  }), [])


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
      
      {showLabel && (
        <Label
          position={position}
          name="E-field Info"
          value={[
            `E = ${efieldMagnitude.toExponential(2)} N/C`,
            `dir: (${efieldDirection.map(v => v.toFixed(2)).join(', ')})`
          ]}
          offsetY={0.5}
          distanceFactor={8}
        />
      )}
    </group>
  )
}