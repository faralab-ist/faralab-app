import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import BaseCharge from './BaseCharge'
import Label from '../../ui/labels/Label'

export default function Charge({ charge, position = [0, 0, 0], showLabel = true, onHideLabel, updateObject, ...props }) {
  const radius = props.radius
  const { glowColor, glowString, visualScale, visualOpacity } = useMemo(() => {
    const sign = charge >= 0 ? 1 : -1
    
    // Colors
    const glowColor = sign >= 0 ? new THREE.Color(0x6ea8ff) : new THREE.Color(0xff6e6e)
    const glowString = sign >= 0 ? 'rgba(110,168,255,' : 'rgba(255,110,110,'
    
    // Scale & Intensity logic
    const magnitude = Math.min(4, Math.max(0.2, Math.abs(charge)))
    const baseGlowScale = 1 + magnitude * 0.6
    const finalScale = baseGlowScale * Math.max(0.8, radius || 1)
    const opacity = Math.min(1, 0.65 + Math.abs(charge) * 0.22)

    return { glowColor, glowString, visualScale: finalScale, visualOpacity: opacity }
  }, [charge, radius])

  // Store label info for Data sidebar
  useEffect(() => {
    updateObject?.(props.id, {
      labelInfo: [`Q = ${charge > 0 ? '+' : ''}${charge} C`]
    })
  }, [charge, props.id, updateObject])

  return (
    <group>
      <BaseCharge
        {...props}
        position={position}
        baseColor={glowColor}
        glowString={glowString}
        visualScale={visualScale}
        visualOpacity={visualOpacity}
        hitboxRadius={Math.max(0.3, (radius || 0.2) * 1.5)}
        type='charge'
      />
    {showLabel && (
      <Label 
        position={position}
        objectName={props.name}
        value={`Q = ${charge > 0 ? '+' : ''}${charge} C`}
        offsetY={0.6}
        objectId={props.id}
        onHideLabel={onHideLabel}
      />
    )}
    </group>
  )
}