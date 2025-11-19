precision highp float;
uniform mat4 cameraMatrixWorld;
uniform mat4 projectionMatrixInverse;
varying vec2 vUv;

uniform float targetVal;
uniform float transparency;

uniform float epsilon_0;
uniform float k_e;

#define MAX_CHARGES 100
uniform int chargeCount;
uniform vec3 chargePos[MAX_CHARGES];
uniform float chargeVal[MAX_CHARGES];

#define MAX_INF_PLANES 6
uniform int planeCount;
uniform float planeChargeDensity[MAX_INF_PLANES];
uniform vec3 planePositions[MAX_INF_PLANES];
uniform vec3 planeNormals[MAX_INF_PLANES];

#define MAX_INF_WIRES 6
uniform int wireCount;
uniform float wireChargeDensity[MAX_INF_WIRES];
uniform vec3 wirePositions[MAX_INF_WIRES];
uniform vec3 wireDirections[MAX_INF_WIRES];
uniform float wireRadius[MAX_INF_WIRES];

#define MAX_FIN_PLANES 6
uniform int finPlaneCount;
uniform float finPlaneChargeDensity[MAX_FIN_PLANES];
uniform vec3 finPlanePositions[MAX_FIN_PLANES];
uniform vec3 finPlaneNormals[MAX_FIN_PLANES];
uniform vec2 finPlaneDimensions[MAX_FIN_PLANES];

#define MAX_FIN_WIRES 6
uniform int finWireCount;
uniform float finWireChargeDensity[MAX_FIN_WIRES];
uniform vec3 finWirePositions[MAX_FIN_WIRES];
uniform vec3 finWireDirections[MAX_FIN_WIRES];
uniform float finWireHeights[MAX_FIN_WIRES];

#define MAX_CHARGED_SPHERES 15
uniform int chargedSphereCount;
uniform float chargedSphereChargeDensity[MAX_CHARGED_SPHERES];
uniform float chargedSphereRadius[MAX_CHARGED_SPHERES];
uniform vec3 chargedSpherePositions[MAX_CHARGED_SPHERES];
uniform int chargedSphereHollow[MAX_CHARGED_SPHERES];

uniform bool useSlice;
uniform vec3 slicePlane;
uniform float slicePos;  


#define PI 3.1415926

bool isBehindSlice(vec3 point) {
    if (!useSlice) return false;

    // X axis slice
    if (abs(slicePlane.x) > 0.5) {
        float s = sign(slicePlane.x);
        float dist = s * (point.x - slicePos);
        return dist < 0.0;
    }

    // Y axis slice
    if (abs(slicePlane.y) > 0.5) {
        float s = sign(slicePlane.y);
        float dist = s * (point.y - slicePos);
        return dist < 0.0;
    }

    // Z axis slice
    if (abs(slicePlane.z) > 0.5) {
        float s = sign(slicePlane.z);
        float dist = s * (point.z - slicePos);
        return dist < 0.0;
    }

    return false;
}


float sliceFade(vec3 point) {
    if (!useSlice) return 1.0;

    float dist = 0.0;
    float smoothZone = 0.02; 

    if (abs(slicePlane.x) > 0.5) {
        float s = sign(slicePlane.x);
        dist = s * (point.x - slicePos);
    } else if (abs(slicePlane.y) > 0.5) {
        float s = sign(slicePlane.y);
        dist = s * (point.y - slicePos);
    } else if (abs(slicePlane.z) > 0.5) {
        float s = sign(slicePlane.z);
        dist = s * (point.z - slicePos);
    }

    return smoothstep(-smoothZone, 0.0, dist);
}


// from https://arxiv.org/pdf/math-ph/0603051
float rectPotential(vec3 p, vec3 planePos, vec3 normal, vec2 dims, float sigma) {
    
    vec3 rVec = p - planePos;
    
    if(length(rVec) > dims.x * dims.y * 1.0){
        float area = dims.x * dims.y;
        float totCharge = sigma * area;
        return k_e * totCharge / length(rVec);
    }
    
    // Build local plane coordinates
    vec3 u = vec3(1.0, 0.0, 0.0);
    if(abs(dot(normal, u)) > 0.9) u = vec3(0.0, 1.0, 0.0);
    vec3 v = normalize(cross(normal, u));
    u = normalize(cross(v, normal));

    // Local coordinates

    float xPrime = dot(rVec, u);
    float yPrime = abs(dot(rVec, normal));
    float zPrime = dot(rVec, v);

    // Rectangle corners
    float x1 = -dims.x / 2.0;
    float x2 =  dims.x / 2.0;
    float z1 = -dims.y / 2.0;
    float z2 =  dims.y / 2.0;

    // Precompute squares
    float y2 = yPrime * yPrime;

    float V = 0.0;

    for(int i = 0; i < 4; i++) {
        float xi = (i < 2) ? x1 : x2;
        float zj = ((i == 0) || (i == 2)) ? z1 : z2;
        float signe = ((i == 0) || (i == 3)) ? 1.0 : -1.0;
        
        float dx = xi - xPrime;
        float dz = zj - zPrime;
        float R = sqrt(dx*dx + dz*dz + y2);
        
        V += signe * (dx * log(dz + R) + dz * log(dx + R) - yPrime * atan(dx * dz, yPrime * R));
    }

    return V * sigma / (4.0 * PI * epsilon_0);
}

