import React, { useState } from "react";
import NumberInput from "./NumberInput";
import DimensionControls from "./DimensionControls";
import { TYPE_CONFIG, POS_MIN, POS_MAX, VAL_MIN, VAL_MAX, ERROR_MSG } from "./utils";

export default function ObjectItem({ 
  obj, 
  expanded, 
  hovered, 
  toggleExpand, 
  setHoveredId, 
  updateObject, 
  removeObject 
}) {
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Resolver Ícone e Subtipo
  let iconData = { icon: null, alt: "", subtype: obj.type };
  
  if (obj.type === 'surface') {
    const resolved = TYPE_CONFIG.surface.resolve(obj);
    iconData = { ...resolved };
  } else if (TYPE_CONFIG[obj.type]) {
    const conf = TYPE_CONFIG[obj.type];
    iconData = {
      icon: typeof conf.icon === 'function' ? conf.icon(obj) : conf.icon,
      alt: typeof conf.alt === 'function' ? conf.alt(obj) : conf.alt,
      subtype: obj.type
    };
  }

  return (
    <li className="object-row-wrapper" data-objid={obj.id}>
      {/* Cabeçalho da Linha */}
      <div
        className={`object-row ${hovered ? 'hovered' : ''} ${expanded ? 'selected' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => toggleExpand(obj.id)}
        onMouseEnter={() => setHoveredId?.(obj.id)}
        onMouseLeave={() => setHoveredId?.(null)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleExpand(obj.id)}
      >
        <span className={`pill ${iconData.subtype}`}>
          {iconData.icon && <img src={iconData.icon} alt={iconData.alt} />}
        </span>
        <span className="name">{obj.name || obj.id}</span>
        <div className="expand-btn">{expanded ? "▾" : "▸"}</div>
      </div>

      {/* Detalhes Expansíveis */}
      {expanded && (
        <div className="object-details">
          <div className="details-grid">
            
            {/* Posição (X, Y, Z) */}
            {Array.isArray(obj.position) && (
              <div className="detail-row">
                <div className="detail-key">Position</div>
                <div className="detail-value" style={{ display: "flex", gap: 6 }}>
                  {[0, 1, 2].map((idx) => (
                    <NumberInput
                      key={idx}
                      value={obj.position[idx]}
                      min={POS_MIN} max={POS_MAX}
                      style={{ width: 72 }}
                      onChange={(val) => {
                        const newPos = [...obj.position];
                        newPos[idx] = val;
                        updateObject(obj.id, { position: newPos });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Dimensões */}
            <DimensionControls obj={obj} updateObject={updateObject} />

            {/* Charge (Carga Pontual) */}
            {obj.type === 'charge' && (
              <div className="detail-row">
                <div className="detail-key">Intensity C</div>
                <div className="detail-value">
                   <NumberInput
                      value={obj.charge}
                      min={VAL_MIN} max={VAL_MAX} step={0.25}
                      style={{ width: 140 }}
                      onChange={(v) => updateObject(obj.id, { charge: v })}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                   />
                </div>
              </div>
            )}

            {/* Densidades e Infinite (Plane/Wire) */}
            {(obj.type === 'plane' || obj.type === 'wire') && (
              <>
                <div className="detail-row">
                  <div className="detail-key">
                    {obj.type === 'plane' ? 'Superficial Density σ' : 'Linear Density λ'}
                  </div>
                  <div className="detail-value">
                    <NumberInput
                      value={obj.charge_density}
                      min={VAL_MIN} max={VAL_MAX}
                      style={{ width: 140 }}
                      onChange={(v) => updateObject(obj.id, { charge_density: v })}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                  </div>
                </div>
                <div className="detail-row">
                   <div className="detail-key">Infinite</div>
                   <div className="detail-value">
                     <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                       <input 
                         type="checkbox" 
                         checked={obj.infinite || false}
                         onChange={(e) => updateObject(obj.id, { infinite: e.target.checked })}
                         onClick={(e) => e.stopPropagation()}
                       />
                     </label>
                   </div>
                </div>
              </>
            )}

            {/* Mensagem de Erro Global da Linha */}
            {errorMsg && <div className="error-text" style={{padding: "0 12px 8px"}}>{errorMsg}</div>}

            {/* Botão Remover */}
            <div className="detail-row">
              <div className="detail-key">Actions</div>
              <div className="detail-value">
                <button 
                  onClick={(e) => { e.stopPropagation(); removeObject?.(obj.id); }} 
                  style={{ padding: "6px 8px" }}
                >
                  Remove
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </li>
  );
}