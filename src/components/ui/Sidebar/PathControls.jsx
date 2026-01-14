import React from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import { VAL_MIN, VAL_MAX, DIM_MIN, ERROR_MSG, DIM_MAX } from "./utils";

export default function PathControls({
  obj,
  addPoint,
  removeLastPoint,
  setPoint,
  updateObject,
  setErrorMsg
}) {
  const points = Array.isArray(obj.points) ? obj.points : [];

  // unified API: single current value (A)
  const current = Number.isFinite(obj.current) ? obj.current : 0.0;

  const onSetPoint = (idx, coordIdx, val) => {
    const newPoint = [...(points[idx] || [0,0,0]).map((v)=>v)];
    newPoint[coordIdx] = val;
    if (typeof setPoint === "function") {
      setPoint(obj.id, idx, newPoint);
    } else {
      const newPoints = points.slice();
      newPoints[idx] = newPoint;
      updateObject?.(obj.id, { points: newPoints });
    }
  };

  const onSetCurrent = (val) => {
    const v = Number.isFinite(val) ? val : 0.0;
    updateObject?.(obj.id, { current: v });
  };

  return (
    <>
      <div className="detail-row inline">
        <div className="detail-key">Current:</div>
        <div className="detail-value">
          <InlineDecimalInput
            value={current}
            step={0.01}
            inputStyle={{ minWidth: "4ch" }}
            onChange={(v) => onSetCurrent(v)}
            onError={setErrorMsg}
          />
          <span style={{ fontSize: 12, opacity: 0.7 }}>A</span>
        </div>
      </div>

      {obj.type === "path" && (
        <div className="detail-row inline">
          <div className="detail-key">Closed path</div>
          <div className="detail-value">
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!obj.isClosedPath}
                onChange={(e) => {
                  e.stopPropagation();
                  updateObject?.(obj.id, { isClosedPath: e.target.checked });
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </label>
          </div>
        </div>
      )}

      {obj.type === "path" && (
        <div className="detail-row" style={{ marginTop: 8 }}>
          <div className="detail-key">Path points</div>
          <div className="detail-value" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {points.map((pt, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 36, fontSize: 12, opacity: 0.8 }}>{idx + 1}</div>
                <InlineDecimalInput
                  value={(pt && pt[0]) ?? 0}
                  step={0.1}
                  onChange={(v) => onSetPoint(idx, 0, v)}
                />
                <InlineDecimalInput
                  value={(pt && pt[1]) ?? 0}
                  step={0.1}
                  onChange={(v) => onSetPoint(idx, 1, v)}
                />
                <InlineDecimalInput
                  value={(pt && pt[2]) ?? 0}
                  step={0.1}
                  onChange={(v) => onSetPoint(idx, 2, v)}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                onClick={(e) => { e.stopPropagation(); addPoint?.(obj.id); }}
                className="action-btn"
                style={{ flex: 1, padding: 6 }}
              >
                + Point
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeLastPoint?.(obj.id); }}
                className="action-btn"
                style={{ flex: 1, padding: 6 }}
                disabled={points.length === 0}
              >
                - Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
