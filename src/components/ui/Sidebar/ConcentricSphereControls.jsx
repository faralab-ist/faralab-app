import React from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import { VAL_MIN, VAL_MAX, DIM_MIN, ERROR_MSG, DIM_MAX } from "./utils";

export default function ConcentricSphereControls({ 
  obj, 
  updateObject, 
  // Recebe as funções específicas que vêm do Sidebar
  addLayer, 
  removeLastLayer, 
  setMaterial,
  setDielectric,
  setCharge,
  setRadius,
  setErrorMsg 
}) {
  // Garante que são arrays (fallback para valores simples se converteres de outro objeto)
  const radiuses = obj.radiuses || [obj.radius || 1];
  const materials = obj.materials || ['conductor'];
  const charges = obj.charges || [0];
  const dielectrics = obj.dielectrics || [1];

  return (
    <>
      <div className="detail-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        <div className="detail-key" style={{ marginBottom: 4 }}>Layers (Inner to Outer)</div>
        
        {radiuses.map((rad, i) => {
          const isConductor = materials[i] === 'conductor';
          
          return (
            <div key={i} style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 4, 
              width: "100%", 
              padding: "8px", 
              background: "rgba(255,255,255,0.05)", 
              borderRadius: 4 
            }}>
              {/* Linha 1: Label e Raio */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8em", opacity: 0.7, width: 20 }}>#{i + 1}</span>
                <span style={{ fontSize: "0.8em", opacity: 0.7 }}>R:</span>
                <InlineDecimalInput
                  value={rad}
                  min={ i === 0 ? DIM_MIN : radiuses[i - 1]}
                  max={ radiuses[i + 1]}
                  step={0.1}
                  style={{ flex: 1 }}
                  onChange={(val) => {
                     if (setRadius && rad >= radiuses[i-1] && rad <= radiuses[i+1]) setRadius(obj.id, i, val);
                     else {
                       const newRadiuses = [...radiuses];
                       newRadiuses[i] = val;
                       updateObject(obj.id, { radiuses: newRadiuses });
                     }
                  }}
                />
              </div>

              {/* Linha 2: Material Select */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                 <select 
                   value={materials[i]} 
                   onChange={(e) => {
                      const val = e.target.value;
                      if (setMaterial) setMaterial(obj.id, i, val);
                      else {
                        const newMats = [...materials];
                        newMats[i] = val;
                        updateObject(obj.id, { materials: newMats });
                      }
                   }}
                   style={{ width: "100%", padding: 2, fontSize: 11, background: "#222", color: "#fff", border: "1px solid #444" }}
                 >
                   <option value="conductor">Conductor</option>
                   <option value="dielectric">Dielectric</option>
                 </select>
              </div>

              {/* Linha 3: Carga ou Dielectric Constant */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8em", opacity: 0.7 }}>
                  {isConductor ? "Q (C):" : "k:"}
                </span>
                
                {isConductor ? (
                  <InlineDecimalInput
                    value={charges[i]}
                    min={VAL_MIN} max={VAL_MAX}
                    step={0.1}
                    style={{ flex: 1 }}
                    onChange={(val) => {
                      if (setCharge) setCharge(obj.id, i, val);
                      else {
                        const newCharges = [...charges];
                        newCharges[i] = val;
                        updateObject(obj.id, { charges: newCharges });
                      }
                    }}
                    onError={setErrorMsg}
                  />
                ) : (
                  <InlineDecimalInput
                    value={dielectrics[i]}
                    min={1} 
                    step={0.1}
                    style={{ flex: 1 }}
                    onChange={(val) => {
                      if (setDielectric) setDielectric(obj.id, i, val);
                      else {
                        const newDielectrics = [...dielectrics];
                        newDielectrics[i] = val;
                        updateObject(obj.id, { dielectrics: newDielectrics });
                      }
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botões Adicionar/Remover */}
      <div className="detail-row">
        <div className="detail-value" style={{ display: "flex", gap: 8, width: "100%" }}>
          <button 
            onClick={(e) => { e.stopPropagation(); addLayer ? addLayer(obj.id) : null; }} 
            className="action-btn"
            style={{ flex: 1, padding: "6px" }}
          >
            + Layer
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); removeLastLayer ? removeLastLayer(obj.id) : null; }} 
            className="action-btn"
            style={{ flex: 1, padding: "6px" }}
            disabled={radiuses.length <= 1}
          >
            - Remove
          </button>
        </div>
      </div>
    </>
  );
}
