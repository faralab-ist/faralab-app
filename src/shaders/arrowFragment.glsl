precision highp float;

varying vec3 vColor;
varying float vReveal;

void main() {
    gl_FragColor = vec4(vColor, vReveal);
}