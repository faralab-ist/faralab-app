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
    rotation: [0,0,0],
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
    rotation: [0,0,0],
    direction: [0, 1, 0], //normal
    dimensions: [4 , 4],
    planeWidth: 5,
    planeHeight: 5,
    infinite: false,
    material: 'Dielectric',
    createdAt: Date.now(),
  }),
  stackedPlanes: (index) => ({
    id: `tmp-${index}`,
    type: 'stackedPlanes',
    name: `Stacked Planes ${index}`,
    position: [0, 0, 0],
    charge_densities: [0.1],
    spacing: 1,
    rotation: [0,0,0],
    direction: [0, 1, 0], //normal
    dimensions: [4 , 4],
    planeWidth: 5,
    planeHeight: 5,
    infinite: false,
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
  concentricSpheres: (index) => ({
    id: `tmp-${index}`,
    type: 'concentricSpheres',
    name: `Concentric Sphere ${index}`,
    position: [0, 0, 0],
    radiuses:[],
    materials:[], // 'conductor, 'dielectric'
    dielectrics:[], // 1 for each dielectric delimited volume
    charges: [], // 1 for each conductor delimited volume
    direction: [0, 1, 0], // normal da esfera
    createdAt: Date.now(),
  }),
  concentricInfWires: (index) => ({
    id: `tmp-${index}`,
    type: 'concentricInfWires',
    name: `Concentric Infinite Wire ${index}`,
    position: [0, 0, 0],
    radiuses:[],
    materials:[], // 'conductor, 'dielectric'
    dielectrics:[], // 1 for each dielectric delimited volume
    charges: [], // 1 for each conductor delimited volume
    direction: [0, 1, 0], // normal do fio
    rotation: [0,0,0],
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
    rotation: [0,0,0],
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
    rotation: [0,0,0],
    createdAt: Date.now(),
  }),
}

export default function useSceneObjects(initial = []) {
  const [sceneObjects, setSceneObjects] = useState(initial)
  const [counters, setCounters] = useState({
    charge: 0, wire: 0, plane: 0, sphere: 0, cylinder: 0, cuboid: 0, chargedSphere: 0, concentricInfWires:0, concentricSpheres:0,
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

  const updateChargeDensity = useCallback((id, charge_density) => {
    setSceneObjects(prev => prev.map(o => (o.id === id ? { ...o, charge_density } : o)))
  }, [])  

const updateDirection = useCallback((id, direction) => {
  setSceneObjects(prev =>
    prev.map(o => {
      if (o.id !== id) return o;

      const same =
        Array.isArray(o.direction) &&
        o.direction.length === direction.length &&
        o.direction.every((v, i) => v === direction[i]);

      if (same) {
        return o;
      }

      return { ...o, direction };
    })
  );
}, []);


  const addCharge = useCallback((id, position, charge) => {
    setSceneObjects(prev => prev.map(o => (o.id === id ? { ...o, charges:[...o.charges, {position:position, charge:charge}] } : o)))
  }, [])

  const clearCharges = useCallback((id) => {
    setSceneObjects(prev => prev.map(o => (o.id === id ? { ...o, charges:[] } : o)))
  }, [])

  const addPlaneToStackedPlanes = useCallback((id) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newChargeDensities = o.charge_densities ? [...o.charge_densities, 0.1] : [0.1];
        return { ...o, charge_densities: newChargeDensities};
      }
      return o;
    }
    ))
  }, []);

  const removeLastPlaneFromStackedPlanes = useCallback((id) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newChargeDensities = o.charge_densities ? o.charge_densities.slice(0, -1) : [];
        return { ...o, charge_densities: newChargeDensities};
      }
      return o;
    }
    ))
  }, []);

  const setSpacingForStackedPlanes = useCallback((id, spacing) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, spacing: spacing};
      }
      return o;
    }
    ))
  }, []);

  const setChargeDensityForPlaneInStackedPlanes = useCallback((id, planeIndex, charge_density) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newChargeDensities = o.charge_densities ? [...o.charge_densities] : [];
        newChargeDensities[planeIndex] = charge_density;
        return { ...o, charge_densities: newChargeDensities};
      }
      return o;
    }
    ))
  }, []);

  //concentric spheres stuff
  const addRadiusToChargedSphere = useCallback((id) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const currentMaxRadius = o.radiuses && o.radiuses.length > 0 ? Math.max(...o.radiuses) : 0;
        const radius = currentMaxRadius + 1;
        const newRadiuses = o.radiuses ? [...o.radiuses, radius] : [radius];
        // add default material, dielectric and charge for the new layer
        const newMaterials = o.materials ? [...o.materials, 'dielectric'] : ['dielectric'];
        const newDielectrics = o.dielectrics ? [...o.dielectrics, 1] : [1];
        const newCharges = o.charges ? [...o.charges, 0] : [0];
        return { ...o, radiuses: newRadiuses, materials: newMaterials, dielectrics: newDielectrics, charges: newCharges};
      }
      return o;
    }
    ))
  }, [])

  const setRadiusToChargedSphere = useCallback((id, layerIndex, radius) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newRadiuses = o.radiuses ? [...o.radiuses] : [];
        newRadiuses[layerIndex] = radius;
        return { ...o, radiuses: newRadiuses};
      }
      return o;
    }
    ))
  }, [])

  const removeLastRadiusFromChargedSphere = useCallback((id) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newRadiuses = o.radiuses ? o.radiuses.slice(0, -1) : [];
        // remove stuff to keep alignemeneenenent
        const newMaterials = o.materials ? o.materials.slice(0, -1) : [];
        const newDielectrics = o.dielectrics ? o.dielectrics.slice(0, -1) : [];
        const newCharges = o.charges ? o.charges.slice(0, -1) : [];
        return { ...o, radiuses: newRadiuses, materials: newMaterials, dielectrics: newDielectrics, charges: newCharges};
      }
      return o;
    }
    ))
  }, [])

  const setMaterialForLayerInChargedSphere = useCallback((id, layerIndex, material) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newMaterials = o.materials ? [...o.materials] : [];
        newMaterials[layerIndex] = material;
        return { ...o, materials: newMaterials};
      }
      return o;
    }
    ))
  }, [])

  const setDielectricForLayerInChargedSphere = useCallback((id, layerIndex, dielectric) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newDielectrics = o.dielectrics ? [...o.dielectrics] : [];
        newDielectrics[layerIndex] = dielectric;
        return { ...o, dielectrics: newDielectrics};
      }
      return o;
    }
    ))
  }, [])

  const setChargeForLayerInChargedSphere = useCallback((id, layerIndex, charge) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newCharges = o.charges ? [...o.charges] : [];
        newCharges[layerIndex] = charge;
        return { ...o, charges: newCharges};
      }
      return o;
    }
    ))
  }, [])

  // end of concentric sphere stuff

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
    updateChargeDensity,
    updateObject,
    removeObject,
    updateDirection,
    addCharge,
    clearCharges,
    addRadiusToChargedSphere,
    removeLastRadiusFromChargedSphere,
    setMaterialForLayerInChargedSphere,
    setDielectricForLayerInChargedSphere,
    setChargeForLayerInChargedSphere,
    setRadiusToChargedSphere,
    addPlaneToStackedPlanes,
    removeLastPlaneFromStackedPlanes,
    setSpacingForStackedPlanes,
    setChargeDensityForPlaneInStackedPlanes,
    counts,
  }
}
