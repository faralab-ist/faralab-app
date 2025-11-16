import React, { useState, useEffect} from "react";
import * as THREE from 'three'
import "./Sidebar.css";

/**
 * ObjectList — apenas permite editar os mesmos campos que o popup:
 * - position (x,y,z) se existir
 * - charge (Intensity C) para type === 'charge'
 * - charge_density (σ or λ) + infinite checkbox for 'plane' and 'wire'
 * - remove button
 *
 * Chama updateObject(id, patch) e removeObject(id).
 */
export default function ObjectList({ 
  items = [], 
  updateObject, 
  removeObject, 
  expandId = null,
  hoveredId,
  selectedId,
  setSelectedId
}) {
  const [expanded, setExpanded] = useState({});
  const [errors, setErrors] = useState({}); // { [id]: { charge?: string, density?: string } }

  const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  useEffect(() => {
    if (!expandId) return;
    // expande o item solicitado e faz scroll para ele
    setExpanded((s) => ({ ...s, [expandId]: true }));
    // esperar um tick para garantir o DOM existe
    setTimeout(() => {
      const el = document.querySelector(`[data-objid="${expandId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }, [expandId]);

  if (!items?.length) {
    return (
      <div className="object-list-empty" style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
        No objects yet
      </div>
    );
  }

  const onRemove = (id, name) => {
    if (!removeObject) return;
    //if (window.confirm(`Remove "${name || id}" from scene?`)) 
    removeObject(id);
  };

  // helpers for plain inputs
  const parseNum = (s) => {
    if (s === '' || s == null) return 0;
    const n = parseFloat(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const isPartial = (s) => s === '' || s === '-' || s === '.' || s === '-.';

  const formatFixed = (raw, decimals = 2) => {
     const n = parseNum(raw);
     return n.toFixed(decimals);
   };
  
  // bounds
  const POS_MIN = -10, POS_MAX = 10;
  const VAL_MIN = -5, VAL_MAX = 5;
  const ANGLE_MIN = -360, ANGLE_MAX = 360;
  const DIM_MIN = 0.1;
  const DIM_MAX = 10;
  const ERROR_MSG = `Please keep the value between ${VAL_MIN} and ${VAL_MAX}`;
  const clampPos = (n) => Math.max(POS_MIN, Math.min(POS_MAX, n));
  const clampDim = (n) => Math.max(DIM_MIN, Math.min(DIM_MAX, n));
  const clampAngle= (n) =>  Math.min(360, n%360);

  const setError = (id, key, msg) => {
    setErrors(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: msg } }));
  };
  const clearError = (id, key) => {
    setErrors(prev => {
      const cur = { ...(prev[id] || {}) };
      delete cur[key];
      const next = { ...prev, [id]: cur };
      if (!Object.keys(cur).length) { delete next[id]; }
      return next;
    });
  };

  const commitPosition = (obj, idx, raw) => {
    const next = parseNum(raw);
    const clamped = Math.max(POS_MIN, Math.min(POS_MAX, next));
    const arr = Array.isArray(obj.position) ? [...obj.position] : [0, 0, 0];
    arr[idx] = clamped;
    updateObject?.(obj.id, { position: arr });
  };
  const commitField = (obj, field, raw) => {
    updateObject?.(obj.id, { [field]: parseNum(raw) });
  };

  const commitDimension = (obj, field, raw) => {
    const v = raw;
    if (isPartial(v)) return;
    const n = parseNum(v);
    const clamped = Math.max(DIM_MIN, Math.abs(n));
    updateObject?.(obj.id, { [field]: clamped });
  };

  // Rotation helper: input in degrees, store as radians in obj.rotation [rx,ry,rz]
  const commitRotation = (obj, idx, rawDeg) => {
    const deg = parseNum(rawDeg);
    const rad = (deg * Math.PI) / -180;
    const arr = Array.isArray(obj.rotation) ? [...obj.rotation] : [0, 0, 0];
    arr[idx] = rad;
    // build quaternion from Euler (XYZ)
    const e = new THREE.Euler(arr[0], arr[1], arr[2], 'XYZ');
    const q = new THREE.Quaternion().setFromEuler(e);
    // save both so UI and models stay in sync
    updateObject?.(obj.id, { rotation: arr, quaternion: [q.x, q.y, q.z, q.w] });
  };

  const setPositionElem = (id, key, idx, newVal) => {
    if (!updateObject) return;
    const obj = items.find((it) => it.id === id);
    const arr = Array.isArray(obj?.[key]) ? [...obj[key]] : [0, 0, 0];
    arr[idx] = Number.isFinite(newVal) ? newVal : 0;
    updateObject(id, { [key]: arr });
  };

  const handleRowClick = (obj) => {
    // If the detail for this row is already open and the current selectedId
    // is different, keep the details open (do not toggle/close).
    setExpanded((prev) => {
      if (prev[obj.id] && selectedId !== obj.id) {
        return prev;
      }
      return { ...prev, [obj.id]: !prev[obj.id] };
    });

    const newId = selectedId === obj.id ? null : obj.id;
    if (typeof setSelectedId === "function") {
      setSelectedId(newId);
    } 
  };



  const renderDimensionControls = (obj) => {
    // Não mostrar dimensões para charges
    if (obj.type === 'charge') {
      return null;
    }

    const has = (k) => typeof obj?.[k] === 'number';

    // Sphere: radius only (1 input) — add label above input
    if (has('radius') && !has('height') && !has('width') && !has('depth')) {
      return (
        <div className="detail-row">
          <div className="detail-key">Dimensions</div>
          <div className="detail-value" style={{ display: "flex", gap: 6 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Radius</div>
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                defaultValue={obj.radius}
                  onChange={(e) => {const v = e.target.value;
                    if (isPartial(v)) return;
                    let n = parseNum(v);
                    const c = clampDim(n);
                    if(isPartial(v)) return;
                    commitDimension(obj, 'radius', n);
                    if (n !== c) e.target.value = formatFixed(c, 2);}}
                onBlur={(e) => {
                    const v = e.target.value;
                    let n = clampAngle(parseNum(isPartial(v) ? 0 : v));
                    if(isPartial(v)) return;
                    commitRotation(obj, 'radius', n);
                    e.target.value = formatFixed(n, 2);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 72, padding: "4px 8px" }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Cylinder: radius + height — labels above each input
    if (obj.type !== 'wire' && has('radius') && has('height') && !has('width') && !has('depth')) {
      return (
        <div className="detail-row">
          <div className="detail-key">Dimensions</div>
          <div className="detail-value" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Radius</div>
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                defaultValue={obj.radius}
                onChange={(e) => {const v = e.target.value;
                              if (isPartial(v)) return;
                              let n = parseNum(v);
                              const c = clampDim(n);
                              if(isPartial(v)) return;
                              commitDimension(obj, 'radius', n);
                              if (n !== c) e.target.value = formatFixed(c, 2);}}
                onBlur={(e) => {
                              const v = e.target.value;
                              let n = clampAngle(parseNum(isPartial(v) ? 0 : v));
                              if(isPartial(v)) return;
                              commitDimension(obj, 'radius', n);
                              e.target.value = formatFixed(n, 2);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 72, padding: "4px 8px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Height</div>
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                min={DIM_MIN}
                max={DIM_MAX}
                defaultValue={obj.height}
                 onChange={(e) => {const v = e.target.value;
                  if (isPartial(v)) return;
                  let n = parseNum(v);
                  const c = clampDim(n);
                  if(isPartial(v)) return;
                  commitDimension(obj, 'height', n);
                  if (n !== c) e.target.value = formatFixed(c, 2);}}
                onBlur={(e) => {
                  const v = e.target.value;
                  let n = clampAngle(parseNum(isPartial(v) ? 0 : v));
                  if(isPartial(v)) return;
                  commitDimension(obj, 'height', n);
                  e.target.value = formatFixed(n, 2);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 72, padding: "4px 8px" }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Cuboid: width + height + depth — labels above each input
    if (has('width') && has('height') && has('depth')) {
      return (
        <div className="detail-row">
          <div className="detail-key">Dimensions</div>
          <div className="detail-value" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Width</div>
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                min="0"
                defaultValue={obj.width}
                onChange={(e) => {const v = e.target.value;
                  if (isPartial(v)) return;
                  let n = parseNum(v);
                  const c = clampDim(n);
                  if(isPartial(v)) return;
                  commitDimension(obj, 'width', n);
                  if (n !== c) e.target.value = formatFixed(c, 2);}}
                onBlur={(e) => {
                  const v = e.target.value;
                  let n = clampAngle(parseNum(isPartial(v) ? 0 : v));
                  if(isPartial(v)) return;
                  commitDimension(obj, 'width', n);
                  e.target.value = formatFixed(n, 2);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 72, padding: "4px 8px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Height</div>
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                min="0"
                defaultValue={obj.height}
                 onChange={(e) => {const v = e.target.value;
                  if (isPartial(v)) return;
                  let n = parseNum(v);
                  const c = clampDim(n);
                  if(isPartial(v)) return;
                  commitDimension(obj, 'height', n);
                  if (n !== c) e.target.value = formatFixed(c, 2);}}
                onBlur={(e) => {
                  const v = e.target.value;
                  let n = clampAngle(parseNum(isPartial(v) ? 0 : v));
                  if(isPartial(v)) return;
                  commitDimension(obj, 'height', n);
                  e.target.value = formatFixed(n, 2);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 72, padding: "4px 8px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Depth</div>
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                min="0"
                defaultValue={obj.depth}
                 onChange={(e) => {const v = e.target.value;
                  if (isPartial(v)) return;
                  let n = parseNum(v);
                  const c = clampDim(n);
                  if(isPartial(v)) return;
                  commitDimension(obj, 'depth', n);
                  if (n !== c) e.target.value = formatFixed(c, 2);}}
                onBlur={(e) => {
                  const v = e.target.value;
                  let n = clampAngle(parseNum(isPartial(v) ? 0 : v));
                  if(isPartial(v)) return;
                  commitDimension(obj, 'depth', n);
                  e.target.value = formatFixed(n, 2);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 72, padding: "4px 8px" }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Plane: width + height (only if NOT infinite) — existing code remains
    // Wire: length — existing code remains
    return null;
  };

  return (
    <ul className="object-list">
      {items.map((obj) => (
        <li key={obj.id} className="object-row-wrapper" data-objid={obj.id}>
          <div
            className={`object-row ${hoveredId === obj.id  || selectedId === obj.id ? 'hovered' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(obj)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleRowClick(obj);
              }
            }}
          >
            <span className={`pill ${obj.type}`}>{obj.type?.[0]?.toUpperCase() + obj.type?.slice(1)}</span>
            <span className="name">{obj.name || obj.id}</span>
            <div
              className="expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggle(obj.id);
              }}
            >
              {expanded[obj.id] ? "▾" : "▸"}
            </div>
          </div>

          {expanded[obj.id] && ( 
            <div className="object-details">
              <div className="details-grid">
                {/* Position (common) */}
                {Array.isArray(obj.position) && obj.position.length === 3 && (
                  <div className="detail-row">
                    <div className="detail-key">Position X, Y, Z</div>
                    <div className="detail-value" style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.01}
                        defaultValue={obj.position[0]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (isPartial(v)) return;
                          const n = parseNum(v);
                          const c = clampPos(n);
                          commitPosition(obj, 0, c);
                          if (n !== c) e.target.value = formatFixed(c, 2); // reflect clamp immediately
                        }}
                        onBlur={(e) => {
                          const v = e.target.value;
                          const n = clampPos(parseNum(isPartial(v) ? 0 : v));
                          commitPosition(obj, 0, n);
                          e.target.value = formatFixed(n, 2);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 72, padding: "4px 8px" }}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.01}
                        defaultValue={obj.position[1]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (isPartial(v)) return;
                          const n = parseNum(v);
                          const c = clampPos(n);
                          commitPosition(obj, 1, c);
                          if (n !== c) e.target.value = formatFixed(c, 2);
                        }}
                        onBlur={(e) => {
                          const v = e.target.value;
                          const n = clampPos(parseNum(isPartial(v) ? 0 : v));
                          commitPosition(obj, 1, n);
                          e.target.value = formatFixed(n, 2);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 72, padding: "4px 8px" }}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.01}
                        defaultValue={obj.position[2]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (isPartial(v)) return;
                          const n = parseNum(v);
                          const c = clampPos(n);
                          commitPosition(obj, 2, c);
                          if (n !== c) e.target.value = formatFixed(c, 2);
                        }}
                        onBlur={(e) => {
                          const v = e.target.value;
                          const n = clampPos(parseNum(isPartial(v) ? 0 : v));
                          commitPosition(obj, 2, n);
                          e.target.value = formatFixed(n, 2);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 72, padding: "4px 8px" }}
                      />
                    </div>
                  </div>
                )}

                {/* === DIMENSIONS (only for surfaces) === */}
                {renderDimensionControls(obj)}

                {/* Charge: Intensity C (same as popup) */}
                {obj.type === "charge" && (
                  <div className="detail-row">
                    <div className="detail-key">Intensity C</div>
                    <div className="detail-value">
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.25}
                        defaultValue={obj.charge ?? 0}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (isPartial(v)) return;
                          const n = parseNum(v);
                          if (n < VAL_MIN || n > VAL_MAX) {
                            setError(obj.id, 'charge', ERROR_MSG);
                            return;
                          }
                          clearError(obj.id, 'charge');
                          commitField(obj, 'charge', n);
                        }}
                        min={VAL_MIN}
                        max={VAL_MAX}
                        onBlur={(e) => {
                          const v = e.target.value;
                          const n = parseNum(isPartial(v) ? 0 : v);
                          // on blur, commit 0 if partial, otherwise keep typed value
                          if (isPartial(v)) commitField(obj, 'charge', v);
                          // update error state according to bounds
                          if (n < VAL_MIN || n > VAL_MAX) setError(obj.id, 'charge', ERROR_MSG);
                          else clearError(obj.id, 'charge');
                          e.target.value = formatFixed(v, 2);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 140, padding: "4px 8px" }}
                      />
                    </div>
                   {errors[obj.id]?.charge && (
                     <div className="error-text">{errors[obj.id].charge}</div>
                   )}
                  </div>
                )}

                {/* Plane: Superficial Charge Density σ + Infinite */}
                {obj.type === "plane" && (
                  <>
                    <div className="detail-row">
                      <div className="detail-key">Superficial Charge Density σ</div>
                      <div className="detail-value">
                        <input
                          type="number"
                          inputMode="decimal"
                          step={0.1}
                          defaultValue={obj.charge_density ?? 0}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (isPartial(v)) return;
                            const n = parseNum(v);
                            if (n < VAL_MIN || n > VAL_MAX) {
                              setError(obj.id, 'density', ERROR_MSG);
                              return;
                            }
                            clearError(obj.id, 'density');
                            commitField(obj, 'charge_density', n);
                          }}
                          min={VAL_MIN}
                          max={VAL_MAX}
                          onBlur={(e) => {
                            const v = e.target.value;
                            const n = parseNum(isPartial(v) ? 0 : v);
                            if (isPartial(v)) commitField(obj, 'charge_density', v);
                            if (n < VAL_MIN || n > VAL_MAX) setError(obj.id, 'density', ERROR_MSG);
                            else clearError(obj.id, 'density');
                            e.target.value = formatFixed(v, 2);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 140, padding: "4px 8px" }}
                        />
                      </div>
                     {errors[obj.id]?.density && (
                       <div className="error-text">{errors[obj.id].density}</div>
                     )}
                    </div>

                    <div className="detail-row">
                      <div className="detail-key">Infinite</div>
                      <div className="detail-value">
                        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={obj.infinite || false}
                            onChange={(e) => updateObject?.(obj.id, { infinite: e.target.checked })}
                           onMouseDown={(e) => e.stopPropagation()}
                           onClick={(e) => e.stopPropagation()}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Wire: Linear Charge Density λ + Infinite */}
                {obj.type === "wire" && (
                  <>
                    <div className="detail-row">
                      <div className="detail-key">Linear Charge Density λ</div>
                      <div className="detail-value">
                        <input
                          type="number"
                          inputMode="decimal"
                          step={0.1}
                          defaultValue={obj.charge_density ?? 0}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (isPartial(v)) return;
                            const n = parseNum(v);
                            if (n < VAL_MIN || n > VAL_MAX) {
                              setError(obj.id, 'density', ERROR_MSG);
                              return;
                            }
                            clearError(obj.id, 'density');
                            commitField(obj, 'charge_density', n);
                          }}
                          min={VAL_MIN}
                          max={VAL_MAX}
                          onBlur={(e) => {
                            const v = e.target.value;
                            const n = parseNum(isPartial(v) ? 0 : v);
                            if (isPartial(v)) commitField(obj, 'charge_density', v);
                            if (n < VAL_MIN || n > VAL_MAX) setError(obj.id, 'density', ERROR_MSG);
                            else clearError(obj.id, 'density');
                            e.target.value = formatFixed(v, 2);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 140, padding: "4px 8px" }}
                        />
                      </div>
                    {errors[obj.id]?.density && (
                       <div className="error-text">{errors[obj.id].density}</div>
                     )}
                    </div>

                    <div className="detail-row">
                      <div className="detail-key">Infinite</div>
                      <div className="detail-value">
                        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={obj.infinite || false}
                            onChange={(e) => updateObject?.(obj.id, { infinite: e.target.checked })}
                           onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Rotation (degrees) */}
                {Array.isArray(obj.rotation) && obj.rotation.length === 3 && (
                  <div className="detail-row">
                    <div className="detail-key">Rotation (deg)</div>
                    <div className="detail-value" style={{ display: "flex", gap: 6 }}>
                      {['θx','θy','θz'].map((label, i) => (
                        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{label}</div>
                          <input
                            min={ANGLE_MIN}
                            max={ANGLE_MAX}
                            type="number"
                            inputMode="decimal"
                            step={1}
                            defaultValue={formatFixed((obj.rotation[i] ?? 0) * 180 / Math.PI, 2)}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (isPartial(v)) return;
                              let n = parseNum(v);
                              const c = clampAngle(n);
                              if(isPartial(v)) return;
                              commitRotation(obj, i, n);
                              if (n !== c) e.target.value = formatFixed(c, 2);
                            }}
                            onBlur={(e) => {
                              const v = e.target.value;
                              let n = clampAngle(parseNum(isPartial(v) ? 0 : v));
    
                              if(isPartial(v)) return;
                              commitRotation(obj, i, n);
                              e.target.value = formatFixed(n, 2);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 72, padding: "4px 8px" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* end Rotation */}

                {/* Actions */}
                <div className="detail-row">
                  <div className="detail-key">Actions</div>
                  <div className="detail-value" style={{ display: "flex", gap: 8 }}>
                    <button onClick={(e) => { e.stopPropagation(); onRemove(obj.id, obj.name); }} style={{ padding: "6px 8px" }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}


