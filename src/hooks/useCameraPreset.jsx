import { useThree } from '@react-three/fiber'
import { useCallback } from 'react'
import * as THREE from 'three'

export default function useCameraPreset() {
  const { camera } = useThree()

  // Instant snap
  const setCameraPreset = useCallback(({ position, target, fov, up }) => {
    if (position) {
      camera.position.set(position[0], position[1], position[2])
    }
    // set up BEFORE lookAt so the camera roll is correct
    if (up) {
      camera.up.set(up[0], up[1], up[2])
    }
    if (target) {
      camera.lookAt(target[0], target[1], target[2])
    }
    if (fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Simple linear animation (optional)
  const animateCameraPreset = useCallback(({ position, target, fov, up, duration = 0.6 }) => {
    const startPos = camera.position.clone()
    const endPos = position ? new THREE.Vector3(...position) : startPos
    const startFov = camera.fov
    const endFov = fov ?? startFov
    const startTime = performance.now()

    // apply up immediately to avoid a rolled view during animation
    if (up) camera.up.set(up[0], up[1], up[2])

    function step(now) {
      const t = Math.min(1, (now - startTime) / (duration * 1000))
      camera.position.lerpVectors(startPos, endPos, t)
      if (fov) {
        camera.fov = startFov + (endFov - startFov) * t
        camera.updateProjectionMatrix()
      }
      if (target) camera.lookAt(target[0], target[1], target[2])
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [camera])

  return { setCameraPreset, animateCameraPreset }
}