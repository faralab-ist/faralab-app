import * as THREE from 'three';
import { useThree , useFrame} from '@react-three/fiber';
import { useMemo } from 'react';
import equipotentialShaderFragmentSource from '../../../shaders/equipotentialSurfaceFrag.glsl';
import { EPSILON_0, K_E } from '../../../utils/constants.js';

export default function EquipotentialSurface({ objects, targetValue = 5.0, transparency = 0.6 }) {
    const { camera } = useThree();

    const material = useMemo(() => {
        const MAX_CHARGES = 100;
        const MAX_INF_PLANES = 6;
        const MAX_INF_WIRES = 6;

        return new THREE.ShaderMaterial({
            uniforms: {
                cameraMatrixWorld : { value: new THREE.Matrix4() },
                projectionMatrixInverse : {value : new THREE.Matrix4()},
                chargeCount: { value: 0 },
                chargePos: { value: new Array(MAX_CHARGES).fill(new THREE.Vector3()) },
                chargeVal: { value: new Float32Array(MAX_CHARGES).fill(0) },
                planeCount: { value: 0 },
                planePositions: { value: new Array(MAX_INF_PLANES).fill(new THREE.Vector3()) },
                planeNormals: { value: new Array(MAX_INF_PLANES).fill(new THREE.Vector3()) },
                planeChargeDensity: { value: new Float32Array(MAX_INF_PLANES).fill(0) },
                wireCount: { value: 0 },
                wirePositions: { value: new Array(MAX_INF_WIRES).fill(new THREE.Vector3()) },
                wireDirections: { value: new Array(MAX_INF_WIRES).fill(new THREE.Vector3()) },
                wireChargeDensity: { value: new Float32Array(MAX_INF_WIRES).fill(0) },
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
        let wireIdx = 0;

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
            }
        });

        material.uniforms.chargeCount.value = chargeIdx;
        material.uniforms.planeCount.value = planeIdx;
        material.uniforms.wireCount.value = wireIdx;
        material.uniforms.targetVal.value = targetValue;
        material.uniforms.transparency.value = transparency;
    });

    const geometry = useMemo(() => {
        const geom = new THREE.PlaneGeometry(2, 2);
        return geom;
    }, []);

    return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={999}/>;
}