import React from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import { VAL_MIN, VAL_MAX, ERROR_MSG } from "./utils";

export default function StackedPlaneControls({ 
  obj, 
  updateObject, 
  setSpacing, 
  setChargeDensity,
  addPlane, 
  removeLastPlane,
  setErrorMsg 
}) {
  // Garante que é sempre um array
  const densities = Array.isArray(obj.charge_densities) 
    ? obj.charge_densities 
    : [obj.charge_density ?? 0];

  return (
    <>
      {/* 1. Spacing + Infinite */}
      <div
        className="detail-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
      >
        <div>
          <div className="detail-key">Spacing</div>
          <div className="detail-value">
            <InlineDecimalInput
              value={obj.spacing ?? 1.0}
              min={0.01}
              step={0.1}
              onChange={(val) => {
                if (setSpacing) setSpacing(obj.id, val);
                else updateObject(obj.id, { spacing: val });
              }}
            />
          </div>
        </div>
        <div>
          <div className="detail-key">Infinite</div>
          <div className="detail-value">
            <label
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center"
              }}
            >
              <input
                type="checkbox"
                checked={obj.infinite || false}
                onChange={(e) =>
                  updateObject(obj.id, { infinite: e.target.checked })
                }
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2. Lista de Planos (Densidades) */}
      <div className="detail-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        <div className="detail-key" style={{ marginBottom: 4 }}>Planes (Charge Density σ)</div>
        
        {densities.map((density, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <span style={{ fontSize: "0.8em", opacity: 0.7, width: 20 }}>{index + 1}</span>
            <InlineDecimalInput
              value={density}
              min={VAL_MIN} max={VAL_MAX}
              step={0.1}
              style={{ flex: 1 }}
              onChange={(val) => {
                if (setChargeDensity) setChargeDensity(obj.id, index, val);
                else {
                  // Fallback se a função não existir
                  const newDensities = [...densities];
                  newDensities[index] = val;
                  updateObject(obj.id, { charge_densities: newDensities });
                }
              }}
              onError={setErrorMsg}
              errorMsg={ERROR_MSG}
            />
          </div>
        ))}
      </div>

      {/* 3. Botões Adicionar/Remover */}
      <div className="detail-row">
        <div className="detail-value" style={{ display: "flex", gap: 8, width: "100%" }}>
          <button 
            onClick={(e) => { e.stopPropagation(); addPlane?.(obj.id); }} 
            className="action-btn"
            style={{ flex: 1, padding: "6px" }}
          >
            + Add Plane
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); removeLastPlane?.(obj.id); }} 
            className="action-btn"
            style={{ flex: 1, padding: "6px" }}
            disabled={densities.length <= 1}
          >
            - Remove
          </button>
        </div>
      </div>
    </>
  );
}
