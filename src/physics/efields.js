import * as THREE from "three";
import { K_E, EPSILON_0 } from "./constants";

export function pointChargeEField(chargePos, charge, targetPos) {
    chargePos = new THREE.Vector3(...chargePos);
    targetPos = new THREE.Vector3(...targetPos);
    const rVec = new THREE.Vector3().subVectors(targetPos, chargePos);
    const rSq = rVec.lengthSq();
    if (rSq < 1e-6) return new THREE.Vector3(0, 0, 0);
    const fieldMagnitude = K_E * charge / rSq;
    return rVec.normalize().multiplyScalar(fieldMagnitude);
}

/**     FINITE SURFACES     **/
export function chargedSphereEField(spherePos, radius, chargeDensity, isHollow, targetPos){
    spherePos = new THREE.Vector3(...spherePos);
    targetPos = new THREE.Vector3(...targetPos);
  const rVec = new THREE.Vector3().subVectors(targetPos, spherePos);
  const rVecLength = rVec.length();
  if (rVecLength === 0) return new THREE.Vector3(0,0,0);

  let mag = 0;
  if (isHollow) {
    if (rVecLength < radius) return new THREE.Vector3(0,0,0);
    const totCharge = chargeDensity * 4 * Math.PI * radius ** 2;
    mag = K_E * totCharge / (rVecLength ** 2);
  } else {
    const totCharge = chargeDensity * (4/3) * Math.PI * radius ** 3;
    if (rVecLength < radius)
      mag = (K_E * totCharge * rVecLength) / (radius ** 3);
    else
      mag = K_E * totCharge / (rVecLength ** 2);
  }
  return rVec.normalize().multiplyScalar(mag);
}

// from https://arxiv.org/pdf/math-ph/0603051
export function finitePlaneEField(planePos, planeNormal, planeDimensions, chargeDensity, targPoint) {
    const width = planeDimensions[0];
    const height = planeDimensions[1];
    const targePointVec = new THREE.Vector3(...targPoint);
    const planePosVec = new THREE.Vector3(...planePos);
    const normal = new THREE.Vector3(...planeNormal).normalize();

    const rVec = new THREE.Vector3().subVectors(targePointVec, planePosVec);

    const uVec = new THREE.Vector3(1, 0, 0);
    if (Math.abs(normal.dot(uVec)) > 0.99) uVec.set(0, 1, 0); // avoid parallel
    const vVec = new THREE.Vector3().crossVectors(normal, uVec).normalize();
    uVec.crossVectors(vVec, normal).normalize();    

    const xPrime = rVec.dot(uVec);
    const yPrime = rVec.dot(normal);
    const zPrime = rVec.dot(vVec);

    const halfW = width / 2;
    const halfH = height / 2;
    const onPlane = (Math.abs(yPrime) < 1e-9);
    const insideRect = (Math.abs(xPrime) <= halfW) && (Math.abs(zPrime) <= halfH);

    if (onPlane && insideRect) {
        return new THREE.Vector3(0, 0, 0);
    }

    const xCorners = [-width / 2, width / 2];
    const zCorners = [-height / 2, height / 2];

    const D11 = Math.sqrt((xPrime - xCorners[0]) ** 2 + yPrime ** 2 + (zPrime - zCorners[0]) ** 2);
    const D12 = Math.sqrt((xPrime - xCorners[0]) ** 2 + yPrime ** 2 + (zPrime - zCorners[1]) ** 2);
    const D21 = Math.sqrt((xPrime - xCorners[1]) ** 2 + yPrime ** 2 + (zPrime - zCorners[0]) ** 2);
    const D22 = Math.sqrt((xPrime - xCorners[1]) ** 2 + yPrime ** 2 + (zPrime - zCorners[1]) ** 2);

    const Ex = Math.log((D11 - (zPrime - zCorners[0])) * (D22 - (zPrime - zCorners[1])) / ((D12 - (zPrime - zCorners[1])) * (D21 - (zPrime - zCorners[0]))));
    const Ez = Math.log((D11 - (xPrime - xCorners[0])) * (D22 - (xPrime - xCorners[1])) / ((D12 - (xPrime - xCorners[0])) * (D21 - (xPrime - xCorners[1]))));

    // compute Ey using real arctangent formula
    let Ey = 0;
    const ySign = Math.sign(yPrime) || 1; // handle exactly on-plane case
    const yAbs = Math.abs(yPrime);

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const sign = ((i + j) % 2 === 0) ? 1 : -1;
            const xi = xCorners[i];
            const zj = zCorners[j];
            Ey += sign * Math.atan2(
                (xi - xPrime) * (zj - zPrime),
                yAbs * Math.sqrt(yAbs * yAbs + (xi - xPrime) ** 2 + (zj - zPrime) ** 2)
            );
        }
    }

    Ey *= ySign;

    const coeff = chargeDensity / (4 * Math.PI * EPSILON_0);
    const fieldVec = new THREE.Vector3(Ex, Ey, Ez).multiplyScalar(coeff);

    const worldFieldVec = new THREE.Vector3()
        .addScaledVector(uVec, fieldVec.x)
        .addScaledVector(normal, fieldVec.y)
        .addScaledVector(vVec, fieldVec.z);

    return worldFieldVec;
}

