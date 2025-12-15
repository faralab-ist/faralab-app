import React from "react";
import NumberInput from "./NumberInput";
import { DIM_MIN, DIM_MAX } from "./utils";

// Componente auxiliar definido FORA para evitar re-criação e perda de foco
const DimInput = ({ value, onChange }) => (
  <NumberInput 
    value={value} 
    onChange={onChange} 
    min={DIM_MIN} 
    max={DIM_MAX}
    style={{ width: 72 }} 
    
  />
);

export default function DimensionControls({ obj, updateObject }) {
  if (obj.type === 'charge' || obj.type === 'testPointCharge') return null;

  const update = (field, val) => updateObject(obj.id, { [field]: val });
  // Plane
  if (obj.type === 'plane' || obj.type === 'stackedPlanes') {
    if (obj.infinite) return null;
    return (
      <div className="detail-row">
        <div className="detail-key">Dimensions (W x H)</div>
        <div className="detail-value" style={{ display: "flex", gap: 6 }}>
          <DimInput value={obj.planeWidth ?? obj.width ?? 5} onChange={(v) => update("planeWidth", v)} />
          <DimInput value={obj.planeHeight ?? obj.height ?? 5} onChange={(v) => update("planeHeight", v)} />
        </div>
      </div>
    );
  }

  // Wire
  if (obj.type === 'wire' ) {
    if (obj.infinite) return null;
    return (
      <div className="detail-row">
        <div className="detail-key">Length</div>
        <div className="detail-value">
          <DimInput value={obj.height ?? 5} onChange={(v) => update("height", v)} />
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
    <div className="detail-row">
      <div className="detail-key">Dimensions</div>
      <div className="detail-value" style={{ display: "flex", gap: 6 }}>
        {inputs}
      </div>
    </div>
  );
}