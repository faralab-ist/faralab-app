import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Hook to handle charge animations:
 * - Position oscillation (up/down movement)
 * - Charge variation (oscillating between -5 and 5)
 */
export default function useChargeAnimations({ 
  id,
  basePosition, 
  baseCharge, 
  oscillating, 
  varyingCharge, 
  updatePosition,
  updateObject 
}) {
  const timeRef = useRef(0)
  const initialPosRef = useRef(basePosition)

  // Update initial position when base position changes externally (e.g., manual drag)
  useEffect(() => {
    if (!oscillating) {
      initialPosRef.current = basePosition
    }
  }, [basePosition, oscillating])

  useFrame((state, delta) => {
    timeRef.current += delta
    const time = timeRef.current

    // Position oscillation: oscillate vertically (Y-axis) with amplitude of 1 unit
    if (oscillating) {
      const amplitude = 1.0
      const frequency = 0.3 // 0.3 Hz (slower oscillation)
      const yOffset = Math.sin(time * frequency * 2 * Math.PI) * amplitude
      
      const newPosition = [
        initialPosRef.current[0],
        initialPosRef.current[1] + yOffset,
        initialPosRef.current[2]
      ]
      
      updatePosition(id, newPosition)
    }

    // Charge variation: oscillate between -5 and 5
    if (varyingCharge) {
      const frequency = 0.2 // 0.2 Hz (slower oscillation)
      const chargeValue = Math.sin(time * frequency * 2 * Math.PI) * 5
      
      updateObject(id, { charge: chargeValue })
    }
  })

  return null
}
