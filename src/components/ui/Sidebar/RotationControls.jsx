import React, { useState, useEffect } from "react";
import * as THREE from "three";
import { InlineDecimalInput } from "../io/decimalInput";

const ANGLE_MIN = -360;
const ANGLE_MAX = 360;

  const clampAngle= (n) =>  Math.min(360, n%360);


export default function RotationControls({ obj, updateObject }) {
  if (!Array.isArray(obj?.rotation) || obj.rotation.length !== 3) return null;
 // if (obj.type === "concentricInfWires") return null;

  const fromRadToDeg = (r) => (Number(r ?? 0) * 180) / Math.PI;

  const initialDegs = obj.rotation.map(fromRadToDeg);
  const [localDegs, setLocalDegs] = useState(initialDegs);

  useEffect(() => {
    // sync when external rotation changes (selection change or external update)
    setLocalDegs(obj.rotation.map(fromRadToDeg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj?.id, obj?.rotation?.[0], obj?.rotation?.[1], obj?.rotation?.[2]]);

  const commitRotation = (idx, deg) => {
    const clamped = clampAngle(deg);
    const rad = (clamped * Math.PI) / 180;
    const base = Array.isArray(obj.rotation) ? [...obj.rotation] : [0, 0, 0];
    base[idx] = rad;
    const e = new THREE.Euler(base[0], base[1], base[2], "XYZ");
    const q = new THREE.Quaternion().setFromEuler(e);

    updateObject?.(obj.id, {
      rotation: base,
      quaternion: [q.x, q.y, q.z, q.w],
    });
  };

  // live change: update local display and commit clamped value immediately
  const handleLiveChange = (idx, n) => {
    // show user's raw input while typing (InlineDecimalInput already passes parsed number)
    setLocalDegs((prev) => {
      const next = [...prev];
      next[idx] = Number.isFinite(Number(n)) ? Number(n) : 0;
      return next;
    });
    // commit clamped number so underlying model stays valid
    commitRotation(idx, n);
  };

  // on blur: ensure displayed value is clamped and formatted
  const handleCommit = (idx, n) => {
    const c = clampAngle(n);
    setLocalDegs((prev) => {
      const next = [...prev];
      next[idx] = c;
      return next;
    });
    commitRotation(idx, c);
  };

  return (
    <div className="detail-row">
      <div className="detail-key">Rotation (deg)</div>
      <div className="detail-value" style={{ display: "flex", gap: 18 }}>
        {["θx", "θy", "θz"].map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              {label}
            </div>
            <span style={{ opacity: 0.7 }}>=</span>
            <InlineDecimalInput
              value={Number((localDegs[i] ?? 0).toFixed(2))}
              // do not pass min/max so InlineDecimalInput always forwards input
              step={1}
              decimals={2}
              onChange={(n) => handleLiveChange(i, n)}
              onCommit={(n) => handleCommit(i, n)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