float wirePotential(vec3 p, vec3 wirePos, vec3 wireDir, float wireHeight, float sigma) {
    vec3 rVec = p - wirePos;

    if(length(rVec) > wireHeight * 3.0){
        float totalCharge = sigma * wireHeight;
        return k_e * totalCharge / length(rVec);
    }

    float z0 = dot(rVec, wireDir);
    vec3 rPerpVec = rVec - z0 * wireDir;

    float rPerp2 = dot(rPerpVec, rPerpVec);
    float rPerp = max(sqrt(rPerp2), 1e-6);

    float z1 = -0.5 * wireHeight - z0;
    float z2 =  0.5 * wireHeight - z0;

    float sqrt1 = sqrt(rPerp2 + z1*z1);
    float sqrt2 = sqrt(rPerp2 + z2*z2);

    float k = sigma / (4.0 * PI * epsilon_0);
    return k * log((z2 + sqrt2) / (z1 + sqrt1));
}

// isHollow => 1 is hollow 0 is not
float chargedSpherePotential(vec3 p, vec3 spherePos, float sphereRad, float sigma, int isHollow){
    vec3 rVec = p - spherePos;
    float r = length(rVec);
    if (r < 1e-6) return 0.0;
    float Q;
    float V;

    if(isHollow == 1){
        float surfArea = 4.0 * PI * sphereRad * sphereRad;
        Q = sigma * surfArea;

        if (r < sphereRad){
            V = k_e * Q / sphereRad;
        } else{
            V = k_e * Q / r;
        }
    } else{
        float volume = (4.0/3.0) * PI * pow(sphereRad, 3.0);
        Q = sigma * volume;

        if (r < sphereRad){
            V = k_e * Q / (2.0 * pow(sphereRad, 3.0)) * (3.0 * pow(sphereRad, 2.0) - pow(r, 2.0));
        } else {
            V = k_e * Q / r;
        }
    }
    return V;
}

float potential(vec3 pos) {
    float multiplier = k_e;
    float result = 0.0;
    float e0 = epsilon_0;

    for (int i = 0; i < chargeCount; i++) {
        vec3 rVec = pos - chargePos[i];
        float r = length(rVec);
        if (r < 0.0001) continue;
        result += multiplier * chargeVal[i] / r;
    }

    for (int i = 0; i < planeCount; i++) {
        vec3 normal = normalize(planeNormals[i]);
        float dist = dot(pos - planePositions[i], normal);
        result += - (planeChargeDensity[i] / (2.0 * e0)) * abs(dist);
    }

    for (int i = 0; i < wireCount; i++) {
        vec3 direction = normalize(wireDirections[i]);
        float rad = wireRadius[i];
        vec3 rVec = pos - wirePositions[i];
        vec3 rPerp = rVec - dot(rVec, direction) * direction;
        float distance = length(rPerp);
        if (distance < rad) distance = rad;
        result += (-wireChargeDensity[i] / (2.0 * PI * e0)) * log(distance);
    }

    for (int i = 0; i < finPlaneCount; i++) {
        result += rectPotential(pos, finPlanePositions[i], normalize(finPlaneNormals[i]), finPlaneDimensions[i], finPlaneChargeDensity[i]);
    }

    for (int i = 0; i < finWireCount; i++) {
        result += wirePotential(pos, finWirePositions[i], normalize(finWireDirections[i]), finWireHeights[i], finWireChargeDensity[i]);
    }

    for (int i = 0; i < chargedSphereCount; i++){
        result += chargedSpherePotential(pos, chargedSpherePositions[i], chargedSphereRadius[i], chargedSphereChargeDensity[i], chargedSphereHollow[i]);
    }

    return result;
}

vec3 getWorldRay(vec2 uv) {
    // Reconstruct clip-space position (-1 to 1)
    vec4 clipPos = vec4(uv, -1.0, 1.0);
    // Convert to view space
    vec4 viewPos = projectionMatrixInverse * clipPos;
    viewPos /= viewPos.w;
    // Ray direction in view space
    vec3 rayDirView = normalize(viewPos.xyz);
    // Convert to world space
    vec3 rayDirWorld = normalize((cameraMatrixWorld * vec4(rayDirView, 0.0)).xyz);
    return rayDirWorld;
}

void main() {
    vec3 rayDir = getWorldRay(vUv);
    vec3 rayPos = cameraPosition;

    float targ = targetVal;
    float totalDist = 0.0;
    // mais do que isto fica lagado
    int steps = 100;
    bool hit = false;

    float stepSize = 0.2;
    float lastPot = potential(rayPos);
    float lastDiff = lastPot - targ;
    float alpha = 0.0;

    for (int i = 0; i < steps; i++) {
        float adaptiveStep = max(0.2, min(3.0, abs(lastDiff) * 0.1));
        rayPos += rayDir * adaptiveStep;
        totalDist += adaptiveStep;
        if (totalDist > 100.0) break;

        float pot = potential(rayPos);
        float diff = pot - targ;

        if (sign(diff) != sign(lastDiff)) {
            float t = abs(lastDiff) / (abs(lastDiff) + abs(diff) + 1e-6);
            vec3 hitPos = rayPos - rayDir * stepSize * (1.0 - t);

            bool behind = isBehindSlice(hitPos);
            if (useSlice && behind){
                rayPos += rayDir * adaptiveStep;
                lastDiff = diff;
                continue;
            }

            float potAtHit = potential(hitPos);
            float error = abs(potAtHit - targ);
            // smoothstep ta alto pq senao ficava feio
            alpha = smoothstep(10.0, 0.0, error);

            rayPos = hitPos;
            hit = true;
            break;
        }

        lastDiff = diff;
    }
    if (hit) {
        float fade = sliceFade(rayPos);
        gl_FragColor = vec4(0.0, 0.6, 1.0, alpha * transparency * fade);
    } else {
        discard;
    }
}