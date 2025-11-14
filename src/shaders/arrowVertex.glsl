attribute vec3 instancePosition;
attribute vec3 instanceDirection;
attribute float instanceScale;
attribute vec3 instanceColor;

varying vec3 vColor;

vec3 rotateToDirection(vec3 v, vec3 dir){
    vec3 up = vec3(0.0, 1.0, 0.0);
    // since dir is normalized
    float cosTheta = dot(up, dir);

    //avoid cross product being zero
    if (abs(cosTheta - 1.0) < 1e-5) {
        return v; 
    }
    if (abs(cosTheta + 1.0) < 1e-5) {
        return vec3(v.x, -v.y, -v.z);
    }

    vec3 rotationAxis = normalize(cross(up, dir));
    float angle = acos(clamp(cosTheta, -1.0, 1.0));
    // Rodrigues' rotation formula
    return v * cos(angle)
     + cross(rotationAxis, v) * sin(angle) 
     + rotationAxis * dot(rotationAxis, v) * (1.0 - cos(angle));
}

void main(){
    vec3 transformed = position;

    transformed = rotateToDirection(transformed, normalize(instanceDirection));
    transformed *= instanceScale;
    transformed += instancePosition;

    vColor = instanceColor;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}