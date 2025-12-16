import React, { useState } from "react";
import NumberInput from "./NumberInput";
import DimensionControls from "./DimensionControls";
import StackedPlaneControls from "./StackedPlaneControls";
import ConcentricSphereControls from "./ConcentricSphereControls";
import ConcentricInfiniteWireControls from "./ConcentricInfiniteWireControls"; 
import PathControls from "./PathControls";
import RotationControls from "./RotationControls"; // <--- add rotation controls
import { TYPE_CONFIG, POS_MIN, POS_MAX, VAL_MIN, VAL_MAX, ERROR_MSG } from "./utils";

export default function ObjectItem({ 
  obj, 
  expanded, 
  hovered, 
  toggleExpand, 
  setHoveredId, 
  updateObject, 
  removeObject,
  stackedPlaneActions,
  concentricActions,
  concentricWireActions, 
  pathActions,
  coilActions,
}) {
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Resolver Ícone (Lógica existente)
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

  // Helpers de variante
  const isPlaneVariant = obj.type === 'plane' || obj.type === 'stackedPlanes';
  
  const isSphereVariant = 
    obj.type === 'concentricSpheres' || 
    obj.type === 'chargedSphere';

  // 3. Helper para Variante de Fios
  const isWireVariant = obj.type === 'wire' || obj.type === 'concentricInfWires';

  // Show rotation for all except charges and spheres
  const canRotate =
    expanded &&
    obj &&
    !['charge', 'chargedSphere', 'concentricSpheres'].includes(obj.type);

  // robust check: handle both explicit 'stackedPlanes' type and cases where
  // stacked-plane is encoded as a plane subtype (obj.subtype or iconData.subtype)
  const isConcentricExcluded = obj.type === 'concentricSpheres' || obj.type === 'concentricInfWires';
  const isStackedPlanes = obj.type === 'stackedPlanes' ||
    (obj.type === 'plane');


  const showDimensions = isStackedPlanes || !isConcentricExcluded;
  return (
    <li className="object-row-wrapper" data-objid={obj.id}>
      {/* Cabeçalho da Linha */}
      <div
        className={`object-row ${hovered ? 'hovered' : ''} ${expanded ? 'selected' : ''}`}
        onClick={() => toggleExpand(obj.id)}
        onMouseEnter={() => setHoveredId?.(obj.id)}
        onMouseLeave={() => setHoveredId?.(null)}
      >
        <span className={`pill ${iconData.subtype}`}>
          {iconData.icon && <img src={iconData.icon} alt={iconData.alt} />}
        </span>
        <span className="name">{obj.name || obj.id}</span>
        <div className="expand-btn">{expanded ? "▾" : "▸"}</div>
      </div>

      {expanded && (
        <div className="object-details">
          <div className="details-grid">
            
            {/* Posição (Igual) */}
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

            {/* Rotation Controls (hide for charges and spheres) */}
            {canRotate && (
              <RotationControls obj={obj} updateObject={updateObject} />
            )}
  
            {/* Dimensões: Esconde se for Sistema Concêntrico (Esferas ou Fios) */}
            { showDimensions && (
              <DimensionControls obj={obj} updateObject={updateObject} />
            )}

            {/* --- TOGGLE PARA PLANES --- */}
            {isPlaneVariant && (
              <div className="detail-row">
                <div className="detail-key">Mode</div>
                <div className="detail-value">
                  <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={obj.type === 'stackedPlanes'}
                      onChange={(e) => {
                        const isStacked = e.target.checked;
                        if (isStacked) {
                          updateObject(obj.id, { 
                            type: 'stackedPlanes',
                            charge_densities: [obj.charge_density ?? 0], 
                            spacing: obj.spacing ?? 1.0,
                            name: "Stacked Planes"
                          });
                        } else {
                          updateObject(obj.id, { 
                            type: 'plane',
                            charge_density: (obj.charge_densities && obj.charge_densities[0]) ?? 0,
                            name: "Plane"
                          });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ fontSize: 13 }}>Stacked Planes</span>
                  </label>
                </div>
              </div>
            )}

            {/* --- TOGGLE PARA ESFERAS --- */}
            {isSphereVariant && (
              <div className="detail-row">
                <div className="detail-key">Mode</div>
                <div className="detail-value">
                  <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={obj.type === 'concentricSpheres'}
                      onChange={(e) => {
                        const isConcentric = e.target.checked;
                        if (isConcentric) {
                          const r = obj.radius || 1;
                          const q = obj.charge || 0;
                          updateObject(obj.id, { 
                            type: 'concentricSpheres',
                            name: "Concentric System",
                            radiuses: [r],
                            materials: ['conductor'],
                            charges: [q],
                            dielectrics: [1]
                          });
                        } else {
                          const r = (obj.radiuses && obj.radiuses[0]) || 1;
                          const q = (obj.charges && obj.charges[0]) || 0;
                          updateObject(obj.id, { 
                            type: 'chargedSphere',
                            name: "Charged Sphere",
                            radius: r,
                            charge: q
                          });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ fontSize: 13 }}>Concentric System</span>
                  </label>
                </div>
              </div>
            )}

            {/* --- 4. TOGGLE PARA WIRES --- */}
            {isWireVariant && (
              <div className="detail-row">
                <div className="detail-key">Mode</div>
                <div className="detail-value">
                  <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={obj.type === 'concentricInfWires'}
                      onChange={(e) => {
                        const isConcentric = e.target.checked;
                        if (isConcentric) {
                          // Converter para Concêntrico
                          // Assumimos radius existente (ou default) e lambda existente
                          const r = obj.radius || 1; 
                          const lambda = obj.charge_density || 0;
                          
                          updateObject(obj.id, { 
                            type: 'concentricInfWires',
                            name: "Concentric Wires",
                            radiuses: [r],
                            materials: ['conductor'],
                            charges: [lambda], // 'charges' armazena as densidades lineares aqui
                            dielectrics: [1]
                          });
                        } else {
                          // Converter para Fio Simples
                          const r = (obj.radiuses && obj.radiuses[0]) || 1;
                          const lambda = (obj.charges && obj.charges[0]) || 0;
                          
                          updateObject(obj.id, { 
                            type: 'wire',
                            name: "Wire",
                            radius: r, // O Wire pode ou não usar radius visualmente, mas guardamos
                            charge_density: lambda
                          });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ fontSize: 13 }}>Concentric Wires</span>
                  </label>
                </div>
              </div>
            )}


            {/* --- Renderização Condicional dos Campos Específicos --- */}

            {obj.type === 'path' && (
              <PathControls
                  obj={obj}
                  addPoint={pathActions?.addPoint}
                  removeLastPoint={pathActions?.removeLastPoint}
                  setPoint={pathActions?.setPoint}
                  changeChargeCount={pathActions?.changeChargeCount}
                  changeCharge={pathActions?.changeCharge}
                  changeVelocity={pathActions?.changeVelocity}
                  updateObject={updateObject}
                  setErrorMsg={setErrorMsg}
              />
            )}

            {obj.type === 'coil' && obj.coilType !== 'solenoid' && (
              <PathControls
                  obj={obj}
                  changeChargeCount={coilActions?.changeChargeCount}
                  changeCharge={coilActions?.changeCharge}
                  changeVelocity={coilActions?.changeVelocity}
                  updateObject={updateObject}
                  setErrorMsg={setErrorMsg}
              />
            )}

            {/* A) Plano Normal */}
            {obj.type === 'plane' && (
              <div className="detail-row">
                <div className="detail-key">Superficial Density σ</div>
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
            )}

            {/* B) Stacked Planes */}
            {obj.type === 'stackedPlanes' && (
              <StackedPlaneControls 
                obj={obj}
                updateObject={updateObject}
                setSpacing={stackedPlaneActions?.setSpacing}
                setChargeDensity={stackedPlaneActions?.setChargeDensity}
                addPlane={stackedPlaneActions?.addPlane}
                removeLastPlane={stackedPlaneActions?.removeLastPlane}
                setErrorMsg={setErrorMsg}

              />
            )}

            {/* C) Concentric Spheres */}
            {obj.type === 'concentricSpheres' && (
              <ConcentricSphereControls 
                 obj={obj}
                 updateObject={updateObject}
                 setErrorMsg={setErrorMsg}
                 {...concentricActions} 
              />
            )}

            {/* D) Concentric Infinite Wires (NOVO) */}
            {obj.type === 'concentricInfWires' && (
              <ConcentricInfiniteWireControls 
                 obj={obj}
                 updateObject={updateObject}
                 setErrorMsg={setErrorMsg}
                 {...concentricWireActions} 
              />
            )}

            {/* E) Charged Sphere Simples */}
            {obj.type === 'chargedSphere' && (
              <div className="detail-row">
                <div className="detail-key">Intensity C</div>
                <div className="detail-value">
                   <NumberInput
                      value={obj.charge}
                      min={VAL_MIN} max={VAL_MAX}
                      style={{ width: 140 }}
                      onChange={(v) => updateObject(obj.id, { charge: v })}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                   />
                </div>
              </div>
            )}

            {/* F) Charge (Carga Pontual) */}
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

            {/* G) Wire Simples */}
            {obj.type === 'wire' && (
               <div className="detail-row">
                  <div className="detail-key">Linear Density λ</div>
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
            )}

            {obj.type === 'coil' && obj.coilType === 'solenoid' && (
               <>
                 <div className="detail-row">
                    <div className="detail-key">Length</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.length}
                        min={0.1} max={100}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { length: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Radius</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.radius}
                        min={0.1} max={50}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { radius: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Resolution</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.resolution}
                        min={0.1} max={300}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { resolution: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                  <div className="detail-row">
                    <div className="detail-key">Strength</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.multiplier}
                        min={0.1} max={50}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { multiplier: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>
               </>
            )}

            {obj.type === 'barMagnet' && (
               <>
                 <div className="detail-row">
                    <div className="detail-key">Length</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.length}
                        min={0.1} max={100}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { length: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Radius</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.radius}
                        min={0.1} max={50}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { radius: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                  <div className="detail-row">
                    <div className="detail-key">Strength</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.charge}
                        min={0.1} max={50}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { charge: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Resolution</div>
                    <div className="detail-value">
                      <NumberInput
                        step={1}
                        value={obj.numOfCoils}
                        min={1.0} max={50}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { numOfCoils: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                 <div className="detail-row">
                  <div className="detail-key">Frozen</div>
                  <div className="detail-value">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        updateObject(obj.id, { frozen: !obj.frozen });
                      }}
                      style={{ padding: "6px 8px" }}
                    >
                      {obj.frozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                  </div>
                </div>
               </>
            )}

            {obj.type === 'faradayCoil' && (
               <>
                 <div className="detail-row">
                    <div className="detail-key">Radius</div>
                    <div className="detail-value">
                      <NumberInput
                        value={obj.radius}
                        min={0.01} max={10}
                        style={{ width: 140 }}
                        onChange={(v) => updateObject(obj.id, { radius: v })}
                        onError={setErrorMsg}
                        errorMsg={ERROR_MSG}
                      />
                    </div>
                 </div>

                  <div className="detail-row">
                    <div className="detail-key">Magnetic Flux</div>
                    <div className="detail-value">{obj.magneticFlux}</div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Electromotive Force</div>
                    <div className="detail-value">{obj.emf}</div>
                 </div>
                </>
            )}

            {/* Opção Infinite (Para Planes e Wire) */}
            {(isPlaneVariant || obj.type === 'wire') && (
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
            )}

            {/* Erros e Botão Remover (Igual) */}
            {errorMsg && <div className="error-text" style={{padding: "0 12px 8px"}}>{errorMsg}</div>}
            
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