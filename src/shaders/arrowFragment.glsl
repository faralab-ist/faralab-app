precision highp float;

varying vec3 vColor;
varying float vVisible;

void main() {
    if (vVisible < 0.5) discard;
    gl_FragColor = vec4(vColor, 1.0);
}