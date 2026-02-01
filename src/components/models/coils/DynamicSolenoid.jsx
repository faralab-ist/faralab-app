import React, { useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import BaseCoil from './BaseCoil'
import { useFrame } from '@react-three/fiber'
import { calculateMagFluxThroughCircularLoop } from '../../../physics/magFieldCpu'
import { MU_0_REAL } from '../../../physics/constants'

// just a big solenoid

export default function DynamicSolenoid({
    objects,
    id,
    name,
    position = [0, 0, 0],
    selectedId,
    setSelectedId,
    setIsDragging,
    updatePosition,
    updateDirection,
    updateObject,
    creativeMode,
    isHovered,

    radius = 1.5,
    length = 4,
    pointsPerTurn = 10,

    turns = 10,
    // unified API: only current
    current = 1,
    ac = false,

    // visual thickness of the wire (used for geometry + hitbox)
    wireThickness = 0.05,

    direction = [0, 0, 1],
    rotation = [0, 0, 0],
    quaternion,

    charges = [],
    showLabel = true,
    onHideLabel,
    segments = 500,

    // new values
    peakVoltage = 10,
    frequency = 0.05,
    resistance = 5
}) {
    const radialSamples = 10;
    const angularSamples = 10;

    const computeSolenoidNormal = useCallback(() => {
        // Local normal is +Z (for solenoid along Z axis)
        return [0, 0, 1]
    }, [])

    const getSolenoidPoints = useCallback(() => {
        const points = []

        const turns2 = turns * Math.PI * 2
        const totalPoints = turns * pointsPerTurn * 1
        //console.log('totalPoints', totalPoints)
        for (let i = 0; i < totalPoints; i++) {
            const t = i / (totalPoints - 1)
            const theta = t * turns2

            const y = t * length - length / 2

            const p = new THREE.Vector3(
                Math.cos(theta) * radius,
                y,
                Math.sin(theta) * radius
            )

            points.push([p.x, p.z, p.y])
        }

        return points
    }, [radius, length, pointsPerTurn, turns])

    // Thin hitbox following the wire path so interior stays clickable
    const hitboxCurve = useMemo(() => {
        const pts = getSolenoidPoints()
        const vecs = pts.map(([x, z, y]) => new THREE.Vector3(x, y, z))
        const curve = new THREE.CatmullRomCurve3(vecs, false)
        curve.tension = 0.5
        return curve
    }, [getSolenoidPoints])

    //console.log(getSolenoidPoints())

    const selfInductance = useMemo(() => {
        const N = turns;
        const A = Math.PI * radius ** 2;
        const l = length;
        return (MU_0_REAL * N * N * A) / l;
    }, [turns, radius, length]);


    const prevCurrentRef = useRef(0);
    const prevFluxRef = useRef(0);
    const prevTimeRef = useRef(0);
    const lastSampleRef = useRef(0);
    const sampleInterval = 0.05;

    useFrame((state) => {
        const now = state.clock.getElapsedTime();

        if (now - lastSampleRef.current > sampleInterval) {
            lastSampleRef.current = now;

            const w = 2 * Math.PI * frequency;
            const phase = 0;
            const appliedVoltage = peakVoltage * Math.sin(w * now + phase);

            // Calculate flux by breaking solenoid into individual loops and summing
            var flux;
            for (let t = 0; t < turns; t++) { 
                const loopCenterY = -length / 2 + (t + 0.5) * (length / turns);
                const loopPosition = [position[0], position[1] + loopCenterY, position[2]];
                const loopDirection = direction;
                const loopFlux = calculateMagFluxThroughCircularLoop(
                    loopPosition,
                    loopDirection,
                    radius,
                    radialSamples,
                    angularSamples,
                    objects,
                );
                flux = (flux || 0) + loopFlux;
            }

            const prevCurr = prevCurrentRef.current;
            const prevT = prevTimeRef.current;
            const prevFlux = prevFluxRef.current;

            const dt = Math.max(1e-6, now - prevT);

            const currentEmf = - (flux - prevFlux) / dt;

            const netCurrent = (selfInductance/dt * prevCurr + appliedVoltage + currentEmf) / (resistance + selfInductance/dt);

            prevCurrentRef.current = netCurrent;
            prevFluxRef.current = flux;
            prevTimeRef.current = now;

            updateObject(id, {current: netCurrent });
        }
    });

    return (
        <BaseCoil
            segments={segments}
            id={id}
            name={name}
            position={position}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            setIsDragging={setIsDragging}
            updatePosition={updatePosition}
            updateDirection={updateDirection}
            updateObject={updateObject}
            creativeMode={creativeMode}
            isHovered={isHovered}
            coilRadius={radius}
            direction={direction}
            rotation={rotation}
            quaternion={quaternion}
            // unified: pass current (preserve previous multiplier -> current mapping if desired)
            current={current}
            renderCharges={true}
            charges={charges}
            glowMultiplier={0.6}
            isClosedPath={false}
            computeNormal={computeSolenoidNormal}
            getPathPoints={getSolenoidPoints}
            showLabel={showLabel}
            onHideLabel={onHideLabel}
            ac={ac}
            coilGeometry={
                null
            }
            hitboxGeometry={
                <tubeGeometry args={[hitboxCurve, 64, 0.05, 16, false]} />
            }
        />
    )
}