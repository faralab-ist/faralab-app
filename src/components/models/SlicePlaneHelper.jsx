import * as THREE from 'three'

export default function SlicePlaneHelper({ slicePlane, slicePos }) {

  let rotation = [0, 0, 0];
  let position = [0, 0, 0];

  switch (slicePlane) {
    case "xy":
      rotation = [0, 0, 0];
      position = [0, 0, slicePos];
      break;

    case "yz":
      rotation = [0, Math.PI / 2, 0];
      position = [slicePos, 0, 0];
      break;

    case "xz":
      rotation = [Math.PI / 2, 0, 0];
      position = [0, slicePos, 0];
      break;
  }

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[20, 20,10,10]} />
      <meshBasicMaterial
        color="white"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        wireframe
      />
    </mesh>
  );
}
