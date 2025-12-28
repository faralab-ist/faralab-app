import { useState, useCallback, useMemo } from 'react'
import { velocity } from 'three/tsl';

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
  path: (index) => ({
    id: `tmp-${index}`,
    type: 'path',
    name: `Path ${index}`,
    points: [], // positions of each point of path
    position: [0, 0, 0], //global position
    charges: [], //position of each point charge
    tangents: [],
    chargeCount: 1, // number of point charges
    charge: 1, // charge of each charge
    velocity: 1, //speed of charges
    isClosedPath: false,
    createdAt: Date.now(),
  }),
  ringCoil: (index) => ({
    id: `tmp-${index}`,
    type: 'coil',
    coilType: 'ring',
    name: `Ring Coil ${index}`,
    position: [0, 0, 0],
    coilRadius: 1.5,
    tubeRadius: 0.01,
    coilColor: '#6ea8ff',
    direction: [0, 1, 0],     // normal vector (area direction)
    rotation: [0, 0, 0],      // Euler angles for rotation
    chargeCount: 5,
    charge: 1,
    velocity: 1,
    renderCharges: true,
    charges: [],
    createdAt: Date.now(),
  }),
  solenoid: (index) => ({ // just a solenoid
    id: `tmp-${index}`,
    type: 'coil',
    coilType: 'solenoid',
    name: `Solenoid Coil ${index}`,
    position: [0, 0, 0],
    length: 3,
    radius: 0.3,
    direction: [0, 1, 0],     // normal vector (area direction)
    rotation: [0, 0, 0],      // Euler angles for rotation
    multiplier: 1,
    resolution: 10,
    charges: [],
    createdAt: Date.now(),
  }),
  polygonCoil: (index) => ({
    id: `tmp-${index}`,
    type: 'coil',
    coilType: 'polygon',
    name: `Polygon Coil ${index}`,
    position: [0, 0, 0],
    coilRadius: 1.5,
    tubeRadius: 0.01,
    coilColor: '#6ea8ff',
    direction: [0, 1, 0],     // normal vector (area direction)
    rotation: [0, 0, 0],      // Euler angles for rotation
    sides: 3,                 // default to square
    chargeCount: 5,
    charge: 1,
    velocity: 1,
    renderCharges: true,
    charges: [],
    createdAt: Date.now(),
  }),
  barMagnet: (index) => ({
    id: `tmp-${index}`,
    type: 'barMagnet',
    name: `Bar Magnet ${index}`,
    position: [0, 0, 0],
    length: 3,
    radius: 0.3,
    numOfCoils: 10,
    chargesPerCoil: 10,
    pointsPerCoil: 20,
    charge: 1,
    velocity: 1,
    charges: [],
    direction: [0, 1, 0],     // normal vector (area direction)
    rotation: [0, 0, 0],      // Euler angles for rotation
    frozen: true,
    animated: false,
    amplitude: 0.5,
    freq: 1,
    createdAt: Date.now(),
  }),
  faradayCoil: (index) => ({
    id: `tmp-${index}`,
    type: 'faradayCoil',
    name: `Faraday Coil ${index}`,
    position: [0, 0, 0],
    radius: 1,
    tubeRadius: 0.01,
    coilColor: '#6ea8ff',
    direction: [0, 1, 0],     // normal vector (area direction)
    rotation: [0, 0, 0],      // Euler angles for rotation
    chargeCount: 5,
    numOfPoints: 20,
    magneticFlux: 0,
    emf: 0,
    createdAt: Date.now(),
  }),
}

export default function useSceneObjects(initial = []) {
  const [sceneObjects, setSceneObjects] = useState(initial)
  const [counters, setCounters] = useState({
    charge: 0, wire: 0, plane: 0, sphere: 0, cylinder: 0, cuboid: 0, chargedSphere: 0, concentricInfWires:0, concentricSpheres:0, path: 0, 
    ringCoil: 0, polygonCoil: 0, barMagnet:0, solenoid: 0,
  })

  const addPointToPath = useCallback((id) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newPoints = o.points ? [...o.points, [0,0,0]] : [[0,0,0]];
        return { ...o, points: newPoints};
      }
      return o;
    }
    ))
  }, []);

  const removeLastPointFromPath = useCallback((id) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newPoints = o.points ? o.points.slice(0, -1) : [];
        return { ...o, points: newPoints};
      }
      return o;
    }
    ))
  }, []);

  const setPointInPath = useCallback((id, pointIndex, point) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        const newPoints = o.points ? [...o.points] : [];
        newPoints[pointIndex] = point;
        return { ...o, points: newPoints};
      }
      return o;
    }
    ))
  }, []);

  const changePathChargeCount = useCallback((id, newCount) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, chargeCount: newCount};
      }
      return o;
    }
    ))
  }, []);

  const changePathCharge = useCallback((id, newCharge) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, charge: newCharge};
      }
      return o;
    }
    ))
  }, []);

  const changePathVelocity = useCallback((id, newVelocity) => {
    setSceneObjects(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, velocity: newVelocity};
      }
      return o;
    }
    ))
  }, []);

  const addObject = useCallback((type, overrides = {}) => {
    const id = genUid()

    setSceneObjects(prev => {
      // For coils, count by coilType if specified in overrides
      let nextIndex
      if (type === 'coil' || type === 'ringCoil' || type === 'polygonCoil' || type === 'solenoid') {
        const coilType = overrides.coilType || (type === 'polygonCoil' ? 'polygon' : (type === 'solenoid' ? 'solenoid' : 'ring'))
        nextIndex = prev.filter(o => o.type === 'coil' && o.coilType === coilType).length + 1
      } else {
        nextIndex = prev.filter(o => o.type === type).length + 1
      }
      
      // Map type to correct factory
      let factoryType = type
      if (type === 'ringCoil') factoryType = 'ringCoil'
      else if (type === 'polygonCoil') factoryType = 'polygonCoil'
      else if (type === 'solenoid') factoryType = 'solenoid'
      
      const base = objectFactories[factoryType](nextIndex)

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
    path: sceneObjects.filter(o => o.type === 'path').length,
    coil: sceneObjects.filter(o => o.type === 'coil').length,
    ringCoil: sceneObjects.filter(o => o.type === 'coil' && o.coilType === 'ring').length,
    solenoid: sceneObjects.filter(o => o.type === 'coil' && o.coilType === 'solenoid').length,
    barMagnet: sceneObjects.filter(o => o.type === 'coil' && o.coilType === 'barMagnet').length,
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
    addPointToPath,
    removeLastPointFromPath,
    setPointInPath,
    changePathChargeCount,
    changePathCharge,
    changePathVelocity,
    counts,
  }
}
