import { useMemo } from 'react';
import * as THREE from 'three';

export default function Arrow({ position, direction, length, color = 0xffff00 }) {
  const arrowHelper = useMemo(() => {
    return new THREE.ArrowHelper(
      direction.clone().normalize(),
      position.clone(),
      length,
      color
    );
  }, [position, direction, length, color]);

  return <primitive object={arrowHelper} />;
}