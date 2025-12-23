import React, { useState } from "react";
import { InlineDecimalInput } from "../io/decimalInput";
import "../io/decimalInput.css";

import DimensionControls from "./DimensionControls";
import StackedPlaneControls from "./StackedPlaneControls";
import ConcentricSphereControls from "./ConcentricSphereControls";
import ConcentricInfiniteWireControls from "./ConcentricInfiniteWireControls";
import PathControls from "./PathControls";
import CoilControls from "./CoilControls";
import RotationControls from "./RotationControls";
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

  // ícone
  let iconData = { icon: null, alt: "", subtype: obj.type };
  if (obj.type === "surface") {
    const resolved = TYPE_CONFIG.surface.resolve(obj);
    iconData = { ...resolved };
  } else if (TYPE_CONFIG[obj.type]) {
    const conf = TYPE_CONFIG[obj.type];
    iconData = {
      icon: typeof conf.icon === "function" ? conf.icon(obj) : conf.icon,
      alt: typeof conf.alt === "function" ? conf.alt(obj) : conf.alt,
      subtype: obj.type
    };
  }

  const isPlaneVariant = obj.type === "plane" || obj.type === "stackedPlanes";
  const isSphereVariant =
    obj.type === "concentricSpheres" || obj.type === "chargedSphere";
  const isWireVariant =
    obj.type === "wire" || obj.type === "concentricInfWires";

  const canRotate =
    expanded &&
    obj &&
    !["charge", "chargedSphere", "concentricSpheres"].includes(obj.type);

  const isConcentricExcluded =
    obj.type === "concentricSpheres" || obj.type === "concentricInfWires";
  const isStackedPlanes =
    obj.type === "stackedPlanes" || obj.type === "plane";

  const showDimensions = isStackedPlanes || !isConcentricExcluded;

  const clampWithError = (v, min, max) => {
    if (v < min || v > max) {
      setErrorMsg(ERROR_MSG);
      return Math.min(max, Math.max(min, v));
    }
    setErrorMsg(null);
    return v;
  };

  return (
    <li className="object-row-wrapper" data-objid={obj.id}>
      <div
        className={`object-row ${hovered ? "hovered" : ""} ${
          expanded ? "selected" : ""
        }`}
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
            {/* Position com InlineDecimalInput */}
            {Array.isArray(obj.position)  && (
              <div className="detail-row">
                <div className="detail-key">Position</div>
                <div
                  className="detail-value"
                  style={{ display: "flex", gap: 6 }}
                >
                  {[0, 1, 2].map((idx) => (
                    <InlineDecimalInput
                      key={idx}
                      initialValue={obj.position[idx]}
                      min={POS_MIN}
                      max={POS_MAX}
                      step={0.1}
                      onChange={(val) => {
                        const safe = clampWithError(val, POS_MIN, POS_MAX);
                        const newPos = [...obj.position];
                        newPos[idx] = safe;
                        updateObject(obj.id, { position: newPos });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Rotation Controls */}
            {canRotate && (
              <RotationControls obj={obj} updateObject={updateObject} />
            )}

            {/* Dimensões (não para sistemas concêntricos) */}
            {showDimensions && (
              <DimensionControls obj={obj} updateObject={updateObject} />
            )}

            {/* TOGGLE Planes */}
            {isPlaneVariant && (
              <div className="detail-row">
                <div className="detail-key">Mode</div>
                <div className="detail-value">
                  <label
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={obj.type === "stackedPlanes"}
                      onChange={(e) => {
                        const isStacked = e.target.checked;
                        if (isStacked) {
                          updateObject(obj.id, {
                            type: "stackedPlanes",
                            charge_densities: [obj.charge_density ?? 0],
                            spacing: obj.spacing ?? 1.0,
                            
                          });
                        } else {
                          updateObject(obj.id, {
                            type: "plane",
                            charge_density:
                              (obj.charge_densities &&
                                obj.charge_densities[0]) ??
                              0,
                           
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

            {/* TOGGLE Esferas */}
            {isSphereVariant && (
              <div className="detail-row">
                <div className="detail-key">Mode</div>
                <div className="detail-value">
                  <label
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={obj.type === "concentricSpheres"}
                      onChange={(e) => {
                        const isConcentric = e.target.checked;
                        if (isConcentric) {
                          const r = obj.radius || 1;
                          const q = obj.charge || 0;
                          updateObject(obj.id, {
                            type: "concentricSpheres",
                            name: "Concentric System",
                            radiuses: [r],
                            materials: ["conductor"],
                            charges: [q],
                            dielectrics: [1]
                          });
                        } else {
                          const r =
                            (obj.radiuses && obj.radiuses[0]) || 1;
                          const q =
                            (obj.charges && obj.charges[0]) || 0;
                          updateObject(obj.id, {
                            type: "chargedSphere",
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

            {/* TOGGLE Wires */}
            {isWireVariant && (
              <div className="detail-row">
                <div className="detail-key">Mode</div>
                <div className="detail-value">
                  <label
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={obj.type === "concentricInfWires"}
                      onChange={(e) => {
                        const isConcentric = e.target.checked;
                        if (isConcentric) {
                          const r = obj.radius || 1;
                          const lambda = obj.charge_density || 0;

                          updateObject(obj.id, {
                            type: "concentricInfWires",
                            name: "Concentric Wires",
                            radiuses: [r],
                            materials: ["conductor"],
                            charges: [lambda],
                            dielectrics: [1]
                          });
                        } else {
                          const r =
                            (obj.radiuses && obj.radiuses[0]) || 1;
                          const lambda =
                            (obj.charges && obj.charges[0]) || 0;

                          updateObject(obj.id, {
                            type: "wire",
                            name: "Wire",
                            radius: r,
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

            {obj.type === 'coil' && (
              <>
                <PathControls
                    obj={obj}
                    changeChargeCount={coilActions?.changeChargeCount}
                    changeCharge={coilActions?.changeCharge}
                    changeVelocity={coilActions?.changeVelocity}
                    updateObject={updateObject}
                    setErrorMsg={setErrorMsg}
                />
                <CoilControls
                    obj={obj}
                    changeRadius={coilActions?.changeRadius}
                    changeSides={coilActions?.changeSides}
                    updateObject={updateObject}
                    setErrorMsg={setErrorMsg}
                />
              </>
            )}

            {/* A) Plano Normal */}
            {obj.type === 'plane' && (
              <div className="detail-row">
                <div className="detail-key">Superficial Density σ</div>
                <div className="detail-value">
                  <InlineDecimalInput
                    initialValue={obj.charge_density ?? 0}
                    min={VAL_MIN}
                    max={VAL_MAX}
                    step={0.01}
                    onChange={(v) => {
                      const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                      updateObject(obj.id, { charge_density: safe });
                    }}
                  />
                </div>
              </div>
            )}

            {/* StackedPlanes (mantém controle próprio interno) */}
            {obj.type === "stackedPlanes" && (
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

            {/* Concentric Spheres */}
            {obj.type === "concentricSpheres" && (
              <ConcentricSphereControls
                obj={obj}
                updateObject={updateObject}
                setErrorMsg={setErrorMsg}
                {...concentricActions}
              />
            )}

            {/* Concentric Infinite Wires */}
            {obj.type === "concentricInfWires" && (
              <ConcentricInfiniteWireControls
                obj={obj}
                updateObject={updateObject}
                setErrorMsg={setErrorMsg}
                {...concentricWireActions}
              />
            )}

            {/* Charged Sphere */}
            {obj.type === "chargedSphere" && (
              <div className="detail-row">
                <div className="detail-key">Volume Density ρ</div>
                <div className="detail-value">
                  <InlineDecimalInput
                    initialValue={obj.charge_density ?? 0}
                    min={VAL_MIN}
                    max={VAL_MAX}
                    step={0.01}
                    onChange={(v) => {
                      const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                      updateObject(obj.id, { charge_density: safe });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Point charge */}
            {(obj.type === "charge") && (
              <div className="detail-row">
                <div className="detail-key">Intensity C</div>
                <div className="detail-value">
                  <InlineDecimalInput
                    initialValue={obj.charge ?? 0}
                    min={VAL_MIN}
                    max={VAL_MAX}
                    step={0.25}
                    onChange={(v) => {
                      const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                      updateObject(obj.id, { charge: safe });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Wire simples */}
            {obj.type === "wire" && (
              <div className="detail-row">
                <div className="detail-key">Linear Density λ</div>
                <div className="detail-value">
                  <InlineDecimalInput
                    initialValue={obj.charge_density ?? 0}
                    min={VAL_MIN}
                    max={VAL_MAX}
                    step={0.01}
                    onChange={(v) => {
                      const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                      updateObject(obj.id, { charge_density: safe });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Show Label toggle for objects with labels (not surfaces) */}
            {(obj.type === "charge" || obj.type === "wire" || obj.type === "plane" || obj.type === "chargedSphere" || obj.type === "path" || obj.type === "testPointCharge" || obj.type === "coil") && (
              <div className="detail-row">
                <div className="detail-key">Show Label</div>
                <div className="detail-value">
                  <input
                    type="checkbox"
                    checked={obj.showLabel ?? true}
                    onChange={(e) => updateObject(obj.id, { showLabel: e.target.checked })}
                  />
                </div>
              </div>
            )}

            {/* Infinite toggle */}
            {(isPlaneVariant || obj.type === "wire") && (
              <div className="detail-row">
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
            )}

            {errorMsg && (
              <div
                className="error-text"
                style={{ padding: "0 12px 8px" }}
              >
                {errorMsg}
              </div>
            )}

            <div className="detail-row">
              <div className="detail-key">Actions</div>
              <div className="detail-value">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeObject?.(obj.id);
                  }}
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