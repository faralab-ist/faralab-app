import { useThree } from '@react-three/fiber'

export default function useCameraSnapOnSlider() {
  const { camera } = useThree()

  const handleAxisDragStart = (activeAxes, position) => {
    if (activeAxes.component === 'Slider') {
      switch(activeAxes.axis) {
        case 0: // X axis
          camera.position.set(5, 0, 0)
          break
        case 1: // Y axis
          camera.position.set(0, 5, 0)
          break
        case 2: // Z axis
          camera.position.set(0, 0, 5)
          break
      }
      camera.lookAt(position[0], position[1], position[2])
    }
  }

  return { handleAxisDragStart }
}