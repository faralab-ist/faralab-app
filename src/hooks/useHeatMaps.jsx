import React, { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { buildChargeTextures, buildGridPositions, buildPlaneSamplePoints } from '../utils/gpuMagField';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export default function HeatMap({
    objects,
    gridSize = 10,
    resolution = 128,
    plane = 'xy', // 'xy', 'xz', 'yz'
    planeOffset = 0,
    field = 'B', // E or B -----> E is hard im not doing it for now because too many uniforms maybe after an E field rework
}) {
    const { gl, scene, camera } = useThree();

    const gridInfo = useMemo(() => {
        return buildPlaneSamplePoints(
            gridSize,
            resolution,
            plane,
            planeOffset,
        );
    }, [gridSize, resolution, plane, planeOffset]);

    const chargeInfo = useMemo(() => {
        return buildChargeTextures(objects);
    }, [objects]);

    //console.log(gridInfo, chargeInfo);

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
                chargePosTex: { value: null },
                chargePosSize: { value: 0 },
                tangentTex: { value: null },
                tangentSize: { value: 0 },
                factorTex: { value: null },
                factorSize: { value: 0 },
                chargeCount: { value: 0 },
                texSize: { value: renderTargetWidth },
                gridPoints: { value: gridInfo.count },
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

                uniform sampler2D chargePosTex;
                uniform int chargePosSize;

                uniform sampler2D tangentTex;
                uniform int tangentSize;

                uniform sampler2D factorTex;
                uniform int factorSize;

                uniform int chargeCount;

                uniform int texSize;
                uniform int gridPoints;

                vec2 uvFromIndex(int idx, int size){
                    float s = float(size);
                    int x = idx % size;
                    int y = idx / size;
                    return (vec2(float(x), float(y)) + 0.5) / s;
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

                    if (idx >= gridPoints) {
                        gl_FragColor = vec4(0.0);
                        return;
                    }

                    vec3 P = texture(gridTex, vUv).xyz;
                    vec3 B = vec3(0.0);

                    for (int i = 0; i < 1024; i++){
                        if (i >= chargeCount) break;
                        vec3 C = fetchChargePos(i).xyz;
                        vec3 T = normalize(fetchTangent(i).xyz);
                        float F = fetchFactor(i).x;

                        vec3 R = P - C;
                        float rSq = dot(R, R);
                        if (rSq < 0.0001) continue;

                        vec3 dB = (F / (rSq * sqrt(rSq))) * cross(T, R);
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

    const planeRef = useRef();
    const planeSize = gridSize*2;
    const planeGeom = useMemo(() => {
        return new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);
    }, [planeSize]);

    const displayMaterial = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                fieldTex: { value: renderTarget.texture },
                maxMag: { value: 15.0 },
                texSize: { value: renderTargetWidth },
            },
            vertexShader: `
                precision highp float;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                precision highp sampler2D;
                in vec2 vUv;

                uniform sampler2D fieldTex;
                uniform int texSize;
                uniform float maxMag;

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

                void main(){
                    vec4 val = texture(fieldTex, vUv);
                    float mag = val.a;
                    float normMag = clamp(mag / maxMag, 0.0, 1.0);
                    float hue = mix(0.66, 0.0, normMag);
                    vec3 color = hsl2rgb(hue, 1.0, 0.5);
                    //work on this
                    float alpha = smoothstep(0.0, 0.1, normMag);
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });
        return mat;
    }, [renderTarget.texture, renderTargetWidth]);

    useEffect(() => {
        if (!displayMaterial) return;
        displayMaterial.uniforms.fieldTex.value = renderTarget.texture;
        renderTarget.texture.minFilter = THREE.NearestFilter;
        renderTarget.texture.magFilter = THREE.NearestFilter;

        return () => {
            displayMaterial.uniforms.fieldTex.value = null;
        };
    }, [displayMaterial, renderTarget]);

    let joe = 0;

    useEffect(() => {
        if (!planeRef.current) return;
        const mesh = planeRef.current;
        mesh.rotation.set(0, 0, 0);
        mesh.position.set(0, 0, 0);

        // rotations were trial and error
        if (plane === 'xy') {
            mesh.rotation.z = Math.PI / 2;
            mesh.rotation.y = Math.PI;
            mesh.position.set(0, 0, planeOffset);
        } else if (plane === 'xz') {
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = -Math.PI / 2;
            mesh.position.set(0, planeOffset, 0);
        } else if (plane === 'yz') {
            mesh.rotation.y = -Math.PI / 2;
            //mesh.rotation.z = Math.PI / 2;
            mesh.position.set(planeOffset, 0, 0);
        } else {
            mesh.position.set(0, 0, planeOffset);
        }

    }, [plane, planeOffset, joe]);

    useEffect(() => {
        return () => {
            planeGeom.dispose?.();
            displayMaterial.dispose?.();
        };
    }, [planeGeom, displayMaterial]);

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
            renderTarget?.dispose?.();
        };
    }, [renderTarget]);

    useEffect(() => {
        return () => {
            computeMaterial.dispose();
        };
    }, [computeMaterial]);

    useEffect(() => {
        return () => {
            computeScene.mesh.geometry.dispose();
        };
    }, [computeScene]);

    useFrame(() => {
        
        if (computeMaterial.uniforms.chargeCount) computeMaterial.uniforms.chargeCount.value = chargeInfo.count;
        computeMaterial.uniforms.gridTex.value = gridInfo.tex;
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
        <mesh
            ref={planeRef}
            geometry={planeGeom}
            material={displayMaterial}
        />
    );
}