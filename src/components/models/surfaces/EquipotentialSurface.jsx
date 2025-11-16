import * as THREE from 'three';
import { useThree , useFrame} from '@react-three/fiber';
import { useMemo } from 'react';
import equipotentialShaderFragmentSource from '../../../shaders/equipotentialSurfaceFrag.glsl';
import { EPSILON_0, K_E } from '../../../utils/constants.js';

export default function EquipotentialSurface({ objects, targetValue = 5.0, transparency = 0.6, slicePlane, slicePos, useSlice, slicePlaneFlip}) {
    const { camera } = useThree();

    const material = useMemo(() => {
        const MAX_CHARGES = 100;
        const MAX_INF_PLANES = 6;
        const MAX_INF_WIRES = 6;
        const MAX_FIN_PLANES = 6;
        const MAX_FIN_WIRES = 6;
        const MAX_CHARGED_SPHERES = 15;

        return new THREE.ShaderMaterial({
            uniforms: {
                useSlice: { value: false },
                slicePlane: { value: new THREE.Vector3(1, 0, 0) },
                slicePos: { value: 0.0 },
                cameraMatrixWorld : { value: new THREE.Matrix4() },
                projectionMatrixInverse : {value : new THREE.Matrix4()},
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
                chargedSphereCount: {value: 0},
                chargedSpherePositions: { value: new Array(MAX_CHARGED_SPHERES).fill(new THREE.Vector3()) },
                chargedSphereRadius: { value: new Float32Array(MAX_CHARGED_SPHERES).fill(0) },
                chargedSphereChargeDensity: { value: new Float32Array(MAX_CHARGED_SPHERES).fill(0) },
                chargedSphereHollow: {value: new Int32Array(MAX_CHARGED_SPHERES).fill(0)},
                targetVal: { value: 0.0 },
                transparency: { value: 0.6},
                epsilon_0 : { value: EPSILON_0 },
                k_e : { value: K_E },
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
    }, []);

    useFrame(() => {
        material.uniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
        material.uniforms.projectionMatrixInverse.value.copy(camera.projectionMatrixInverse);

        let chargeIdx = 0;
        let planeIdx = 0;
        let finPlaneIdx = 0;
        let wireIdx = 0;
        let finWireIdx = 0;
        let chargedSphereIdx = 0;

        objects.forEach((obj) => {
            if (obj.type === 'charge') {
                material.uniforms.chargePos.value[chargeIdx] = new THREE.Vector3(...obj.position);
                material.uniforms.chargeVal.value[chargeIdx] = obj.charge;
                chargeIdx++;
            } else if (obj.type === 'plane' && obj.infinite) {
                material.uniforms.planePositions.value[planeIdx] = new THREE.Vector3(...obj.position);
                material.uniforms.planeNormals.value[planeIdx] = new THREE.Vector3(...obj.direction).normalize();
                material.uniforms.planeChargeDensity.value[planeIdx] = obj.charge_density;
                planeIdx++;
            } else if (obj.type === 'wire' && obj.infinite) {
                material.uniforms.wirePositions.value[wireIdx] = new THREE.Vector3(...obj.position);
                material.uniforms.wireDirections.value[wireIdx] = new THREE.Vector3(...obj.direction).normalize();
                material.uniforms.wireChargeDensity.value[wireIdx] = obj.charge_density;
                wireIdx++;
            } else if (obj.type === 'plane' && !obj.infinite) {
                material.uniforms.finPlanePositions.value[finPlaneIdx] = new THREE.Vector3(...obj.position);
                material.uniforms.finPlaneNormals.value[finPlaneIdx] = new THREE.Vector3(...obj.direction).normalize();
                material.uniforms.finPlaneChargeDensity.value[finPlaneIdx] = obj.charge_density;
                material.uniforms.finPlaneDimensions.value[finPlaneIdx] = new THREE.Vector2(...obj.dimensions);
                finPlaneIdx++;
            } else if (obj.type === 'wire' && !obj.infinite) {
                material.uniforms.finWirePositions.value[finWireIdx] = new THREE.Vector3(...obj.position);
                material.uniforms.finWireDirections.value[finWireIdx] = new THREE.Vector3(...obj.direction).normalize();
                material.uniforms.finWireChargeDensity.value[finWireIdx] = obj.charge_density;
                material.uniforms.finWireHeights.value[finWireIdx] = obj.height;
                finWireIdx++;
            } else if (obj.type === 'chargedSphere'){
                material.uniforms.chargedSpherePositions.value[chargedSphereIdx] = new THREE.Vector3(...obj.position);
                material.uniforms.chargedSphereRadius.value[chargedSphereIdx] = obj.radius;
                material.uniforms.chargedSphereChargeDensity.value[chargedSphereIdx] = obj.charge_density;
                material.uniforms.chargedSphereHollow.value[chargedSphereIdx] = obj.isHollow ? 1 : 0;
                chargedSphereIdx ++;
            }
        });

        material.uniforms.chargeCount.value = chargeIdx;
        material.uniforms.planeCount.value = planeIdx;
        material.uniforms.finPlaneCount.value = finPlaneIdx;
        material.uniforms.wireCount.value = wireIdx;
        material.uniforms.finWireCount.value = finWireIdx;
        material.uniforms.chargedSphereCount.value = chargedSphereIdx;
        material.uniforms.targetVal.value = targetValue;
        material.uniforms.transparency.value = transparency;
        material.uniforms.useSlice.value = useSlice;
        let sliceFlip = 1;
        if (slicePlaneFlip) sliceFlip = -1;
        if (slicePlane === 'xy') material.uniforms.slicePlane.value.set(0,0,sliceFlip);
        else if (slicePlane === 'yz') material.uniforms.slicePlane.value.set(sliceFlip,0,0);
        else if (slicePlane === 'xz') material.uniforms.slicePlane.value.set(0,sliceFlip,0);
        material.uniforms.slicePos.value = slicePos;
    });

    const geometry = useMemo(() => {
        const geom = new THREE.PlaneGeometry(2, 2);
        return geom;
    }, []);

    return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={999}/>;
}