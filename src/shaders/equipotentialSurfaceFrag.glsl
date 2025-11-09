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

#define MAX_FIN_PLANES 6
uniform int finPlaneCount;
uniform float finPlaneChargeDensity[MAX_FIN_PLANES];
uniform vec3 finPlanePositions[MAX_FIN_PLANES];
uniform vec3 finPlaneNormals[MAX_FIN_PLANES];
uniform vec2 finPlaneDimensions[MAX_FIN_PLANES];

#define PI 3.1415926

// Fast log (clamped to avoid negatives)
float safeLog(float val) {
    return log(max(val, 1e-6));
}

// Fast atan approximation (atan2)
float fastAtan2(float y, float x) {
    float abs_y = abs(y) + 1e-10;
    float angle;
    if (x >= 0.0)
        angle = atan(abs_y / x);
    else
        angle = 3.1415926 - atan(abs_y / -x);
    return y < 0.0 ? -angle : angle;
}

float rectPotential(vec3 p, vec3 planePos, vec3 normal, vec2 dims, float sigma) {
    // Build local plane coordinates
    vec3 u = vec3(1.0, 0.0, 0.0);
    if(abs(dot(normal, u)) > 0.9) u = vec3(0.0, 1.0, 0.0);
    vec3 v = normalize(cross(normal, u));
    u = normalize(cross(v, normal));

    // Local coordinates
    vec3 rVec = p - planePos;
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

    float xi, zj, R, atanTerm, signe, log_x, log_z;

    // Corner (x1, z1)
    xi = x1 - xPrime; zj = z1 - zPrime;
    R = sqrt(xi*xi + zj*zj + y2);
    atanTerm = fastAtan2(xi*zj, yPrime*R);
    log_x = safeLog(xi + R); log_z = safeLog(zj + R);
    signe = 1.0;
    V += signe * (xi*log_z + zj*log_x - yPrime*atanTerm);

    // Corner (x1, z2)
    xi = x1 - xPrime; zj = z2 - zPrime;
    R = sqrt(xi*xi + zj*zj + y2);
    atanTerm = fastAtan2(xi*zj, yPrime*R);
    log_x = safeLog(xi + R); log_z = safeLog(zj + R);
    signe = -1.0;
    V += signe * (xi*log_z + zj*log_x - yPrime*atanTerm);

    // Corner (x2, z1)
    xi = x2 - xPrime; zj = z1 - zPrime;
    R = sqrt(xi*xi + zj*zj + y2);
    atanTerm = fastAtan2(xi*zj, yPrime*R);
    log_x = safeLog(xi + R); log_z = safeLog(zj + R);
    signe = -1.0;
    V += signe * (xi*log_z + zj*log_x - yPrime*atanTerm);

    // Corner (x2, z2)
    xi = x2 - xPrime; zj = z2 - zPrime;
    R = sqrt(xi*xi + zj*zj + y2);
    atanTerm = fastAtan2(xi*zj, yPrime*R);
    log_x = safeLog(xi + R); log_z = safeLog(zj + R);
    signe = 1.0;
    V += signe * (xi*log_z + zj*log_x - yPrime*atanTerm);

    return V * sigma / (4.0 * PI * epsilon_0);
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
        vec3 rVec = pos - wirePositions[i];
        vec3 rPerp = rVec - dot(rVec, direction) * direction;
        float distance = length(rPerp);
        if (distance < 0.0001) continue;
        result += (wireChargeDensity[i] / (2.0 * PI * e0)) * log(distance);
    }

    for (int i = 0; i < finPlaneCount; i++) {
        result += rectPotential(pos, finPlanePositions[i], normalize(finPlaneNormals[i]), finPlaneDimensions[i], finPlaneChargeDensity[i]);
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
            alpha = smoothstep(0.9, 0.0, error);

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