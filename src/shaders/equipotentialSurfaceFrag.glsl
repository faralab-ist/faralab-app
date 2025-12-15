precision highp float;
uniform mat4 cameraMatrixWorld;
uniform mat4 projectionMatrixInverse;
varying vec2 vUv;
uniform sampler3D uPotentialVolume;
uniform vec3 uGridMin;
uniform vec3 uGridMax;
uniform int uGridRes;

uniform float targetVal;
uniform float transparency;

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

float samplePotential(vec3 worldPos){
    vec3 norm = (worldPos - uGridMin) / (uGridMax - uGridMin);
    if (norm.x < 0.0 || norm.x > 1.0 ||
        norm.y < 0.0 || norm.y > 1.0 ||
        norm.z < 0.0 || norm.z > 1.0){
        return 0.0;
    }
    return texture(uPotentialVolume, norm).r;
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
    int steps = 150;
    bool hit = false;

    float stepSize = 0.2;
    float lastPot = samplePotential(rayPos);
    float lastDiff = lastPot - targ;
    float alpha = 0.0;

    for (int i = 0; i < steps; i++) {
        float adaptiveStep = max(0.08, min(2.0, abs(lastDiff) * 0.07));
        rayPos += rayDir * adaptiveStep;
        totalDist += adaptiveStep;
        if (totalDist > 200.0) break;

        float pot = samplePotential(rayPos);
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

            float potAtHit = samplePotential(hitPos);
            float error = abs(potAtHit - targ);
            // smoothstep ta alto pq senao ficava feio
            alpha = smoothstep(100.0, 0.0, error);

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