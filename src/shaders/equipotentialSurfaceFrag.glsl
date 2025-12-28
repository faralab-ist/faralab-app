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

#define MAX_CHARGES 100
uniform int chargeCount;
uniform vec3 chargePos[MAX_CHARGES];
uniform float chargeVal[MAX_CHARGES];
uniform float k_e;

#define PI 3.1415926

// FIXME ver o que o telmo prefere
// 0.2 rapido 
// 0.05 lento e bom
#define minStep 0.2

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
    float gridPot = 0.0;
    vec3 norm = (worldPos - uGridMin) / (uGridMax - uGridMin);
    if (norm.x >= 0.0 && norm.x <= 1.0 &&
        norm.y >= 0.0 && norm.y <= 1.0 &&
        norm.z >= 0.0 && norm.z <= 1.0){
        gridPot = texture(uPotentialVolume, norm).r;
    }
    float analyticPot = 0.0;
    for (int i = 0; i < MAX_CHARGES; i++) {
        if (i >= chargeCount) break;
        vec3 rVec = worldPos - chargePos[i];
        float r = length(rVec);
        if (r < 0.0001) continue;
        analyticPot += k_e * chargeVal[i] / r;
    }
    return gridPot + analyticPot;
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

// axis aligned bounding box (slab method cool technique on wikipedia)
bool intersectAABB(vec3 ro, vec3 rdir, vec3 bmin, vec3 bmax, out float tenter, out float texit){
    vec3 invDir = 1.0 / rdir;
    vec3 t0 = (bmin - ro) * invDir;
    vec3 t1 = (bmax - ro) * invDir;

    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);

    tenter = max(max(tmin.x, tmin.y), tmin.z);
    texit = min(min(tmax.x, tmax.y), tmax.z);

    return texit > max(tenter, 0.0);
}

void main() {
    vec3 rayDir = getWorldRay(vUv);

    float tenter, texit;
    if (!intersectAABB(cameraPosition, rayDir, uGridMin, uGridMax, tenter, texit)) {
        discard;
    }

    float totalDist = max(tenter, 0.0) + 0.01;
    vec3 rayPos = cameraPosition + rayDir * totalDist;

    float targ = targetVal;
    // mais do que isto fica lagado
    int steps = 100;
    bool hit = false;

    float stepSize = 0.2;
    float lastPot = samplePotential(rayPos);
    float lastDiff = lastPot - targ;
    float alpha = 0.0;

    for (int i = 0; i < steps; i++) {
        float adaptiveStep = clamp(abs(lastDiff) * 0.07, minStep, 3.0);
        rayPos += rayDir * adaptiveStep;
        totalDist += adaptiveStep;
        //if (totalDist > 150.0) break;
        if (totalDist > texit) break;

        float pot = samplePotential(rayPos);
        float diff = pot - targ;

        if (sign(diff) != sign(lastDiff)) {
            // 1 moving backwards
            //float t = abs(lastDiff) / (abs(lastDiff) + abs(diff) + 1e-6);
            //vec3 hitPos = rayPos - rayDir * adaptiveStep * (1.0 - t);

            // 3 approaches
            vec3 a = rayPos - rayDir * adaptiveStep;
            vec3 b = rayPos;
            float da = lastDiff;
            float db = diff;
            for (int j = 0; j < 3; j++){
                float t = da / (da - db + 1e-6);
                vec3 m = mix(a, b, t);
                float dm = samplePotential(m) - targ;
                if (sign(dm) == sign(da)){
                    a = m; da = dm;
                } else {
                    b = m; db = dm;
                }
            }
            vec3 hitPos = 0.5 * (a + b);

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
    //gl_FragColor = vec4(1.0, 1.0, 1.0, totalDist/90.0);
    //return;
    if (hit) {
        float fade = sliceFade(rayPos);
        gl_FragColor = vec4(0.0, 0.6, 1.0, alpha * transparency * fade);
    } else {
        discard;
    }
}