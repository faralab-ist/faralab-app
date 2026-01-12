import React from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import { DIM_MIN, VAL_MIN, VAL_MAX, ERROR_MSG } from "./utils";

export default function ConcentricInfiniteWireControls({ 
  obj, 
  updateObject, 
  // Funções específicas (se existirem no pai)
  addLayer, 
  removeLastLayer, 
  setRadius,
  setMaterial,
  setDielectric,
  setCharge,
  setErrorMsg 
}) {
  const radiuses = Array.isArray(obj.radiuses) ? obj.radiuses : [];
  const materials = Array.isArray(obj.materials) ? obj.materials : [];
  const charges = Array.isArray(obj.charges) ? obj.charges : []; // Aqui representa densidade linear
  const dielectrics = Array.isArray(obj.dielectrics) ? obj.dielectrics : [];

  return (
    <>
      <div className="detail-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        <div className="detail-key" style={{ marginBottom: 4 }}>Layers (Inner to Outer)</div>
        
        {radiuses.map((r, i) => {
          // Validação de Raio
          const prev = i === 0 ? 0.0 : radiuses[i - 1];
          const epsilon = 0.01;
          const minRadius = Math.max(DIM_MIN, prev + epsilon);
          
          const isConductor = materials[i] === 'conductor';
          const chargeVal = charges[i] ?? 0;
          
          // Estilo de cor para carga (Azul/Vermelho)
          const chargeStyle = isConductor ? {
            backgroundColor: chargeVal < 0 ? 'rgba(255,0,0,0.2)' : chargeVal > 0 ? 'rgba(0,0,255,0.2)' : 'transparent',
            transition: 'background-color 0.3s'
          } : {};

          return (
            <div key={i} style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 6, 
              width: "100%", 
              padding: "8px", 
              background: "rgba(255,255,255,0.05)", 
              borderLeft: "2px solid rgba(255,255,255,0.2)",
              borderRadius: 4 
            }}>
              
              {/* === LINHA 1: Label + Raio === */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.75em", opacity: 0.5, width: 20 }}>#{i + 1}</span>
                <span style={{ fontSize: "0.8em", opacity: 0.8 }}>R:</span>
                <InlineDecimalInput
                  value={r}
                  min={ i === 0 ? DIM_MIN : radiuses[i - 1]}
                   max= {radiuses[i + 1]}
                  step={0.1}
                  style={{ flex: 1 }}
                  onChange={(val) => {
                     if (setRadius) setRadius(obj.id, i, val);
                     else {
                       const newRadiuses = [...radiuses];
                       newRadiuses[i] = val;
                       updateObject(obj.id, { radiuses: newRadiuses });
                     }
                  }}
                />
              </div>

              {/* === LINHA 2: Material + Propriedade === */}
              <div style={{ display: "flex", gap: 6 }}>
                
                {/* Select Material */}
                <select 
                   value={materials[i] || 'dielectric'} 
                   onChange={(e) => {
                      const val = e.target.value;
                      if (setMaterial) setMaterial(obj.id, i, val);
                      else {
                        const newMats = [...materials];
                        newMats[i] = val;
                        updateObject(obj.id, { materials: newMats });
                      }
                   }}
                   style={{ flex: 1, padding: "2px 4px", fontSize: 11, background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 3 }}
                 >
                   <option value="dielectric">Dielectric</option>
                   <option value="conductor">Conductor</option>
                 </select>

                {/* Input Variável (Lambda ou K) */}
                {isConductor ? (
                  <InlineDecimalInput
                    value={chargeVal}
                    min={VAL_MIN} max={VAL_MAX}
                    step={0.1}
                    style={{ flex: 1, ...chargeStyle }}
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
                    value={dielectrics[i] ?? 1.0}
                    min={1.0} 
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
              
              <div style={{ fontSize: 9, opacity: 0.4, textAlign: "right" }}>
                {isConductor ? `Linear Dens. (λ)` : `Dielectric (k)`}
              </div>

            </div>
          );
        })}
      </div>

      {/* === BOTÕES === */}
      <div className="detail-row">
        <div className="detail-value" style={{ display: "flex", gap: 8, width: "100%", marginTop: 4 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); addLayer ? addLayer(obj.id) : null; }} 
            className="action-btn"
            style={{ flex: 1, padding: "6px" }}
          >
            + Radius
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); removeLastLayer ? removeLastLayer(obj.id) : null; }} 
            className="action-btn"
            style={{ flex: 1, padding: "6px" }}
            disabled={radiuses.length === 0}
          >
            - Remove
          </button>
        </div>
      </div>
    </>
  );
}
