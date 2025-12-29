import React, { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { buildChargeTextures, buildGridPositions } from '../utils/gpuMagField';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export default function MagFieldArrowsGPU({
    objects,
    gridSize = 10,
    step = 1,
    planeFilter = null,
    fieldThreshold = 0.01,
    scaleMultiplier = 1.0,
    slicePlane,
    slicePos,
    useSlice,
    slicePlaneFlip,
}) {
    const { gl, scene, camera } = useThree();

    const logMax = Math.log(1 + 1000); // temp hardcoded val

    const gridInfo = useMemo(() => {
        return buildGridPositions(
            gridSize, 
            step, 
            planeFilter,
            slicePlane,
            slicePos,
            useSlice,
            slicePlaneFlip,
        );
    }, [gridSize, step, planeFilter, slicePlane, slicePos, useSlice, slicePlaneFlip]);

    const chargeInfo = useMemo(() => {
        return buildChargeTextures(objects);
    }, [objects]);

    const renderTargetWidth = gridInfo.size;
    const renderTargetHeight = gridInfo.size;
    const renderTarget = useMemo(() => {
        const rt = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            type: THREE.FloatType,
            format: THREE.RGBAFormat,
            depthBuffer: false,
            stencilBuffer: false,
        });
        rt.texture.generateMipmaps = false;
        return rt;
    }, [renderTargetWidth, renderTargetHeight]);

    const computeMaterial = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                gridTex: { value: gridInfo.tex },
                gridTexSize: { value: gridInfo.size },
                chargePosTex: { value: null },
                chargePosSize: { value: 0 },
                tangentTex: { value: null },
                tangentSize: { value: 0 },
                factorTex: { value: null },
                factorSize: { value: 0 },
                chargeCount: { value: 0 },
                texSize: { value: renderTargetWidth },
            },
            vertexShader: `
                precision highp float;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                precision highp sampler2D;
                in vec2 vUv;

                uniform sampler2D gridTex;
                uniform int gridTexSize;

                uniform sampler2D chargePosTex;
                uniform int chargePosSize;

                uniform sampler2D tangentTex;
                uniform int tangentSize;

                uniform sampler2D factorTex;
                uniform int factorSize;

                uniform int chargeCount;
                uniform int texSize;

                vec2 uvFromIndex(int idx, int size){
                    float s = float(size);
                    int x = idx % size;
                    int y = idx / size;
                    return (vec2(float(x), float(y)) + 0.5) / s;
                }

                vec3 fetchGridByIndex(int idx){
                    vec2 uv = uvFromIndex(idx, gridTexSize);
                    vec4 d = texture(gridTex, uv);
                    return d.xyz;
                }

                vec4 fetchChargePos(int idx){
                    vec2 uv = uvFromIndex(idx, chargePosSize);
                    return texture(chargePosTex, uv);
                }

                vec4 fetchTangent(int idx){
                    vec2 uv = uvFromIndex(idx, tangentSize);
                    return texture(tangentTex, uv);
                }

                vec4 fetchFactor(int idx){
                    vec2 uv = uvFromIndex(idx, factorSize);
                    return texture(factorTex, uv);
                }

                void main(){
                    int px = int(floor(vUv.x * float(texSize)));
                    int py = int(floor(vUv.y * float(texSize)));
                    int idx = py * texSize + px;

                    if (idx >= ${gridInfo.count}) {
                        gl_FragColor = vec4(0.0);
                        return;
                    }

                    vec3 P = fetchGridByIndex(idx);
                    vec3 B = vec3(0.0);

                    for (int i = 0; i < 1024; i++){
                        if (i >= chargeCount) break;
                        vec3 C = fetchChargePos(i).xyz;
                        vec3 T = normalize(fetchTangent(i).xyz);
                        float F = fetchFactor(i).x;

                        vec3 R = P - C;
                        float rSq = dot(R, R);
                        if (rSq < 0.0001) continue;
                        R = normalize(R);

                        vec3 dB = (F / rSq) * cross(T, R);
                        B += dB;
                    }

                    float mag = length(B);
                    gl_FragColor = vec4(B, mag);
                }
            `,
            depthWrite: false,
            depthTest: false,
        });
        return mat;
    }, [gridInfo.tex, renderTargetWidth, gridInfo.count]);

    const computeScene = useMemo(() => {
        const scene = new THREE.Scene();
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geom = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geom, computeMaterial);
        scene.add(mesh);
        return { scene: scene, camera: cam, mesh: mesh };
    }, [computeMaterial]);

    const arrowGeometry = useMemo(() => { 
        const s = scaleMultiplier || 1;
        const shaft = new THREE.CylinderGeometry(0.01, 0.01, 0.8 * s, 6);
        const head = new THREE.ConeGeometry(0.05, 0.2, 8);
        head.translate(0, 0.4 * s, 0);
        const merged = BufferGeometryUtils.mergeGeometries([shaft, head]);
        merged.computeVertexNormals();
        merged.translate(0, 0.4 * s, 0);
        merged.computeBoundingSphere();
        return merged;
    }, [scaleMultiplier]);

    //console.log(fieldThreshold);
    const instMaterial = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                fieldTex: { value: renderTarget.texture },
                fieldTexSize: { value: renderTargetWidth },
                gridTex: { value: gridInfo.tex },
                gridTexSize: { value: gridInfo.size },
                logMax: { value: logMax },
                fieldThreshold: { value: fieldThreshold },
            },
            vertexShader: `
                precision highp float;

                uniform sampler2D fieldTex;
                uniform int fieldTexSize;
                uniform sampler2D gridTex;
                uniform int gridTexSize;
                uniform float logMax;

                uniform float fieldThreshold;
                
                out vec3 vColor;

                vec2 uvFromIndex(int idx, int size){
                    float s = float(size);
                    int x = idx % size;
                    int y = idx / size;
                    return (vec2(float(x), float(y)) + 0.5) / s;
                }

                vec4 sampleField(int idx){
                    vec2 uv = uvFromIndex(idx, fieldTexSize);
                    return texture(fieldTex, uv);
                }

                vec3 hsl2rgb(float h, float s, float l) {
                    float c = (1.0 - abs(2.0*l - 1.0)) * s;
                    float hp = h * 6.0;
                    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
                    vec3 rgb;
                    if (hp < 1.0) rgb = vec3(c, x, 0.0);
                    else if (hp < 2.0) rgb = vec3(x, c, 0.0);
                    else if (hp < 3.0) rgb = vec3(0.0, c, x);
                    else if (hp < 4.0) rgb = vec3(0.0, x, c);
                    else if (hp < 5.0) rgb = vec3(x, 0.0, c);
                    else rgb = vec3(c, 0.0, x);
                    float m = l - c/2.0;
                    return rgb + vec3(m);
                }


                vec3 rotateToDirection(vec3 v, vec3 dir){
                    vec3 up = vec3(0.0, 1.0, 0.0);
                    float cosTheta = dot(up, dir);
                    if (abs(cosTheta - 1.0) < 1e-5) return v;
                    if (abs(cosTheta + 1.0) < 1e-5) return vec3(v.x, -v.y, -v.z);
                    vec3 rotationAxis = normalize(cross(up, dir));
                    float angle = acos(clamp(cosTheta, -1.0, 1.0));
                    return v * cos(angle)
                    + cross(rotationAxis, v) * sin(angle)
                    + rotationAxis * dot(rotationAxis, v) * (1.0 - cos(angle));
                }

                void main(){
                    int idx = int(gl_InstanceID);

                    if (idx >= ${gridInfo.count}) {
                        gl_Position = vec4(0.0);
                        return;
                    }

                    vec4 fieldData = sampleField(idx);
                    vec3 B = fieldData.xyz;
                    float mag = fieldData.w;
                    if (mag < fieldThreshold) {
                        return;
                    }

                    vec3 dir = mag > 1e-5 ? normalize(B) : vec3(0.0, 1.0, 0.0);

                    vec3 transformed = position;
                    transformed = rotateToDirection(transformed, dir);

                    float logMag = log(1.0 + mag);
                    float normalized = clamp(logMag / logMax, 0.0, 1.0);
                    float parameter = 1.0 - exp(-logMag);
                    float scale = clamp(parameter, 0.0, 1.0);
                    transformed *= scale;

                    vec2 gUV = uvFromIndex(idx, gridTexSize);
                    vec4 g = texture(gridTex, gUV);
                    transformed += g.xyz;

                    float hue = (1.0 - normalized) * 0.66; 
                    vColor = hsl2rgb(hue, 1.0, 0.5);

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                in vec3 vColor;
                void main(){
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `,
            transparent: true,
        });
        return mat;
    }, [renderTarget.texture, renderTargetWidth, gridInfo.tex, logMax, fieldThreshold]);

    const instRef = useRef();

    useEffect(() => {
        return () => {
            gridInfo.tex?.dispose?.();
        };
    }, [gridInfo]);

    useEffect(() => {
        return () => {
            chargeInfo.posTex?.dispose?.();
            chargeInfo.tanTex?.dispose?.();
            chargeInfo.factorTex?.dispose?.();
        };
    }, [chargeInfo]);

    useEffect(() => {
        return () => {
            instMaterial.uniforms.fieldTex.value = null;
            renderTarget?.dispose?.();
        };
    }, [renderTarget, instMaterial]);

    useEffect(() => {
        return () => {
            computeMaterial.dispose();
            instMaterial.dispose();
        };
    }, [computeMaterial, instMaterial]);

    useEffect(() => {
        return () => {
            arrowGeometry.dispose();
        };
    }, [arrowGeometry]);

    useEffect(() => {
        return () => {
            computeScene.mesh.geometry.dispose();
        };
    }, [computeScene]);

    useEffect(() => {
        if (!instRef.current) return;
        const mesh = instRef.current;

        mesh.geometry = arrowGeometry;
        mesh.material = instMaterial;
        mesh.count = gridInfo.count;

        instMaterial.uniforms.gridTex.value = gridInfo.tex;
        instMaterial.uniforms.gridTexSize.value = gridInfo.size;
        instMaterial.uniforms.fieldTex.value = renderTarget.texture;
        instMaterial.uniforms.fieldTexSize.value = renderTargetWidth;

        instMaterial.needsUpdate = true;
    }, [arrowGeometry, instMaterial, gridInfo.count, gridInfo.size, renderTarget.texture, renderTargetWidth]);

    useFrame(() => {
        
        if (computeMaterial.uniforms.chargeCount) computeMaterial.uniforms.chargeCount.value = chargeInfo.count;
        computeMaterial.uniforms.gridTex.value = gridInfo.tex;
        computeMaterial.uniforms.gridTexSize.value = gridInfo.size;
        computeMaterial.uniforms.chargePosTex.value = chargeInfo.posTex;
        computeMaterial.uniforms.chargePosSize.value = chargeInfo.posSize;
        computeMaterial.uniforms.tangentTex.value = chargeInfo.tanTex;
        computeMaterial.uniforms.tangentSize.value = chargeInfo.tanSize;
        computeMaterial.uniforms.factorTex.value = chargeInfo.factorTex;
        computeMaterial.uniforms.factorSize.value = chargeInfo.factorSize;

        gl.setRenderTarget(renderTarget);
        gl.clearColor(0,0,0,0);
        gl.clear(true, true, true);
        gl.render(computeScene.scene, computeScene.camera);
        gl.setRenderTarget(null);
    });

    if (gridInfo.count === 0) return null;
    return (
        <instancedMesh
            ref={instRef}
            args={[arrowGeometry, instMaterial, gridInfo.count]}
        />
    );
}