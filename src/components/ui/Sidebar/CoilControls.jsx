import React from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import { DIM_MIN, DIM_MAX } from "./utils";

/**
 * CoilControls - Configuration UI for coils (ring or polygon)
 * 
 * Renders:
 * - Ring coils: radius input
 * - Polygon coils: number of sides input
 */
export default function CoilControls({
  obj,
  changeRadius,
  changeSides,
  updateObject,
  setErrorMsg
}) {
  const isRing = obj.subtype === 'ringCoil' || obj.coilType === 'ring';
  const isPolygon = obj.subtype === 'polygonCoil' || obj.coilType === 'polygon';
  
  const radius = Number.isFinite(obj.coilRadius) ? obj.coilRadius : 1.5;
  const sides = Number.isFinite(obj.sides) ? obj.sides : 6;

  const onSetRadius = (val) => {
    if (typeof changeRadius === "function") {
      changeRadius(obj.id, val);
    } else {
      updateObject?.(obj.id, { coilRadius: val });
    }
  };

  const onSetSides = (val) => {
    const n = Math.max(3, Math.floor(val)); // Minimum 3 sides
    if (typeof changeSides === "function") {
      changeSides(obj.id, n);
    } else {
      updateObject?.(obj.id, { sides: n });
    }
  };

  return (
    <>
      {/* Ring Coil: Radius */}
      {isRing && (
        <div className="detail-row">
          <div className="detail-key">Coil Radius</div>
          <div className="detail-value">
            <InlineDecimalInput
              value={radius}
              min={DIM_MIN}
              max={DIM_MAX}
              step={0.1}
              onChange={onSetRadius}
              onError={setErrorMsg}
              inputStyle={{ width: 120 }}
            />
          </div>
        </div>
      )}

      {/* Polygon Coil: Number of Sides */}
      {isPolygon && (
        <div className="detail-row">
          <div className="detail-key">Number of Sides</div>
          <div className="detail-value">
            <InlineDecimalInput
              value={sides}
              min={3}
              max={12}
              step={1}
              onChange={onSetSides}
              onError={setErrorMsg}
              inputStyle={{ width: 120 }}
            />
          </div>
        </div>
      )}
    </>
  );
}
