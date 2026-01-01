import * as THREE from 'three';
import getFieldVector3 from '../utils/getFieldVectors.js';
import calculateFieldAtPoint from '../utils/calculateField.js';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// returns true if point passes the slice rule
function sliceByPlane(point, slicePlane, slicePos, useSlice, slicePlaneFlip) {
  if (!useSlice) return true;

  // slicePlaneFlip means "invert which side is visible"
  switch (slicePlane) {
    case 'xy': {
      const pass = point.z > slicePos;
      return slicePlaneFlip ? !pass : pass;
    }
    case 'yz': {
      const pass = point.x > slicePos;
      return slicePlaneFlip ? !pass : pass;
    }
    case 'xz': {
      const pass = point.y > slicePos;
      return slicePlaneFlip ? !pass : pass;
    }
    default:
      return true;
  }
}

export default function FieldArrows({
  objects,
  fieldVersion = 0, // 🔥 MUST increment on any field-affecting change
  showOnlyPlane = false, // (currently unused in this component)
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
  propagationSpeed = 10, // units per second
  enablePropagation = true
}) {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const vectorsFilteredRef = useRef([]);
  const vectorMapRef = useRef(new Map());
  const objectPositionsRef = useRef([]);
  const updatedKeysRef = useRef(new Set());

  const propagationRadiusRef = useRef(0);
  const maxDistanceRef = useRef(0);

  // Force recompute even if caller mutates objects in-place: include fieldVersion
  const vectorsUnfiltered = useMemo(
    () => getFieldVector3(objects, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter),
    [objects, fieldVersion, gridSize, step, showOnlyGaussianField, minThreshold, planeFilter]
  );

  const vectors = useMemo(() => {
    return vectorsUnfiltered.filter(({ position }) =>
      sliceByPlane(position, slicePlane, slicePos, useSlice, slicePlaneFlip)
    );
  }, [vectorsUnfiltered, slicePlane, slicePos, useSlice, slicePlaneFlip]);

  // Calculate max distance for propagation (recomputed when vectors/objects change)
  const maxDistance = useMemo(() => {
    let max = 0;

    for (const { position, sourceObject } of vectors) {
      let minDistToObject = Infinity;

      if (sourceObject) {
        // Gaussian surfaces: we want a tiny delay then show together
        minDistToObject = 0.01;
      } else {
        for (const obj of (objects || [])) {
          if (!obj || !Array.isArray(obj.position)) continue;

          const objPos = new THREE.Vector3(...obj.position);
          let dist;

          if (obj.type === 'plane' || obj.type === 'stackedPlanes') {
            const normal = new THREE.Vector3(...obj.direction).normalize();
            const toPoint = new THREE.Vector3().subVectors(position, objPos);
            dist = Math.abs(toPoint.dot(normal));
          } else if (obj.type === 'wire' || obj.type === 'concentricInfWires') {
            const axis = new THREE.Vector3(...obj.direction).normalize();
            const toPoint = new THREE.Vector3().subVectors(position, objPos);
            const radialVec = toPoint.clone().projectOnPlane(axis);
            dist = radialVec.length();
          } else {
            dist = position.distanceTo(objPos);
          }

          if (dist < minDistToObject) minDistToObject = dist;
        }
      }

      if (minDistToObject > max) max = minDistToObject;
    }

    return max;
  }, [vectors, objects]);

  // Hard reset propagation when fieldVersion changes (preset, add charge, edit values, etc.)
  useEffect(() => {
    if (!enablePropagation) {
        vectorsFilteredRef.current = vectors;
        setUpdateTrigger(t => t + 1);
        return;
    }

    // 🔥 DO NOT CLEAR EXISTING VECTORS
    // We freeze the current field and let propagation update it

    // Rebuild position map from existing vectors
    vectorMapRef.current.clear();
    vectorsFilteredRef.current.forEach((v, i) => {
        const key = `${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)}`;
        vectorMapRef.current.set(key, i);
    });

    // Reset propagation state ONLY
    updatedKeysRef.current.clear();
    propagationRadiusRef.current = 0;

    // Cache object positions for distance tests
    objectPositionsRef.current = (objects || [])
        .filter(o => o && Array.isArray(o.position))
        .map(o => new THREE.Vector3(...o.position));

    maxDistanceRef.current = maxDistance;

    // Force rerender so old field remains visible immediately
    setUpdateTrigger(t => t + 1);

  }, [fieldVersion, enablePropagation, vectors, objects, maxDistance]);


  // Shared arrow geometry
  const arrowGeometry = useMemo(() => {
    const shaft = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6);
    const head = new THREE.ConeGeometry(0.12, 0.25, 8);
    head.translate(0, 0.475, 0);
    return BufferGeometryUtils.mergeGeometries([shaft, head]);
  }, []);

  // Propagation update
  useFrame((state, delta) => {
    if (!enablePropagation) return;

    const maxD = maxDistanceRef.current || 0;
    if (maxD <= 0) return;

    // advance radius (ref, no React state spam)
    propagationRadiusRef.current = Math.min(
      maxD,
      propagationRadiusRef.current + propagationSpeed * delta
    );

    const propagationRadius = propagationRadiusRef.current;
    let updated = false;

    // 1) Remove vectors that no longer meet threshold (based on current objects)
    for (let i = vectorsFilteredRef.current.length - 1; i >= 0; i--) {
      const existingVector = vectorsFilteredRef.current[i];
      if (!existingVector) continue;

      const key = `${existingVector.position.x.toFixed(2)},${existingVector.position.y.toFixed(2)},${existingVector.position.z.toFixed(2)}`;

      // Recalculate field for this position with current objects
      const recalculatedField = existingVector.sourceObject
        ? calculateFieldAtPoint([existingVector.sourceObject], existingVector.position)
        : calculateFieldAtPoint(objects, existingVector.position);

      if (recalculatedField.length() <= fieldThreshold) {
        vectorsFilteredRef.current.splice(i, 1);
        vectorMapRef.current.delete(key);
        updatedKeysRef.current.delete(key);
        updated = true;
      }
    }

    // 2) Add/update vectors inside current radius
    for (const newVector of vectors) {
      const key = `${newVector.position.x.toFixed(2)},${newVector.position.y.toFixed(2)},${newVector.position.z.toFixed(2)}`;
      if (updatedKeysRef.current.has(key)) continue;

      // Skip weak vectors early
      if (newVector.field.length() <= fieldThreshold) continue;

      // Find distance to nearest object based on object type
      let minDistToObject = Infinity;

      if (newVector.sourceObject) {
        minDistToObject = 0.01;
      } else {
        for (let i = 0; i < objectPositionsRef.current.length; i++) {
          const objPos = objectPositionsRef.current[i];
          const obj = objects[i];
          if (!obj) continue;

          let dist;

          if (obj.type === 'plane' || obj.type === 'stackedPlanes') {
            const normal = new THREE.Vector3(...obj.direction).normalize();
            const toPoint = new THREE.Vector3().subVectors(newVector.position, objPos);
            dist = Math.abs(toPoint.dot(normal));
          } else if (obj.type === 'wire' || obj.type === 'concentricInfWires') {
            const axis = new THREE.Vector3(...obj.direction).normalize();
            const toPoint = new THREE.Vector3().subVectors(newVector.position, objPos);
            const radialVec = toPoint.clone().projectOnPlane(axis);
            dist = radialVec.length();
          } else {
            dist = newVector.position.distanceTo(objPos);
          }

          if (dist < minDistToObject) minDistToObject = dist;
        }
      }

      if (minDistToObject <= propagationRadius) {
        const index = vectorMapRef.current.get(key);

        if (index !== undefined) {
          vectorsFilteredRef.current[index] = newVector;
        } else {
          vectorsFilteredRef.current.push(newVector);
          vectorMapRef.current.set(key, vectorsFilteredRef.current.length - 1);
        }

        updatedKeysRef.current.add(key);
        updated = true;
      }
    }

    if (updated) setUpdateTrigger(t => t + 1);
  });

  const instancedMesh = useMemo(() => {
    const vectorsToRender = enablePropagation ? vectorsFilteredRef.current : vectors;

    // Filter valid vectors
    const validVectors = vectorsToRender.filter(v => v.field.length() > fieldThreshold);
    if (validVectors.length === 0) return null;

    // Find max magnitude for normalization
    let maxMag = 0;
    for (const { field } of validVectors) {
      const mag = field.length();
      if (mag > maxMag) maxMag = mag;
    }
    const logMax = maxMag > 0 ? Math.log1p(maxMag) : 1;

    const mesh = new THREE.InstancedMesh(
      arrowGeometry,
      new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }),
      validVectors.length
    );

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);

    validVectors.forEach(({ position, field }, i) => {
      const mag = field.length();
      const logMag = Math.log1p(mag);

      // Color: red (strong) to blue (weak)
      const normalized = logMax > 0 ? logMag / logMax : 0;
      const hue = (1 - normalized) * 0.66;
      const color = new THREE.Color().setHSL(hue, 1, 0.5);

      // Scale based on magnitude
      const scale = (1 - Math.exp(-logMag)) * scaleMultiplier;

      // Rotation: align Y-axis with field direction
      const dir = field.clone().normalize();
      quaternion.setFromUnitVectors(yAxis, dir);

      // Build matrix
      matrix.compose(position, quaternion, new THREE.Vector3(1, scale, 1));

      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;

    return mesh;
  }, [vectors, enablePropagation, fieldThreshold, scaleMultiplier, updateTrigger, arrowGeometry]);

  if (!instancedMesh) return null;
  return <primitive object={instancedMesh} />;
}
