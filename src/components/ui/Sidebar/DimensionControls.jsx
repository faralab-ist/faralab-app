import React from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import { DIM_MIN, DIM_MAX, ERROR_MSG} from "./utils";

// Componente auxiliar definido FORA para evitar re-criação e perda de foco
const DimInput = ({ value, onChange }) => (
  <InlineDecimalInput 
    value={value} 
    onChange={onChange} 
    min={DIM_MIN} 
    max={DIM_MAX}
    step={0.1}
  />
);

export default function DimensionControls({ obj, updateObject, setErrorMsg, clampWithError }) {
  if (obj.type === 'charge' || obj.type === 'testPointCharge') return null;

  const update = (field, val) => updateObject(obj.id, { [field]: val });

  if (obj.type === 'coil') return null;
  if (obj.type === 'barMagnet') return null;
  if (obj.type === 'faradayCoil') return null;
  if (obj.type === 'testCoil') return null;

  // Plane
  if (obj.type === 'plane' || obj.type === 'stackedPlanes') {
    if (obj.infinite) return null;
    return (
      <div className="detail-row inline">
        <div className="detail-key">Dimensions: </div>
        <div className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", marginLeft: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>W</span>
            <span style={{ opacity: 0.7 }}>:</span>
            <DimInput value={obj.dimensions[0]} onChange={(v) => update("dimensions", [v, obj.dimensions[1]])} />
          </div>
          <span style={{ opacity: 0.6, marginLeft: -4, marginRight: 5 }}>,</span>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>H</span>
            <span style={{ opacity: 0.7 }}>:</span>
            <DimInput value={obj.dimensions[1]} onChange={(v) => update("dimensions", [obj.dimensions[0], v])} />
          </div>
        </div>
      </div>
    );
  }

  // Wire
  if (obj.type === 'wire' ) {
    return (
      <div className="detail-row inline">
        <div className="detail-key">Infinite</div>
        <div className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={obj.infinite || false}
              onChange={(e) => updateObject(obj.id, { infinite: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
            />
          </label>
          {!obj.infinite && (
            <>
              <span style={{ opacity: 0.35, marginLeft: 12 }}>|</span>
              <span className="detail-key">Length: </span>
              <DimInput 
                value={obj.height ?? 5}
                onChange={(v) => {
                  const safe = clampWithError(v, DIM_MIN, DIM_MAX);
                  update("height", safe);
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // Sólidos Genéricos (Loop dinâmico)
  const fields = ['radius', 'width', 'height', 'depth'];
  const inputs = fields
    .filter(key => typeof obj[key] === 'number')
    .map(key => (
      <DimInput key={key} value={obj[key]} onChange={(v) => update(key, v)} />
    ));

  if (inputs.length === 0) return null;

  return (
    <div className="detail-row inline">
      <div className="detail-key">Radius: </div>
      <div className="detail-value" style={{ display: "inline-flex", gap: 6 }}>
        {inputs}
      </div>
    </div>
  );
}