// from https://arxiv.org/pdf/1410.1408
export function finiteWireEField(wirePos, wireDir, wireLength, wireRadius, chargeDensity, targetPos){

    const u = new THREE.Vector3(...wireDir).normalize();
    wirePos = new THREE.Vector3(...wirePos);
    targetPos = new THREE.Vector3(...targetPos);
    const rVec = new THREE.Vector3().subVectors(targetPos, wirePos);

    const z0 = rVec.dot(u);

    const rPerp = rVec.clone().sub(u.clone().multiplyScalar(z0));
    const rPerpMag = rPerp.length() + 1e-9;

    const z1 = -wireLength / 2 - z0;
    const z2 = wireLength / 2 - z0;

    const sqrt1 = Math.sqrt(rPerpMag ** 2 + z1 ** 2);
    const sqrt2 = Math.sqrt(rPerpMag ** 2 + z2 ** 2);

    const radialCoeff = (z2 / sqrt2 - z1 / sqrt1) / rPerpMag;

    const axialCoeff = -(1 / sqrt1 - 1 / sqrt2);

    const E = new THREE.Vector3()
        .add(rPerp.clone().normalize().multiplyScalar(radialCoeff))
        .add(u.clone().multiplyScalar(axialCoeff))
        .multiplyScalar(chargeDensity / (4 * Math.PI * EPSILON_0));

    return E;
}



/**     INFINITE SURFACES    **/


export function infiniteWireEField(position, chargeDensity, targPoint, direction = [0, 1, 0]) {
    position = new THREE.Vector3(...position);
    targPoint = new THREE.Vector3(...targPoint);
    const multiplier = EPSILON_0;
    direction = new THREE.Vector3(...direction).normalize()
    const rVec = new THREE.Vector3().subVectors(targPoint, position)
    const rPerp = rVec.clone().projectOnPlane(new THREE.Vector3(...direction).normalize())
    const rPerpMag = rPerp.length()
    if (rPerpMag < 1e-6) return new THREE.Vector3(0, 0, 0)
    const fieldMagnitude = chargeDensity / (2 * rPerpMag * Math.PI * multiplier)
    return rPerp.normalize().multiplyScalar(fieldMagnitude)
}

export function infinitePlaneEField(point, chargeDensity, targetPoint, normal) {
    point = new THREE.Vector3(...point);
    targetPoint = new THREE.Vector3(...targetPoint);
    const rVec = new THREE.Vector3().subVectors(targetPoint, point);
    const distance = rVec.dot(new THREE.Vector3(...normal).normalize());

    if (Math.abs(distance) < 1e-6) {
        return new THREE.Vector3(0, 0, 0);
    }

    const multiplier = EPSILON_0;

    const fieldMagnitude = chargeDensity / (2 * multiplier);

    const fieldDirection = new THREE.Vector3(...normal).normalize();
    if (distance < 0) {
        fieldDirection.negate();
    }

    const electricField = fieldDirection.multiplyScalar(fieldMagnitude);
    return electricField;
}



/**     SMART SURFACES   **/


export function concentricSpheresEField(spherePos, radiuses, materials, dielectrics, charges, targetPos){
    targetPos = new THREE.Vector3(...targetPos);
    spherePos = new THREE.Vector3(...spherePos);
    const rVec = new THREE.Vector3().subVectors(targetPos, spherePos);
    const rVecLength = rVec.length();
    const rVecLengthSq = rVec.lengthSq();
    if (rVecLength === 0) return new THREE.Vector3(0,0,0);

    const totalCharge = charges.reduce(((a,b) => a+b),0);

    // determine layer the point is on
    let layer = -1;
    for(let i = 0; i < radiuses.length; i++){
        if (rVecLength === radiuses [i]){
            if (materials[i] === 'dielectric' && i === radiuses.length -1) continue;
            return new THREE.Vector3(0,0,0);
        } else if (rVecLength < radiuses[i]){
            layer = i;
            break;
        }
    }
    
    // point is outside system:
    if (layer === -1){
        const field = K_E * totalCharge / rVecLengthSq;
        return rVec.clone().normalize().multiplyScalar(field);
    }

    // point is inside conductor material
    // maybe not needed but just in case
    // no
    /* if(materials[layer] === 'conductor'){
        return new THREE.Vector3(0,0,0);
    }*/

    // gauss law thanks
    
    let enclosedCharge = 0;
    const chargesPerSurface = chargePerSphereSurface(radiuses, charges, materials);
    for (let i = 1; i <= layer; i++){
        enclosedCharge += chargesPerSurface[i-1];
    }

    const dielectricConst = dielectrics[layer];
    const field = (K_E * enclosedCharge) / (dielectricConst * rVecLengthSq);
    return rVec.clone().normalize().multiplyScalar(field);
}

