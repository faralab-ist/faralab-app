attribute vec3 instancePosition;
attribute vec3 instanceDirection;
attribute float instanceScale;
attribute vec3 instanceColor;
attribute float instanceDelay;

uniform float uProgress;

varying vec3 vColor;
varying float vVisible;

vec3 rotateToDirection(vec3 v, vec3 dir){
    vec3 up = vec3(0.0, 1.0, 0.0);
    float cosTheta = dot(up, dir);

    if (abs(cosTheta - 1.0) < 1e-5) {
        return v; 
    }
    if (abs(cosTheta + 1.0) < 1e-5) {
        return vec3(v.x, -v.y, -v.z);
    }

    vec3 rotationAxis = normalize(cross(up, dir));
    float angle = acos(clamp(cosTheta, -1.0, 1.0));
    return v * cos(angle)
     + cross(rotationAxis, v) * sin(angle) 
     + rotationAxis * dot(rotationAxis, v) * (1.0 - cos(angle));
}

void main(){
    // Determine if this instance should be visible at the current wave progress
    bool isVisible = (instanceDelay < 0.0) || (instanceDelay <= uProgress + 1e-4);
    vVisible = isVisible ? 1.0 : 0.0;

    vec3 transformed = position;
    transformed = rotateToDirection(transformed, normalize(instanceDirection));
    transformed *= instanceScale;
    transformed += instancePosition;

    vColor = instanceColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}