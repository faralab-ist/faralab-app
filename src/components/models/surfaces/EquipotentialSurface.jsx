import * as THREE from 'three';
import { useThree , useFrame} from '@react-three/fiber';
import { useMemo, useEffect, useRef } from 'react';
import equipotentialShaderFragmentSource from '../../../shaders/equipotentialSurfaceFrag.glsl';
import computeShaderSrc from '../../../shaders/equipotentialComputeFrag.glsl';
import { EPSILON_0, K_E } from '../../../physics/constants';
import { efields } from '../../../physics'

const RESOLUTION = 64;
const GRID_MIN = new THREE.Vector3(-10, -10, -10);
const GRID_MAX = new THREE.Vector3(10, 10, 10);

export default function EquipotentialSurface({ objects, targetValue = 1.0, transparency = 0.6, slicePlane, slicePos, useSlice, slicePlaneFlip}) {
    const { camera, gl, size } = useThree();

    const computeRt = useMemo(() => {
        const rt = new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            depthBuffer: false,
            stencilBuffer: false,
        });
        rt.texture.generateMipmaps = false;
        return rt;
    }, []);

    const computeScene = useMemo(() => new THREE.Scene(), []);
    const computeCam = useMemo(() => {
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        cam.position.z = 0.1;
        return cam;
    }, []);

    const computeMaterial = useMemo(() => {
        const MAX_CHARGES = 100;
        const MAX_INF_PLANES = 6;
        const MAX_INF_WIRES = 6;
        const MAX_FIN_PLANES = 6;
        const MAX_FIN_WIRES = 6;
        const MAX_CHARGED_SPHERES = 15;

        return new THREE.ShaderMaterial({
            uniforms: {
                uGridMin: { value: GRID_MIN },
                uGridMax: { value: GRID_MAX },
                uGridRes: {value: RESOLUTION},
                //cameraMatrixWorld : { value: new THREE.Matrix4() },
                //projectionMatrixInverse : {value : new THREE.Matrix4()},
                sliceIndex: { value: 0 },

                chargeCount: { value: 0 },
                chargePos: { value: new Array(MAX_CHARGES).fill(new THREE.Vector3()) },
                chargeVal: { value: new Float32Array(MAX_CHARGES).fill(0) },
                planeCount: { value: 0 },
                planePositions: { value: new Array(MAX_INF_PLANES).fill(new THREE.Vector3()) },
                planeNormals: { value: new Array(MAX_INF_PLANES).fill(new THREE.Vector3()) },
                planeChargeDensity: { value: new Float32Array(MAX_INF_PLANES).fill(0) },
                finPlaneCount: { value: 0 },
                finPlanePositions: { value: new Array(MAX_FIN_PLANES).fill(new THREE.Vector3()) },
                finPlaneNormals: { value: new Array(MAX_FIN_PLANES).fill(new THREE.Vector3()) },
                finPlaneChargeDensity: { value: new Float32Array(MAX_FIN_PLANES).fill(0) },
                finPlaneDimensions: { value: new Array(MAX_FIN_PLANES).fill(new THREE.Vector2()) },
                finWireCount: { value: 0 },
                finWirePositions: { value: new Array(MAX_FIN_WIRES).fill(new THREE.Vector3()) },
                finWireDirections: { value: new Array(MAX_FIN_WIRES).fill(new THREE.Vector3()) },
                finWireChargeDensity: { value: new Float32Array(MAX_FIN_WIRES).fill(0) },
                finWireHeights: { value: new Float32Array(MAX_FIN_WIRES).fill(0) },
                wireCount: { value: 0 },
                wirePositions: { value: new Array(MAX_INF_WIRES).fill(new THREE.Vector3()) },
                wireDirections: { value: new Array(MAX_INF_WIRES).fill(new THREE.Vector3()) },
                wireChargeDensity: { value: new Float32Array(MAX_INF_WIRES).fill(0) },
                wireRadius: { value: new Float32Array(MAX_INF_WIRES).fill(0) },
                chargedSphereCount: {value: 0},
                chargedSpherePositions: { value: new Array(MAX_CHARGED_SPHERES).fill(new THREE.Vector3()) },
                chargedSphereRadius: { value: new Float32Array(MAX_CHARGED_SPHERES).fill(0) },
                chargedSphereChargeDensity: { value: new Float32Array(MAX_CHARGED_SPHERES).fill(0) },
                chargedSphereHollow: {value: new Int32Array(MAX_CHARGED_SPHERES).fill(0)},
                
                epsilon_0 : { value: EPSILON_0 },
                k_e : { value: K_E },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: computeShaderSrc,
        })
    }, []);

    useEffect(() => {
        const computeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), computeMaterial);
        computeScene.add(computeMesh);
        return () => computeScene.remove(computeMesh);
    }, [computeMaterial, computeScene]);

    const visualMaterial = useMemo(() => 
        new THREE.ShaderMaterial({
            uniforms: {
                uPotentialVolume: { value: null },
                cameraMatrixWorld : { value: new THREE.Matrix4() },
                projectionMatrixInverse : {value : new THREE.Matrix4()},
                uGridRes: {value: RESOLUTION},
                uGridMin: { value: GRID_MIN },
                uGridMax: { value: GRID_MAX },
                targetVal: { value: 0.0 },
                cameraPosition: { value: new THREE.Vector3() },
                inverseViewMatrix: { value: new THREE.Matrix4() },
                inverseProjectionMatrix: { value: new THREE.Matrix4() },
                transparency: { value: transparency },
                useSlice: { value: false },
                slicePlane: { value: new THREE.Vector3(1, 0, 0) },
                slicePos: { value: 0.0 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = position.xy;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: equipotentialShaderFragmentSource,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true,
        })
    , [size.width, size.height, transparency]);

    useEffect(() => {
        let chargeIdx = 0;
        let planeIdx = 0;
        let finPlaneIdx = 0;
        let wireIdx = 0;
        let finWireIdx = 0;
        let chargedSphereIdx = 0;

        objects.forEach((obj) => {
            if (obj.type === 'charge') {
                computeMaterial.uniforms.chargePos.value[chargeIdx] = new THREE.Vector3(...obj.position);
                computeMaterial.uniforms.chargeVal.value[chargeIdx] = obj.charge;
                chargeIdx++;
            } else if (obj.type === 'plane' && obj.infinite) {
                computeMaterial.uniforms.planePositions.value[planeIdx] = new THREE.Vector3(...obj.position);
                computeMaterial.uniforms.planeNormals.value[planeIdx] = new THREE.Vector3(...obj.direction).normalize();
                computeMaterial.uniforms.planeChargeDensity.value[planeIdx] = obj.charge_density;
                planeIdx++;
            } else if (obj.type === 'wire' && obj.infinite) {
                computeMaterial.uniforms.wirePositions.value[wireIdx] = new THREE.Vector3(...obj.position);
                computeMaterial.uniforms.wireDirections.value[wireIdx] = new THREE.Vector3(...obj.direction).normalize();
                computeMaterial.uniforms.wireChargeDensity.value[wireIdx] = obj.charge_density;
                computeMaterial.uniforms.wireRadius.value[wireIdx] = obj.radius || 0;
                wireIdx++;
            } else if (obj.type === 'plane' && !obj.infinite) {
                computeMaterial.uniforms.finPlanePositions.value[finPlaneIdx] = new THREE.Vector3(...obj.position);
                computeMaterial.uniforms.finPlaneNormals.value[finPlaneIdx] = new THREE.Vector3(...obj.direction).normalize();
                computeMaterial.uniforms.finPlaneChargeDensity.value[finPlaneIdx] = obj.charge_density;
                computeMaterial.uniforms.finPlaneDimensions.value[finPlaneIdx] = new THREE.Vector2(...(obj.dimensions || [1,1]));
                finPlaneIdx++;
            } else if (obj.type === 'wire' && !obj.infinite) {
                computeMaterial.uniforms.finWirePositions.value[finWireIdx] = new THREE.Vector3(...obj.position);
                computeMaterial.uniforms.finWireDirections.value[finWireIdx] = new THREE.Vector3(...obj.direction).normalize();
                computeMaterial.uniforms.finWireChargeDensity.value[finWireIdx] = obj.charge_density;
                computeMaterial.uniforms.finWireHeights.value[finWireIdx] = obj.height || 1.0;
                finWireIdx++;
            } else if (obj.type === 'chargedSphere') {
                computeMaterial.uniforms.chargedSpherePositions.value[chargedSphereIdx] = new THREE.Vector3(...obj.position);
                computeMaterial.uniforms.chargedSphereRadius.value[chargedSphereIdx] = obj.radius || 1.0;
                computeMaterial.uniforms.chargedSphereChargeDensity.value[chargedSphereIdx] = obj.charge_density;
                computeMaterial.uniforms.chargedSphereHollow.value[chargedSphereIdx] = obj.isHollow ? 1 : 0;
                chargedSphereIdx++;
            } else if (obj.type === 'concentricSpheres') {
                //console.log(obj.radiuses, obj.charges, obj.materials);
                const chargePerSphereSurfaceArr = efields.chargePerSphereSurface(obj.radiuses, obj.charges, obj.materials);
                //console.log(chargePerSphereSurfaceArr);
                for (let i = 0; i < obj.radiuses.length; i++) {
                    const rad = obj.radiuses[i];
                    const chargeDensity = chargePerSphereSurfaceArr[i] / (4 * Math.PI * rad * rad);
                    computeMaterial.uniforms.chargedSpherePositions.value[chargedSphereIdx] = new THREE.Vector3(...obj.position);
                    computeMaterial.uniforms.chargedSphereRadius.value[chargedSphereIdx] = rad;
                    computeMaterial.uniforms.chargedSphereChargeDensity.value[chargedSphereIdx] = chargeDensity;
                    computeMaterial.uniforms.chargedSphereHollow.value[chargedSphereIdx] = 1;
                    chargedSphereIdx ++;
                }
            } else if (obj.type === 'concentricInfWires') {
                //console.log(obj.radiuses, obj.charges, obj.materials);
                const chargePerSphereSurfaceArr = efields.chargePerSphereSurface(obj.radiuses, obj.charges, obj.materials);
                for (let i = 0; i < obj.radiuses.length; i++) {
                    computeMaterial.uniforms.wirePositions.value[wireIdx] = new THREE.Vector3(...obj.position);
                    computeMaterial.uniforms.wireDirections.value[wireIdx] = new THREE.Vector3(...obj.direction).normalize();
                    computeMaterial.uniforms.wireChargeDensity.value[wireIdx] = chargePerSphereSurfaceArr[i];
                    computeMaterial.uniforms.wireRadius.value[wireIdx] = obj.radiuses[i];
                    wireIdx++;
                }
            } else if (obj.type === 'stackedPlanes') {
                const numPlanes = Array.isArray(obj.charge_densities) ? obj.charge_densities.length : 0;
                const spacing = obj.spacing || 1;
                const directionVec = new THREE.Vector3(...obj.direction).normalize();
                const centerOffset = (numPlanes - 1) * spacing / 2;
                for (let i = 0; i < numPlanes; i++) {
                    const planePos = new THREE.Vector3(...obj.position).clone().add(directionVec.clone().multiplyScalar((i * spacing) - centerOffset));
                    const chargeDensityForPlane = obj.charge_densities[i] || 0;
                    if (obj.infinite) {
                        computeMaterial.uniforms.planePositions.value[planeIdx] = planePos;
                        computeMaterial.uniforms.planeNormals.value[planeIdx] = directionVec;
                        computeMaterial.uniforms.planeChargeDensity.value[planeIdx] = chargeDensityForPlane;
                        planeIdx++;
                    } else {
                        computeMaterial.uniforms.finPlanePositions.value[finPlaneIdx] = planePos;
                        computeMaterial.uniforms.finPlaneNormals.value[finPlaneIdx] = directionVec;
                        computeMaterial.uniforms.finPlaneChargeDensity.value[finPlaneIdx] = chargeDensityForPlane;
                        computeMaterial.uniforms.finPlaneDimensions.value[finPlaneIdx] = new THREE.Vector2(...(obj.dimensions || [1,1]));
                        finPlaneIdx++;
                    }
                }
            }
        });

        computeMaterial.uniforms.chargeCount.value = chargeIdx;
        computeMaterial.uniforms.planeCount.value = planeIdx;
        computeMaterial.uniforms.finPlaneCount.value = finPlaneIdx;
        computeMaterial.uniforms.wireCount.value = wireIdx;
        computeMaterial.uniforms.finWireCount.value = finWireIdx;
        computeMaterial.uniforms.chargedSphereCount.value = chargedSphereIdx;

        computeMaterial.uniforms.uGridMin.value.copy(GRID_MIN);
        computeMaterial.uniforms.uGridMax.value.copy(GRID_MAX);
        computeMaterial.uniforms.uGridRes.value = RESOLUTION;

        const size3D = RESOLUTION;
        const data3D = new Float32Array(size3D * size3D * size3D * 4);

        const oldRT = gl.getRenderTarget();
        const buffer = new Float32Array(RESOLUTION * RESOLUTION * 4);

        for(let z = 0; z < size3D; z++) {
            computeMaterial.uniforms.sliceIndex.value = z;

            gl.setRenderTarget(computeRt);
            gl.clear();
            gl.render(computeScene, computeCam);
            gl.readRenderTargetPixels(computeRt, 0, 0, RESOLUTION, RESOLUTION, buffer);

            for(let y = 0; y < size3D; y++) {
                for(let x = 0; x < size3D; x++) {
                    const idx2D = (y * size3D + x) * 4;
                    const idx3D = z * size3D * size3D + y * size3D + x;
                    data3D[idx3D] = buffer[idx2D];
                }
            }
        }

        gl.setRenderTarget(oldRT);

        const texture3D = new THREE.Data3DTexture(data3D, size3D, size3D, size3D);
        texture3D.format = THREE.RedFormat;
        texture3D.type = THREE.FloatType;
        texture3D.minFilter = THREE.LinearFilter;
        texture3D.magFilter = THREE.LinearFilter;
        texture3D.unpackAlignment = 1;
        texture3D.needsUpdate = true;

        visualMaterial.uniforms.uPotentialVolume.value = texture3D;
        visualMaterial.uniforms.uGridMin.value.copy(GRID_MIN);
        visualMaterial.uniforms.uGridMax.value.copy(GRID_MAX);
        visualMaterial.uniforms.uGridRes.value = RESOLUTION;

        visualMaterial.needsUpdate = false;
    }, [objects, computeMaterial, computeCam, computeScene, computeRt, gl, visualMaterial]);

    useFrame(({ camera }) => {
        visualMaterial.uniforms.cameraPosition.value.copy(camera.position);
        visualMaterial.uniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
        visualMaterial.uniforms.projectionMatrixInverse.value.copy(camera.projectionMatrixInverse);

        //log function
        const x = targetValue;
        // bad practice change later to gloval constants
        const minVal = 0.5;
        const maxVal = 100;
        const logMin = Math.log10(minVal);
        const logMax = Math.log10(maxVal);
        const expTarg = Math.sign(x) * Math.pow(10, logMin + (logMax - logMin) * Math.abs(x)) - Math.sign(x) * minVal;

        visualMaterial.uniforms.targetVal.value = expTarg;
        visualMaterial.uniforms.transparency.value = transparency;
        visualMaterial.uniforms.useSlice.value = useSlice;
        let sliceFlip = slicePlaneFlip ? -1 : 1;
        if (slicePlane === 'xy') visualMaterial.uniforms.slicePlane.value.set(0,0,sliceFlip);
        else if (slicePlane === 'yz') visualMaterial.uniforms.slicePlane.value.set(sliceFlip,0,0);
        else if (slicePlane === 'xz') visualMaterial.uniforms.slicePlane.value.set(0,sliceFlip,0);
        visualMaterial.uniforms.slicePos.value = slicePos;
    });


    const geometry = useMemo(() => {
        const geom = new THREE.PlaneGeometry(2, 2);
        return geom;
    }, []);

    return <mesh geometry={geometry} material={visualMaterial} frustumCulled={false} renderOrder={999}/>;

}