export function concentricInfiniteWiresEField(spherePos, dir, radiuses, materials, dielectrics, charges, targetPos){
    targetPos = new THREE.Vector3(...targetPos);
    spherePos = new THREE.Vector3(...spherePos);
    const rVecF = new THREE.Vector3().subVectors(targetPos, spherePos);
    const direction = new THREE.Vector3(...dir).normalize()
    const axialComp = direction.clone().normalize().multiplyScalar(rVecF.dot(direction.clone().normalize()));
    const rVec = rVecF.clone().sub(axialComp);
    const rVecLength = rVec.length();
    if (rVecLength === 0) return new THREE.Vector3(0,0,0);

    const totalCharge = charges.reduce(((a,b) => a+b),0);

    // determine layer the point is on
    let layer = -1;
    for(let i = 0; i < radiuses.length; i++){
        if (rVecLength === radiuses [i]){
            if (materials[i] === 'dielectric' && i === radiuses.length -1) continue;
            return new THREE.Vector3(0,0,0);
        } else if (rVecLength < radiuses[i]){
            layer = i;
            break;
        }
    }
    
    // point is outside system:
    if (layer === -1){
        const field = K_E * totalCharge / rVecLength;
        return rVec.clone().normalize().multiplyScalar(field);
    }

    // point is inside conductor material
    // maybe not needed but just in case
    // no
    /* if(materials[layer] === 'conductor'){
        return new THREE.Vector3(0,0,0);
    }*/

    // gauss law thanks
    
    let enclosedCharge = 0;
    const chargesPerSurface = chargePerSphereSurface(radiuses, charges, materials);
    for (let i = 1; i <= layer; i++){
        enclosedCharge += chargesPerSurface[i-1];
    }

    if (materials[layer] === 'conductor'){
        return new THREE.Vector3(0,0,0);
    }

    const dielectricConst = dielectrics[layer];
    const field = (K_E * enclosedCharge) / (dielectricConst * rVecLength);
    return rVec.clone().normalize().multiplyScalar(field);
}


/*  UTILS   */


// pior coisa que ja escrevi 
// returns charge that should be on each radius surface
export function chargePerSphereSurface(radiuses, charges, materials) {
    const chargePerSurface = [];
    let enclosedCharge = 0;
    let accConductorCharge = 0;
    let lastCancelCharge = 0;
    let isOnConductorsOnRow = false;
    for (let i = 0; i < radiuses.length; i++) {
        let chargeThisLayer = 0;
        if (materials.length > i+1 && materials[i] === 'dielectric' && materials[i+1] === 'conductor'){
            chargeThisLayer = -enclosedCharge;
            lastCancelCharge = chargeThisLayer;
        } else if (materials.length > i+1 && materials[i] === 'conductor' && materials[i+1] === 'dielectric'){
            if (isOnConductorsOnRow){
                chargeThisLayer = charges[i] + accConductorCharge - lastCancelCharge;
                accConductorCharge = 0;
                lastCancelCharge = 0;
            } else if (i === 0){
                chargeThisLayer = charges[i];
            } else {
                chargeThisLayer = charges[i] - chargePerSurface[i-1];
            }
            isOnConductorsOnRow = false;
        } else if (materials.length > i+1 && materials[i] === 'conductor' && materials[i+1] === 'conductor'){
            chargeThisLayer = 0;
            accConductorCharge += charges[i];
            isOnConductorsOnRow = true;
        } else if (materials.length > i+1 && materials[i] === 'dielectric' && materials[i+1] === 'dielectric'){
            chargeThisLayer = 0;
        } else if (!(materials.length > i+1) && materials[i] === 'dielectric'){
            chargeThisLayer = 0;
        } else if (!(materials.length > i+1) && materials[i] === 'conductor'){
            if (isOnConductorsOnRow){
                chargeThisLayer = charges[i] + accConductorCharge - lastCancelCharge;
            } else if (i === 0){
                chargeThisLayer = charges[i];
            } else {
                chargeThisLayer = charges[i] - chargePerSurface[i-1];
            }
        }
        enclosedCharge += chargeThisLayer;
        chargePerSurface.push(chargeThisLayer);
    }
    return chargePerSurface;
}