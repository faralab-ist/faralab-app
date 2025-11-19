// pior coisa que ja escrevi 
// returns charge that should be on each radius surface
export default function chargePerSphereSurface(radiuses, charges, materials) {
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