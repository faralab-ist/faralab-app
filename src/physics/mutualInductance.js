import * as THREE from 'three';
import { MU_0_REAL } from './constants';
import { useEffect } from 'react';

// Compute the mutual inductance between two solenoids by breaking them into discrete loops
function mutualInductanceTwoSolenoids(geometry1, geometry2) {
  const [length1, turns1, radius1, position1, direction1] = geometry1;
  const [length2, turns2, radius2, position2, direction2] = geometry2;

  let M = 0;

  for (let i = 0; i < turns1; i++) {
    const loopCenterY1 = -length1 / 2 + (i + 0.5) * (length1 / turns1);
    const loopPosition1 = [position1[0], position1[1] + loopCenterY1, position1[2]];
    const loopNormal1 = direction1;

    for (let j = 0; j < turns2; j++) {
      const loopCenterY2 = -length2 / 2 + (j + 0.5) * (length2 / turns2);
      const loopPosition2 = [position2[0], position2[1] + loopCenterY2, position2[2]];
      const loopNormal2 = direction2;

      const M_ij = mutualTwoLoopsDiscrete(
        loopPosition1, loopNormal1, radius1,
        loopPosition2, loopNormal2, radius2,
        8);
      M += M_ij;
    }
  }

  return M;
}

// Compute mutual inductance between two loops using discrete approximation of Neumann formula
function mutualTwoLoopsDiscrete(pos1, normal1, radius1, pos2, normal2, radius2, nPoints = 8) {
  const points1 = generateCirclePoints(pos1, normal1, radius1, nPoints);
  const points2 = generateCirclePoints(pos2, normal2, radius2, nPoints);

  let M = 0;

  // Neumann formula: M = (μ₀/4π) ∮∮ (dl₁ · dl₂) / r₁₂
  for (let i = 0; i < nPoints; i++) {
    const p1 = points1[i];
    const p1_next = points1[(i + 1) % nPoints];
    const dl1 = new THREE.Vector3().subVectors(p1_next, p1);

    for (let j = 0; j < nPoints; j++) {
      const p2 = points2[j];
      const p2_next = points2[(j + 1) % nPoints];
      const dl2 = new THREE.Vector3().subVectors(p2_next, p2);

      const rij = p1.distanceTo(p2);

      if (rij < 1e-9) continue;

      M += dl1.dot(dl2) / rij;
    }
  }

  return (MU_0_REAL / (4 * Math.PI)) * M;
}

// Generate points around a circle defined by a center, normal, and radius
function generateCirclePoints(center, normal, radius, numPoints) {
  const points = [];

  const n = new THREE.Vector3(...normal).normalize();

  let u = new THREE.Vector3(1, 0, 0);
  if (Math.abs(u.dot(n)) > 0.9) {
    u = new THREE.Vector3(0, 1, 0);
  }

  u.crossVectors(u, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();


  for (let i = 0; i < numPoints; i++) {
    const theta = (2 * Math.PI * i) / numPoints;
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);

    const point = new THREE.Vector3(
      center[0] + x * u.x + y * v.x,
      center[1] + x * u.y + y * v.y,
      center[2] + x * u.z + y * v.z
    );

    points.push(point);
  }

  return points;
}

// Probably ought to seperate hooks from registry stuff and put everything in seperate files
const cache = new Map();
const currents = new Map();
const geometries = new Map();

export function updateCurrent(id, current) {
  const existing = currents.get(id);
  currents.set(id, {
    current,
    prevCurrent: existing?.current ?? 0,  
  });
}

export function getCurrent(id) {
  return currents.get(id) || { current: 0, prevCurrent: 0 };
}

export function useRegisterGeometry(id, geometry) {
  console.log('1');
  useEffect(() => {
    if (!id) return;
    geometries.set(id, geometry);

    console.log('2');
    for (const [otherId, otherGeom] of geometries.entries()) {
      if (otherId === id) continue;


      const M = mutualInductanceTwoSolenoids(geometry, otherGeom);
      console.log('3');
      const key = id < otherId ? `${id}:${otherId}` : `${otherId}:${id}`;
      cache.set(key, M);
    }


    return () => {
      geometries.delete(id);
      for (const key of cache.keys()) {
        if (key.includes(`${id}:`) || key.includes(`:${id}`)) {
          cache.delete(key);
        }
      }
    };
  }, [id, ...geometry]);
}


export function getMutual(id1, id2) {
  const key = id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  return cache.get(key) || 0;
}


export function getOthers(id) {
    const others = [];
    for (const otherId of geometries.keys()) {
        if (otherId !== id) {
            const currentData = getCurrent(otherId);
            others.push({
                id: otherId,
                current: currentData.current,
                prevCurrent: currentData.prevCurrent
            });
        }
    }
    return others;
}
