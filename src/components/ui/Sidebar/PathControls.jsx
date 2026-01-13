import React from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import { VAL_MIN, VAL_MAX, DIM_MIN, ERROR_MSG, DIM_MAX } from "./utils";

export default function PathControls({
  obj,
  addPoint,
  removeLastPoint,
  setPoint,
  changePathChargeCount,
  changePathCharge,
  changePathVelocity,
  showChargeRow = true,
  chargeRowRight,
  updateObject,
  setErrorMsg
}) {
  const points = Array.isArray(obj.points) ? obj.points : [];
  const charges = Array.isArray(obj.charges) ? obj.charges : [];
  const chargeCount = Number.isFinite(obj.chargeCount) ? obj.chargeCount : charges.length;
  // velocity is a single float
  const velocity = Number.isFinite(obj.velocity) ? obj.velocity : 0.0;
  // single global charge value (not per-point)
  const globalCharge = Number.isFinite(obj.charge) ? obj.charge : 0.0;

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

  // set global charge
  const onSetCharge = (val) => {
    if (typeof changePathCharge === "function") {
      changePathCharge(obj.id, val);
    } else {
      updateObject?.(obj.id, { charge: val });
    }
  };

  const onSetVelocity = (val) => {
    const v = Number.isFinite(val) ? val : 0.0;
    if (typeof changePathVelocity === "function") {
      changePathVelocity(obj.id, v);
    } else {
      updateObject?.(obj.id, { velocity: v });
    }
  };

  const onSetChargeCount = (val) => {
    const n = Math.max(0, Math.floor(val));
    if (typeof changePathChargeCount === "function") {
      changePathChargeCount(obj.id, n);
    } else {
      updateObject?.(obj.id, { chargeCount: n });
    }
  };

  return (
    <>
      <div
        className="detail-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
      >
        <div>
          <div className="detail-key">Velocity </div>
          <div className="detail-value">
            <InlineDecimalInput
              value={velocity}
              step={0.01}
              onChange={(v) => onSetVelocity(v)}
            />
            <span style={{ fontSize: 12, opacity: 0.7 }}>m/s</span>
          </div>
        </div>

        <div>
          <div className="detail-key">Charge density</div>
          <div className="detail-value">
            <InlineDecimalInput
              value={chargeCount}
              min={0}
              step={1}
              onChange={(v) => onSetChargeCount(v)}
            />
          </div>
        </div>
      </div>

      {showChargeRow && (
        obj.type === "path" ? (
          <div
            className="detail-row"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <div className="detail-key">Charge (global)</div>
              <div className="detail-value">
                <InlineDecimalInput
                  value={globalCharge}
                  step={0.1}
                  onChange={(v) => onSetCharge(v)}
                  onError={setErrorMsg}
                />
                <span style={{ fontSize: 12, opacity: 0.7 }}>C</span>
              </div>
            </div>

            <div>
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
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Loop</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          chargeRowRight ? (
            <div
              className="detail-row"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
            >
              <div>
                <div className="detail-key">Charge (global)</div>
                <div className="detail-value">
                  <InlineDecimalInput
                    value={globalCharge}
                    step={0.1}
                    onChange={(v) => onSetCharge(v)}
                    onError={setErrorMsg}
                  />
                  <span style={{ fontSize: 12, opacity: 0.7 }}>C</span>
                </div>
              </div>
              {chargeRowRight}
            </div>
          ) : (
            <div className="detail-row">
              <div className="detail-key">Charge (global)</div>
              <div className="detail-value">
                <InlineDecimalInput
                  value={globalCharge}
                  step={0.1}
                  onChange={(v) => onSetCharge(v)}
                  onError={setErrorMsg}
                />
                <span style={{ fontSize: 12, opacity: 0.7 }}>C</span>
              </div>
            </div>
          )
        )
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
