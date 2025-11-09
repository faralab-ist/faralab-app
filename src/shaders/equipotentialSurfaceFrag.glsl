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

float potential(vec3 pos) {
    float multiplier = k_e;
    float result = 0.0;
    float PI = 3.14159265;
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
        vec3 rVec = pos - wirePositions[i];
        vec3 rPerp = rVec - dot(rVec, direction) * direction;
        float distance = length(rPerp);
        if (distance < 0.0001) continue;
        result += (wireChargeDensity[i] / (2.0 * PI * e0)) * log(distance);
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

    float stepSize = 0.3;
    float lastPot = potential(rayPos);
    float lastDiff = lastPot - targ;
    float alpha = 0.0;

    for (int i = 0; i < steps; i++) {
        rayPos += rayDir * stepSize;
        totalDist += stepSize;
        if (totalDist > 200.0) break;

        float pot = potential(rayPos);
        float diff = pot - targ;

        if (sign(diff) != sign(lastDiff)) {
            float t = abs(lastDiff) / (abs(lastDiff) + abs(diff) + 1e-6);
            rayPos -= rayDir * stepSize * (1.0 - t);

            float potAtHit = potential(rayPos);
            float error = abs(potAtHit - targ);
            // smoothstep ta alto pq senao ficava feio
            alpha = smoothstep(0.7, 0.0, error);

            hit = true;
            break;
        }

        lastDiff = diff;
    }
    if (hit) {
        gl_FragColor = vec4(0.0, 0.6, 1.0, alpha * transparency);
    } else {
        discard;
    }
}