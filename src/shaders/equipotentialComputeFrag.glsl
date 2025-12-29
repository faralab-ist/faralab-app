precision highp float;
uniform vec3 uGridMin;
uniform vec3 uGridMax;
uniform int uGridRes;
uniform int sliceIndex;
varying vec2 vUv;

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

#define PI 3.1415926

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

vec3 getGridPos(vec2 uv){
    float zIndex = float(sliceIndex);
    float xIndex = uv.x * float(uGridRes);
    float yIndex = uv.y * float(uGridRes);

    // why these offsets?
    // it is not me who knows
    vec3 normalizedPos = vec3(
        (xIndex + 0.0) / float(uGridRes),
        (yIndex + 0.0) / float(uGridRes),
        (zIndex + 0.5) / float(uGridRes)
    );

    return mix(uGridMin, uGridMax, normalizedPos);
}


void main() {
    vec3 gridPos = getGridPos(vUv);
    float V = potential(gridPos);
    gl_FragColor = vec4(V, 0.0, 0.0, 1.0);
}