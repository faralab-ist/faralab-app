import React, { useState, useRef, useLayoutEffect } from "react";
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
  showFlux
}) {
  const [errorMsg, setErrorMsg] = useState(null);
  const detailsRef = useRef(null);
  const detailsContentRef = useRef(null);
  const [detailsHeight, setDetailsHeight] = useState(0);

  useLayoutEffect(() => {
    const el = detailsContentRef.current;
    if (!el) return undefined;

    if (!expanded) {
      setDetailsHeight(0);
      return undefined;
    }

    const updateHeight = () => {
      const next = el.scrollHeight;
      setDetailsHeight((prev) => (prev === next ? prev : next));
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateHeight());
      observer.observe(el);
      return () => observer.disconnect();
    }

    return undefined;
  }, [expanded]);

  // ícone
  let iconData = { icon: null, alt: "", subtype: obj.type };
  if (obj.type === "surface") {
    const resolved = TYPE_CONFIG.surface.resolve(obj);
    iconData = { ...resolved };
  } else if (obj.type === "coil") {
    const resolved = TYPE_CONFIG.coil.resolve(obj);
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
  const isRingCoil = obj.type === "coil" &&
    (obj.subtype === "ringCoil" || obj.coilType === "ring");
  const isPolygonCoil = obj.type === "coil" &&
    (obj.subtype === "polygonCoil" || obj.coilType === "polygon");
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
  
  const isSurfaceWithoutFlux = obj.type === 'surface' && !showFlux;
  //console.log('showFlux in ObjectItem:', showFlux);
  return (
    <li
      className={`object-row-wrapper ${expanded ? "expanded" : ""}`}
      data-objid={obj.id}
    >
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
        <button
          type="button"
          className={`label-toggle ${obj.showLabel ?? true ? "active" : ""} ${isSurfaceWithoutFlux ? "disabled" : ""}`}
          aria-pressed={obj.showLabel ?? true}
          disabled={isSurfaceWithoutFlux}
          onClick={(e) => {
            e.stopPropagation();
            if (!isSurfaceWithoutFlux) {
              updateObject(obj.id, { showLabel: !(obj.showLabel ?? true) });
            }
          }}
          title={isSurfaceWithoutFlux ? "Enable Gaussian Surface mode to view labels" : undefined}
        >
          <svg
            className="label-toggle-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M3 11l8-8h6l4 4v6l-8 8-10-10z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="16.5" cy="7.5" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div
        ref={detailsRef}
        className={`object-details ${expanded ? "expanded" : ""}`}
        style={{ height: expanded ? detailsHeight : 0 }}
      >
        <div ref={detailsContentRef} className="details-grid">
            {/* Position com InlineDecimalInput */}
            {Array.isArray(obj.position)  && (
              <div className="detail-row inline">
                <div
                  className="detail-value"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
                >
                  <span className="detail-key" style={{ margin: 0, fontSize: 11 }}>pos:</span>
                  {["x", "y", "z"].map((axis, idx) => (
                    <div key={axis} style={{ display: "flex", alignItems: "center"}}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                        {axis}
                      </span>
                      <span style={{ opacity: 0.7 }}>:</span>
                      <InlineDecimalInput
                        initialValue={obj.position[idx]}
                        min={POS_MIN}
                        max={POS_MAX}
                        step={0.1}
                        decimals={2}
                        onChange={(val) => {
                          const safe = clampWithError(val, POS_MIN, POS_MAX);
                          const newPos = [...obj.position];
                          newPos[idx] = safe;
                          updateObject(obj.id, { position: newPos });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rotation Controls */}
            {canRotate && (
              <RotationControls obj={obj} updateObject={updateObject} />
            )}

                        {/* TOGGLE Planes */}
            {isPlaneVariant && (
              <div className="detail-row inline">
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

            {/* TOGGLE Wires */}
            {isWireVariant && (
              <div className="detail-row inline">
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

            

            {/* TOGGLE Esferas */}
            {isSphereVariant && (
              <div className="detail-row inline">
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

            {/* --- Renderização Condicional dos Campos Específicos --- */}

            
            {obj.type === 'path' && (
              <>
                <PathControls
                    obj={obj}
                    addPoint={pathActions?.addPoint}
                    removeLastPoint={pathActions?.removeLastPoint}
                    setPoint={pathActions?.setPoint}
                    updateObject={updateObject}
                    setErrorMsg={setErrorMsg}
                />
              </>
            )}

            {obj.type === 'coil' && obj.coilType !== 'solenoid' && (
              <>
                <PathControls
                    obj={obj}
                    addPoint={coilActions?.addPoint}
                    removeLastPoint={coilActions?.removeLastPoint}
                    setPoint={coilActions?.setPoint}
                    updateObject={updateObject}
                    setErrorMsg={setErrorMsg}
                />
                {/* Coil-specific controls: for ring/polygon show compact columnOnly variant */}
                {(isRingCoil || isPolygonCoil) ? (
                  <CoilControls
                    obj={obj}
                    changeRadius={coilActions?.changeRadius}
                    changeSides={coilActions?.changeSides}
                    updateObject={updateObject}
                    setErrorMsg={setErrorMsg}
                    columnOnly
                  />
                ) : (
                  <CoilControls
                      obj={obj}
                      changeRadius={coilActions?.changeRadius}
                      changeSides={coilActions?.changeSides}
                      updateObject={updateObject}
                      setErrorMsg={setErrorMsg}
                  />
                )}
              </>
            )}

            {/* A) Plano Normal */}
            {obj.type === 'plane' && (
              <>
                <div className="detail-row inline">
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
                <div className="detail-row inline">
                  <div className="detail-key">Superficial Density σ: </div>
                  <div className="detail-value">
                    <InlineDecimalInput
                      initialValue={obj.charge_density ?? 0}
                      min={VAL_MIN}
                      max={VAL_MAX}
                      step={0.01}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                        updateObject(obj.id, { charge_density: safe });
                      }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>C/m²</span>
                  </div>
                </div>
              </>
            )}

            {/* Dimensões (não para sistemas concêntricos) */}
            {(showDimensions && obj.type !== "stackedPlanes") && (
              <DimensionControls obj={obj} updateObject={updateObject} setErrorMsg={setErrorMsg} clampWithError={clampWithError} />
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
              <>
                <div className="detail-row inline">
                  <div className="detail-key">Volume Density ρ: </div>
                  <div className="detail-value">
                    <InlineDecimalInput
                      initialValue={obj.charge_density ?? 0}
                      min={VAL_MIN}
                      max={VAL_MAX}
                      step={0.01}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                        updateObject(obj.id, { charge_density: safe });
                      }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>C/m³</span>
                  </div>
                </div>
              </>
            )}

            {/* Point charge */}
            {(obj.type === "charge") && (
              <div className="detail-row inline">
                <div
                  className="detail-value"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span className="detail-key" style={{ margin: 0, fontSize: 11 }}>intensity:</span>
                  <InlineDecimalInput
                    initialValue={obj.charge ?? 0}
                    min={VAL_MIN}
                    max={VAL_MAX}
                    step={0.25}
                    inputStyle={{ minWidth: "4ch" }}
                    onChange={(v) => {
                      const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                      updateObject(obj.id, { charge: safe });
                    }}
                  />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>C</span>
                </div>
              </div>
            )}

            {/* Wire simples */}
            {obj.type === "wire" && (
              <>
                <div className="detail-row inline">
                  <div className="detail-key">Linear Density λ: </div>
                  <div className="detail-value">
                    <InlineDecimalInput
                      initialValue={obj.charge_density ?? 0}
                      min={VAL_MIN}
                      max={VAL_MAX}
                      step={0.01}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, VAL_MIN, VAL_MAX);
                        updateObject(obj.id, { charge_density: safe });
                      }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>C/m</span>
                  </div>
                </div>

              </>
            )}

            {errorMsg && (
              <div
                className="error-text"
                style={{ padding: "0 12px 8px" }}
              >
                {errorMsg}
              </div>
            )}
           {obj.type === 'coil' && obj.coilType === 'solenoid' && (
               <>
                 <div className="detail-row inline">
                  <div className="detail-key">Length: </div>
                  <div className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineDecimalInput
                      value={obj.length}
                      min={0.1}
                      max={100}
                      step={0.01}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 100);
                        updateObject(obj.id, { length: safe });
                      }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginRight: 20}}>m</span>
                    <span className="detail-key">Radius: </span>
                    <InlineDecimalInput
                      value={obj.radius}
                      min={0.1}
                      max={50}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 50);
                        updateObject(obj.id, { radius: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)"}}>m</span>
                  </div>
                 </div>
                 <div className="detail-row inline">
                  <div className="detail-key">Turns: </div>
                  <div className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineDecimalInput
                      value={obj.turns}
                      min={0.1}
                      max={300}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 300);
                        updateObject(obj.id, { turns: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                    <span className="detail-key" style={{ marginLeft: 27 }}>Current: </span>
                    <InlineDecimalInput
                      value={obj.current}
                      min={0}
                      max={50}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 50);
                        updateObject(obj.id, { current: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>A</span>
                  </div>
                 </div>
                 <div className="detail-row inline">
                  <div className="detail-key">Resolution (best results ~ 700): </div>
                  <div className="detail-value">
                    <InlineDecimalInput
                      value={obj.segments}
                      min={1}
                      max={3000}
                      step={1}
                      onChange={(v) => {
                        const safe = clampWithError(v, 1, 3000);
                        updateObject(obj.id, { segments: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                  </div>
                 </div>
               </>
            )}


            {obj.type === 'barMagnet' && (
               <>
                 <div className="detail-row inline">
                  <div className="detail-key">Length: </div>
                  <div className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineDecimalInput
                      value={obj.length}
                      min={0.1}
                      max={100}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 100);
                        updateObject(obj.id, { length: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginRight: 20 }}>m</span>
                    <span className="detail-key">Radius:</span>
                    <InlineDecimalInput
                      value={obj.radius}
                      min={0.1}
                      max={50}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 50);
                        updateObject(obj.id, { radius: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>m</span>
                  </div>
                 </div>

                 <div className="detail-row inline">
                  <div className="detail-key">Multiplier: </div>
                  <div className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineDecimalInput
                      value={obj.current}
                      min={0.1}
                      max={50}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 50);
                        updateObject(obj.id, { current: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                    <span className="detail-key" style={{ marginLeft: 10 }}>Resolution: </span>
                    <InlineDecimalInput
                      step={1}
                      value={obj.numOfCoils}
                      min={1.0}
                      max={50}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 50);
                        updateObject(obj.id, { numOfCoils: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                  </div>
                 </div>
                 <div className="detail-row inline">
                  <div className="detail-key">Animation frequency: </div>
                  <div className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <InlineDecimalInput
                      value={Number.isFinite(obj.freq) ? obj.freq : (obj.freq === undefined ? 1 : 0)}
                      step={0.1}
                      min={0}
                      max={100}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 100);
                        updateObject(obj.id, { freq: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Hz</span>
                  </div>
                 </div>

                 <div className="detail-row inline">
                  <div className="detail-key">Animation amplitude: </div>
                  <div className="detail-value">
                    <InlineDecimalInput
                      value={Number.isFinite(obj.amplitude) ? obj.amplitude : (obj.amplitude === undefined ? 0.1 : 0)}
                      step={0.01}
                      min={0}
                      max={100}
                      onChange={(v) => {
                        const safe = clampWithError(v, 0.1, 100);
                        updateObject(obj.id, { amplitude: safe });
                      }}
                      onError={setErrorMsg}
                      errorMsg={ERROR_MSG}
                    />
                  </div>
                 </div>
                 <div className="detail-row inline">
                  <div className="detail-value">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { animated: !obj.animated }); }}
                      style={{ padding: "6px 8px" }}
                    >
                      {obj.animated ? "Stop animation" : "Start animation"}
                    </button>
                  </div>
                 </div>
               </>
            )}

            {obj.type === 'faradayCoil' && (
               <>
                 <div className="detail-row inline">
                    <div className="detail-key">Radius: </div>
                    <div className="detail-value">
                      <InlineDecimalInput
                        initialValue={obj.radius}
                        min={0.01} max={10}
                        step={0.01}
                        inputStyle={{ minWidth: "4ch" }}
                        onChange={(v) => {
                          const safe = clampWithError(v, 0.1, 10);
                          updateObject(obj.id, { radius: safe });
                        }}
                      />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>m</span>
                    </div>
                 </div>

                  <div className="detail-row">
                  <div className="detail-key">Magnetic Flux</div>
                    <div className="detail-value">{obj.magneticFlux} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Wb</span></div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Electromotive Force</div>
                    <div className="detail-value">{obj.emf} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>V</span></div>
                 </div>
                </>
            )}

            {obj.type === 'testCoil' && (
               <>
                 <div className="detail-row inline">
                  <div className="detail-key">Radius: </div>
                  <div className="detail-value">
                    <InlineDecimalInput
                      initialValue={obj.radius}
                      min={0.01} max={10}
                      step={0.01}
                      inputStyle={{ minWidth: "4ch" }}
                      onChange={(v) => updateObject(obj.id, { radius: v })}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>m</span>
                  </div>
                 </div>

                  <div className="detail-row">
                  <div className="detail-key">Magnetic Flux</div>
                    <div className="detail-value">{obj.magneticFlux} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Wb</span></div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Electromotive Force</div>
                    <div className="detail-value">{obj.emf} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>V</span></div>
                 </div>

                 <div className="detail-row">
                    <div className="detail-key">Electric Flux</div>
                    <div className="detail-value">{obj.electricFlux} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>V·m</span></div>
                 </div>
                </>
            )}

            <div className="detail-row">
              <div className="detail-value" style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeObject?.(obj.id);
                  }}
                  style={{ padding: "6px 8px" }}
                >
                  X Remove
                </button>
              </div>
            </div>
          </div>
        </div>
    </li>
  );
}
