import * as THREE from 'three'
import getFieldVector3 from '../utils/getFieldVectors.js'
import { useMemo, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip) {
  if (!useSlice) return true
  switch (slicePlane) {
    case 'xy': return slicePlaneFlip ? point.z <= slicePos : point.z > slicePos
    case 'yz': return slicePlaneFlip ? point.x <= slicePos : point.x > slicePos
    case 'xz': return slicePlaneFlip ? point.y <= slicePos : point.y > slicePos
    default: return true
  }
}

function vecKey(v3) {
  // chave estável (evita float noise se step for fracionário)
  const q = (n) => Math.round(n * 1000) / 1000
  return `${q(v3.x)},${q(v3.y)},${q(v3.z)}`
}

export default function FieldArrows({
  objects,
  fieldVersion,
  fieldChangeType = 'full',
  showOnlyGaussianField = false,
  fieldThreshold = 0.1,
  gridSize = 10,
  step = 1,
  minThreshold = 0,
  scaleMultiplier = 1,
  planeFilter = null,
  slicePlane,
  slicePos = 0,
  useSlice = false,
  slicePlaneFlip = false,
  propagationSpeed = 10,
  enablePropagation = true
}) {
  const meshRef = useRef(null)

  // estado do instancing
  const vectorsFilteredRef = useRef([])      // idx -> vector data
  const vectorMapRef = useRef(new Map())     // key -> idx
  const updatedKeysRef = useRef(new Set())   // keys atualizadas neste frame
  const propagationRadiusRef = useRef(0)
  const maxDistanceRef = useRef(0)
  const currentKeysRef = useRef(new Set())   // keys válidas após thresholds/slice

  const vectorsUnfiltered = useMemo(
    () => getFieldVector3(objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter),
    [objects, fieldVersion, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter]
  )

  const vectors = useMemo(() => {
    return vectorsUnfiltered
      .filter(v => v.field.length() > fieldThreshold)
      .filter(v => sliceByPlane(v.position, slicePlane, slicePos, useSlice, slicePlaneFlip))
      .map(v => {
        let minDist = 0.01
        if (!v.sourceObject) {
          minDist = Infinity
          for (const obj of objects) {
            if (!obj?.position) continue
            const d = v.position.distanceTo(new THREE.Vector3(...obj.position))
            if (d < minDist) minDist = d
          }
        }
        return { ...v, minDist }
      })
  }, [vectorsUnfiltered, objects, fieldThreshold, slicePlane, slicePos, useSlice, slicePlaneFlip])

  const maxDistance = useMemo(
    () => vectors.reduce((m, v) => Math.max(m, v.minDist), 0),
    [vectors]
  )

  const arrowGeometry = useMemo(() => {
    const shaft = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6)
    const head = new THREE.ConeGeometry(0.12, 0.25, 8)
    head.translate(0, 0.475, 0)
    return BufferGeometryUtils.mergeGeometries([shaft, head])
  }, [])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        metalness: 0.1,
        vertexColors: true
      }),
    []
  )

  const ensureMeshCapacity = (minCapacity) => {
    if (!meshRef.current) {
      const mesh = new THREE.InstancedMesh(arrowGeometry, material, Math.max(1, minCapacity))
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

      // 🔥 garante cor por instância (senão fica tudo preto)
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(Math.max(1, minCapacity) * 3),
        3
      )
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)

      mesh.count = 0
      meshRef.current = mesh
      return
    }

    const mesh = meshRef.current
    const currentCapacity = mesh.instanceMatrix?.count ?? 0
    if (minCapacity <= currentCapacity) return

    const newCapacity = minCapacity
    const newMesh = new THREE.InstancedMesh(arrowGeometry, material, newCapacity)
    newMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    newMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(newCapacity * 3), 3)
    newMesh.instanceColor.setUsage(THREE.DynamicDrawUsage)

    // copia instâncias atuais
    const tmpM = new THREE.Matrix4()
    const tmpC = new THREE.Color()
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, tmpM)
      newMesh.setMatrixAt(i, tmpM)
      if (mesh.instanceColor) {
        mesh.getColorAt(i, tmpC)
        newMesh.setColorAt(i, tmpC)
      }
    }
    newMesh.count = mesh.count

    mesh.dispose?.()
    meshRef.current = newMesh
  }

  useEffect(() => {
    ensureMeshCapacity(vectors.length)

    if (fieldChangeType === 'full') {
      vectorsFilteredRef.current = []
      vectorMapRef.current.clear()
    }

    currentKeysRef.current = new Set(vectors.map(v => vecKey(v.position)))

    propagationRadiusRef.current = 0
    maxDistanceRef.current = maxDistance
  }, [fieldVersion, fieldChangeType, vectors, maxDistance])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    if (!enablePropagation) {
      propagationRadiusRef.current = Infinity
    } else {
      propagationRadiusRef.current = Math.min(
        maxDistanceRef.current,
        propagationRadiusRef.current + propagationSpeed * delta
      )
    }

    const matrix = new THREE.Matrix4()
    const quat = new THREE.Quaternion()
    const yAxis = new THREE.Vector3(0, 1, 0)
    const color = new THREE.Color()

    // remove só o que NÃO existe mais (threshold/slice mudou, carga moveu, etc.)
    const removeKey = (key) => {
      const idx = vectorMapRef.current.get(key)
      if (idx === undefined) return
      const lastIdx = mesh.count - 1
      if (lastIdx < 0) return

      if (idx !== lastIdx) {
        const tmpM = new THREE.Matrix4()
        const tmpC = new THREE.Color()
        mesh.getMatrixAt(lastIdx, tmpM)
        mesh.setMatrixAt(idx, tmpM)
        if (mesh.instanceColor) {
          mesh.getColorAt(lastIdx, tmpC)
          mesh.setColorAt(idx, tmpC)
        }

        const lastV = vectorsFilteredRef.current[lastIdx]
        vectorsFilteredRef.current[idx] = lastV
        const lastKey = vecKey(lastV.position)
        vectorMapRef.current.set(lastKey, idx)
      }

      vectorsFilteredRef.current.pop()
      vectorMapRef.current.delete(key)
      mesh.count = Math.max(0, mesh.count - 1)
    }

    for (const [key] of vectorMapRef.current) {
      if (!currentKeysRef.current.has(key)) removeKey(key)
    }

    // adiciona/atualiza instâncias alcançadas pela propagação
    for (const v of vectors) {
      if (enablePropagation && v.minDist > propagationRadiusRef.current) continue

      const key = vecKey(v.position)
      let idx = vectorMapRef.current.get(key)

      if (idx === undefined) {
        idx = mesh.count
        ensureMeshCapacity(idx + 1)
        if (meshRef.current !== mesh) return // mesh trocou -> pega no próximo frame

        mesh.count++
        vectorsFilteredRef.current.push(v)
        vectorMapRef.current.set(key, idx)
      } else {
        vectorsFilteredRef.current[idx] = v
      }

      const mag = v.field.length()
      const safeMag = Math.min(Math.max(mag, 1e-9), 1e6)

      // azul(fraco) -> vermelho(forte)
      const t = Math.min(Math.log10(1 + safeMag) / 3, 1)
      color.setRGB(t, 0.2, 1 - t)

      quat.setFromUnitVectors(yAxis, v.field.clone().normalize())

      const scaleY = (1 - Math.exp(-safeMag)) * scaleMultiplier
      matrix.compose(v.position, quat, new THREE.Vector3(1, scaleY, 1))

      mesh.setMatrixAt(idx, matrix)
      mesh.setColorAt(idx, color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  if (!meshRef.current) return null
  return <primitive object={meshRef.current} />
}
