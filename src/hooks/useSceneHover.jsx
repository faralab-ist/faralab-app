import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

export default function useSceneHover(onHover) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    const ray = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const handler = (e) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      ray.setFromCamera(pointer, camera)
      const hits = ray.intersectObjects(scene.children, true)
      const hit = hits.find(h => h.object.userData && h.object.userData.id)
      onHover(hit ? hit.object.userData.id : null, hit || null)
    }

    gl.domElement.addEventListener('pointermove', handler)
    return () => gl.domElement.removeEventListener('pointermove', handler)
  }, [gl, scene, camera, onHover])
}