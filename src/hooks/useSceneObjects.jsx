import { useState, useCallback, useMemo } from 'react'

// ID realmente único
const genUid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}_${Date.now()}`)

// mantém as factories como tens (não precisas mexer nelas aqui)
const generateIdFromName = (baseName, index) => `${baseName.split(' ')[0]} ${index}`

const objectFactories = {
  charge: (index) => ({
    id: `tmp-${index}`, // será sobrescrito
    type: 'charge',
    name: `Charge ${index}`,
    position: [0, 0, 0],
    charge: 1,
    radius: 0.1,
    createdAt: Date.now(),
  }),
  wire: (index) => ({
    id: `tmp-${index}`,
    type: 'wire',
    name: `Wire ${index}`,
    position: [0, 0, 0],
    charge_density: 0.1,
    charge: 1,
    charges: [],
    direction: [0, 0, 1], 
    height: 5,
    radius: 0.03,
    infinite: false,
    material: 'Dielectric',
    createdAt: Date.now(),
  }),
  plane: (index) => ({
    id: `tmp-${index}`,
    type: 'plane',
    name: `Plane ${index}`,
    position: [0, 0, 0],
    charge_density: 0.1,
    charge: 1,
    charges: [],
    direction: [0, 1, 0], //normal
    dimensions: [4 , 4],
    planeWidth: 5,
    planeHeight: 5,
    infinite: false,
    material: 'Dielectric',
    createdAt: Date.now(),
  }),
  chargedSphere: (index) => ({
    id: `tmp-${index}`,
    type: 'chargedSphere',
    name: `Charged Sphere ${index}`,
    position: [0, 0, 0],
    charge_density: 5,
    charge: 1, //sera que e preciso?
    charges: [],
    direction: [0, 1, 0], // normal da esfera
    radius: 1,
    isHollow: false,
    material: 'Dielectric',
    createdAt: Date.now(),
  }),
  sphere: (index) => ({
    id: `tmp-${index}`,
    type: 'surface',
    surfaceType: 'sphere',
    name: `Sphere ${index}`,
    position: [0, 0, 0],
    radius: 2,
    opacity: 0.5,
    charges: [],
    deformable: true,
    fixed: true,
    createdAt: Date.now(),
  }),
  cylinder: (index) => ({
    id: `tmp-${index}`,
    type: 'surface',
    surfaceType: 'cylinder',
    name: `Cylinder ${index}`,
    position: [0, 0, 0],
    radius: 2,
    height: 6,
    opacity: 0.5,
    charges: [],
    deformable: true,
    fixed: true,
    createdAt: Date.now(),
  }),
  cuboid: (index) => ({
    id: `tmp-${index}`,
    type: 'surface',
    surfaceType: 'cuboid',
    name: `Cuboid ${index}`,
    position: [0, 0, 0],
    width: 2,
    height: 2,
    depth: 5,
    opacity: 0.5,
    charges: [],
    deformable: true,
    fixed: true,
    createdAt: Date.now(),
  }),
}

export default function useSceneObjects(initial = []) {
  const [sceneObjects, setSceneObjects] = useState(initial)
  const [counters, setCounters] = useState({
    charge: 0, wire: 0, plane: 0, sphere: 0, cylinder: 0, cuboid: 0, chargedSphere: 0
  })

  const addObject = useCallback((type, overrides = {}) => {
    const id = genUid()

    setSceneObjects(prev => {
      const nextIndex = prev.filter(o => o.type === type).length + 1
      const base = objectFactories[type](nextIndex)

      const newObj = {
        ...base,
        id,
        name: generateIdFromName(base.name, nextIndex),
        ...overrides, // position from preset should override here
      }

      return [...prev, newObj]
    })

    // 2) counters apenas informativo (não influencia o índice real)
    setCounters(prev => ({ ...prev, [type]: (prev[type] ?? 0) + 1 }))

    return id
  }, [])

  const updatePosition = useCallback((id, position) => {
    setSceneObjects(prev => prev.map(o => (o.id === id ? { ...o, position } : o)))
  }, [])

  const updateDirection = useCallback((id, direction) => {
    setSceneObjects(prev => prev.map(o => (o.id === id ? { ...o, direction } : o)))
  }, [])

  const updateObject = useCallback((id, newProps) => {
    setSceneObjects(prev => prev.map(o => (o.id === id ? { ...o, ...newProps } : o)))
  }, [])

  const removeObject = useCallback((id) => {
    setSceneObjects(prev => prev.filter(o => o.id !== id))
  }, [])

  const counts = useMemo(() => ({
    charge: sceneObjects.filter(o => o.type === 'charge').length,
    wire: sceneObjects.filter(o => o.type === 'wire').length,
    plane: sceneObjects.filter(o => o.type === 'plane').length,
    chargedSphere: sceneObjects.filter(o => o.type === 'chargedSphere').length,
    surface: sceneObjects.filter(o => o.type === 'surface').length,
    total: sceneObjects.length,
  }), [sceneObjects])

  return {
    sceneObjects,
    setSceneObjects,
    addObject,
    updatePosition,
    updateObject,
    removeObject,
    updateDirection,
    counts,
  }
}
