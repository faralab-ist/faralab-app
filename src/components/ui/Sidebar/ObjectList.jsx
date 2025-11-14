import React, { useState, useEffect, useRef } from "react";
import "./Sidebar.css";

/*
  ObjectList simplified:
  - Position: same behaviour as ObjectPopup (clamp, local buffer, wheel).
  - Intensity / charge_density: soft range [-5,5]; show error, commit only when valid.
*/

export default function ObjectList({
  items = [],
  updateObject,
  removeObject,
  expandId = null,
  hoveredId,
  selectedId,
  setSelectedId // (id|null) => void
}) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));
  const handleRowClick = (obj) => {
    toggle(obj.id);
    if (typeof setSelectedId === 'function') {
      setSelectedId(selectedId === obj.id ? null : obj.id);
    }
  };

  const POS_MIN = -10, POS_MAX = 10;
  const INT_MIN = -5, INT_MAX = 5;

  // Local input states per object
  const [posInputs, setPosInputs] = useState({});          // { id: { x,y,z } }
  const [valInputs, setValInputs] = useState({});          // { id: raw string }
  const [errors, setErrors]     = useState({});            // { id: error msg }

  // Refs for position inputs to avoid overwriting while focused
  const posRefs = useRef({}); // { id: { x:ref, y:ref, z:ref } }

  const clamp2 = (s) => {
    if (s === '' || s === '-' || s === '.' || s === '-.') return s;
    return s.replace(/^(-?\d+)(\.(\d{0,2})?)?.*$/, (_, i, dec='') => i + dec);
  };
  const toNum = (s) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  // Initialize missing local states
  useEffect(() => {
    setPosInputs(prev => {
      const next = { ...prev };
      items.forEach(obj => {
        if (!next[obj.id]) {
          const p = obj.position || [0,0,0];
            next[obj.id] = {
              x: p[0].toFixed(2),
              y: p[1].toFixed(2),
              z: p[2].toFixed(2)
            };
        }
      });
      return next;
    });
    setValInputs(prev => {
      const next = { ...prev };
      items.forEach(obj => {
        if (next[obj.id] == null) {
          const field = obj.type === 'charge' ? 'charge' : 'charge_density';
          const v = obj[field];
          next[obj.id] = (v === 0 || v == null) ? '' : String(v);
        }
      });
      return next;
    });
  }, [items]);

  // Sync position from external changes unless that axis input is focused
  useEffect(() => {
    setPosInputs(prev => {
      const next = { ...prev };
      items.forEach(obj => {
        const p = obj.position || [0,0,0];
        const refs = posRefs.current[obj.id];
        if (!next[obj.id]) next[obj.id] = { x:'0.00', y:'0.00', z:'0.00' };
        if (!(document.activeElement === refs?.x?.current)) next[obj.id].x = p[0].toFixed(2);
        if (!(document.activeElement === refs?.y?.current)) next[obj.id].y = p[1].toFixed(2);
        if (!(document.activeElement === refs?.z?.current)) next[obj.id].z = p[2].toFixed(2);
      });
      return next;
    });
  }, [items.map(o => o.position).join('|')]); // crude dep

  const commitAxis = (obj, axis, raw) => {
    const idx = { x:0, y:1, z:2 }[axis];
    const newPos = [...(obj.position || [0,0,0])];
    newPos[idx] = Math.max(POS_MIN, Math.min(POS_MAX, toNum(raw)));
    updateObject(obj.id, { position: newPos });
  };

  const handlePosChange = (obj, axis, value) => {
    const clamped = clamp2(value);
    setPosInputs(prev => ({ ...prev, [obj.id]: { ...(prev[obj.id]||{}), [axis]: clamped } }));
    // allow empty / partial tokens while editing
    if (clamped === '' || clamped === '-' || clamped === '.' || clamped === '-.') return;
    commitAxis(obj, axis, clamped);
  };

  const handlePosBlur = (obj, axis) => {
    const raw = posInputs[obj.id]?.[axis] ?? '';
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
      // normalize empty/partial to 0 on blur
      setPosInputs(prev => ({ ...prev, [obj.id]: { ...(prev[obj.id]||{}), [axis]: '0.00' } }));
      commitAxis(obj, axis, '0');
      return;
    }
    const n = toNum(raw);
    const s = Math.max(POS_MIN, Math.min(POS_MAX, n)).toFixed(2);
    setPosInputs(prev => ({ ...prev, [obj.id]: { ...(prev[obj.id]||{}), [axis]: s } }));
    commitAxis(obj, axis, s);
  };

  const handleWheelPos = (obj, axis, e) => {
    e.preventDefault();
    const curRaw = posInputs[obj.id]?.[axis];
    const cur = (curRaw === '' || curRaw === '-' || curRaw === '.' || curRaw === '-.')
      ? 0
      : toNum(curRaw ?? '0');
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    const n = +(cur + delta).toFixed(2);
    const s = Math.max(POS_MIN, Math.min(POS_MAX, n)).toFixed(2);
    setPosInputs(prev => ({ ...prev, [obj.id]: { ...(prev[obj.id]||{}), [axis]: s } }));
    commitAxis(obj, axis, s);
  };

  // Intensity / density
  const validateSoft = (obj, n) => {
    if (!Number.isFinite(n)) return 'Invalid number.';
    if (n < INT_MIN || n > INT_MAX)
      return `Please keep the ${obj.type === 'charge' ? 'intensity' : 'density'} between ${INT_MIN} and ${INT_MAX}.`;
    return '';
  };

  const handleValChange = (obj, value) => {
    setValInputs(prev => ({ ...prev, [obj.id]: value }));
    if (value === '') { setErrors(prev => ({ ...prev, [obj.id]: '' })); return; }
    const n = parseFloat(value);
    const err = validateSoft(obj, n);
    setErrors(prev => ({ ...prev, [obj.id]: err }));
    if (!err) {
      const field = obj.type === 'charge' ? 'charge' : 'charge_density';
      updateObject?.(obj.id, { [field]: +n.toFixed(2) });
    }
  };

  const handleValBlur = (obj) => {
    const raw = valInputs[obj.id] ?? '';
    if (raw === '') {
      setValInputs(prev => ({ ...prev, [obj.id]: '0' }));
      setErrors(prev => ({ ...prev, [obj.id]: '' }));
      const field = obj.type === 'charge' ? 'charge' : 'charge_density';
      updateObject?.(obj.id, { [field]: 0 });
      return;
    }
    const n = parseFloat(raw);
    const err = validateSoft(obj, n);
    setErrors(prev => ({ ...prev, [obj.id]: err }));
    if (!err) {
      setValInputs(prev => ({ ...prev, [obj.id]: n.toFixed(2) }));
      const field = obj.type === 'charge' ? 'charge' : 'charge_density';
      updateObject?.(obj.id, { [field]: +n.toFixed(2) });
    }
  };

  const handleWheelVal = (obj, e) => {
    e.preventDefault();
    const field = obj.type === 'charge' ? 'charge' : 'charge_density';
    const baseLocal = parseFloat(valInputs[obj.id]);
    const base = Number.isFinite(baseLocal) ? baseLocal : (Number(obj[field]) || 0);
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const next = +(base + delta).toFixed(2);
    setValInputs(prev => ({ ...prev, [obj.id]: String(next) }));
    const err = validateSoft(obj, next);
    setErrors(prev => ({ ...prev, [obj.id]: err }));
    if (!err) updateObject?.(obj.id, { [field]: next });
  };

  const setPositionElem = (id, idx, v) => {
    const obj = items.find(it => it.id === id);
    if (!obj) return;
    const arr = Array.isArray(obj.position) ? [...obj.position] : [0,0,0];
    arr[idx] = Number.isFinite(v) ? v : 0;
    updateObject?.(id, { position: arr });
  };

  useEffect(() => {
    if (expandId) {
      setExpanded(s => ({ ...s, [expandId]: true }));
      setTimeout(() => {
        const el = document.querySelector(`[data-objid="${expandId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [expandId]);

  const onRemove = (id, name) => {
    if (!removeObject) return;
    if (window.confirm(`Remove "${name || id}" from scene?`)) removeObject(id);
  };

  return (
    <ul className="object-list">
      {items.map(obj => {
        if (!posRefs.current[obj.id]) {
          posRefs.current[obj.id] = { x: React.createRef(), y: React.createRef(), z: React.createRef() };
        }
        return (
          <li key={obj.id} className="object-row-wrapper" data-objid={obj.id}>
            <div
              className={`object-row ${hoveredId === obj.id || selectedId === obj.id ? 'hovered' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleRowClick(obj)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(obj); }
              }}
            >
              <span className={`pill ${obj.type}`}>{obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}</span>
              <span className="name">{obj.name || obj.id}</span>
              <div
                className="expand-btn"
                onClick={(e) => { e.stopPropagation(); toggle(obj.id); }}
              >
                {expanded[obj.id] ? '▾' : '▸'}
              </div>
            </div>

            {expanded[obj.id] && (
              <div className="object-details">
                <div className="details-grid">
                  {Array.isArray(obj.position) && obj.position.length === 3 && (
                    <div className="detail-row">
                      <div className="detail-key">Position</div>
                      <div className="detail-value" style={{ display: 'flex', gap: 6 }}>
                        <input
                          ref={posRefs.current[obj.id].x}
                          type="number"
                          step={0.01}
                          value={posInputs[obj.id]?.x ?? obj.position[0].toFixed(2)}
                          onChange={(e) => handlePosChange(obj, 'x', e.target.value)}
                          onBlur={() => handlePosBlur(obj, 'x')}
                          onWheel={(e) => handleWheelPos(obj, 'x', e)}
                          onKeyDown={(e)=>{ if(e.key==='Enter'){ handlePosBlur(obj,'x'); e.currentTarget.blur(); } }}
                          onMouseDown={e=>e.stopPropagation()}
                          onClick={e=>e.stopPropagation()}
                          style={{ width:60, padding:'4px 8px' }}
                        />
                        <input
                          ref={posRefs.current[obj.id].y}
                          type="number"
                          step={0.01}
                          value={posInputs[obj.id]?.y ?? obj.position[1].toFixed(2)}
                          onChange={(e) => handlePosChange(obj, 'y', e.target.value)}
                          onBlur={() => handlePosBlur(obj, 'y')}
                          onWheel={(e) => handleWheelPos(obj, 'y', e)}
                          onKeyDown={(e)=>{ if(e.key==='Enter'){ handlePosBlur(obj,'y'); e.currentTarget.blur(); } }}
                          onMouseDown={e=>e.stopPropagation()}
                          onClick={e=>e.stopPropagation()}
                          style={{ width:60, padding:'4px 8px' }}
                        />
                        <input
                          ref={posRefs.current[obj.id].z}
                          type="number"
                          step={0.01}
                          value={posInputs[obj.id]?.z ?? obj.position[2].toFixed(2)}
                          onChange={(e) => handlePosChange(obj, 'z', e.target.value)}
                          onBlur={() => handlePosBlur(obj, 'z')}
                          onWheel={(e) => handleWheelPos(obj, 'z', e)}
                          onKeyDown={(e)=>{ if(e.key==='Enter'){ handlePosBlur(obj,'z'); e.currentTarget.blur(); } }}
                          onMouseDown={e=>e.stopPropagation()}
                          onClick={e=>e.stopPropagation()}
                          style={{ width:60, padding:'4px 8px' }}
                        />
                      </div>
                    </div>
                  )}

                  {obj.type === 'charge' && (
                    <div className="detail-row">
                      <div className="detail-key">Intensity C</div>
                      <div className="detail-value">
                        <div className="inline-input-wrapper" style={{ width:140 }}>
                          <input
                            type="number"
                            step={0.1}
                            value={valInputs[obj.id] ?? (obj.charge === 0 ? '' : String(obj.charge))}
                            onChange={(e) => handleValChange(obj, e.target.value)}
                            onBlur={() => handleValBlur(obj)}
                            onWheel={(e) => handleWheelVal(obj, e)}
                            onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); } }}
                            onMouseDown={e=>e.stopPropagation()}
                            onClick={e=>e.stopPropagation()}
                            className={errors[obj.id] ? 'has-error' : ''}
                            style={{ width:'100%', padding:'4px 8px' }}
                          />
                          {errors[obj.id] && <div className="input-error">{errors[obj.id]}</div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {(obj.type === 'plane' || obj.type === 'wire') && (
                    <>
                      <div className="detail-row">
                        <div className="detail-key">{obj.type === 'plane' ? 'Superficial σ' : 'Linear λ'}</div>
                        <div className="detail-value">
                          <div className="inline-input-wrapper" style={{ width:140 }}>
                            <input
                              type="number"
                              step={0.1}
                              value={valInputs[obj.id] ?? (obj.charge_density === 0 ? '' : String(obj.charge_density))}
                              onChange={(e) => handleValChange(obj, e.target.value)}
                              onBlur={() => handleValBlur(obj)}
                              onWheel={(e) => handleWheelVal(obj, e)}
                              onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); } }}
                              onMouseDown={e=>e.stopPropagation()}
                              onClick={e=>e.stopPropagation()}
                              className={errors[obj.id] ? 'has-error' : ''}
                              style={{ width:'100%', padding:'4px 8px' }}
                            />
                            {errors[obj.id] && <div className="input-error">{errors[obj.id]}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="detail-row">
                        <div className="detail-key">Infinite</div>
                        <div className="detail-value">
                          <label style={{ display:'inline-flex', gap:8, alignItems:'center' }}>
                            <input
                              type="checkbox"
                              checked={obj.infinite || false}
                              onChange={(e)=>updateObject?.(obj.id,{ infinite:e.target.checked })}
                              onMouseDown={e=>e.stopPropagation()}
                              onClick={e=>e.stopPropagation()}
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="detail-row">
                    <div className="detail-key">Actions</div>
                    <div className="detail-value" style={{ display:'flex', gap:8 }}>
                      <button
                        onClick={() => onRemove(obj.id, obj.name)}
                        style={{ padding:'6px 8px' }}
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
      })}
    </ul>
  );
}
