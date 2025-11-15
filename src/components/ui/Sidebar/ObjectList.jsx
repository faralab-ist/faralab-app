import React, { useState, useEffect} from "react";
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
    if (window.confirm(`Remove "${name || id}" from scene?`)) removeObject(id);
  };

  // Inline number input: estado local + commit só no blur/Enter
  // Versão com estado local - mais segura para evitar re-renders
  function InlineNumberInput({ value, onCommit, step = 0.01, style }) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    // Só sincroniza quando NÃO está focado
    useEffect(() => {
      if (!isFocused) {
        setLocalValue(value);
      }
    }, [value, isFocused]);

    const handleChange = (e) => {
      setLocalValue(e.target.value);
    };

    const handleBlur = () => {
      setIsFocused(false);
      const numVal = localValue === '' ? 0 : parseFloat(localValue);
      const finalVal = isNaN(numVal) ? 0 : numVal;
      onCommit(finalVal);
      setLocalValue(finalVal);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const numVal = localValue === '' ? 0 : parseFloat(localValue);
        const finalVal = isNaN(numVal) ? 0 : numVal;
        onCommit(finalVal);
        setLocalValue(finalVal);
        e.target.blur();
      }
    };

    return (
      <input
        type="number"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        step={step}
        style={{ width: 84, padding: "4px 8px", ...style }}
      />
    );
  }

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
                    <div className="detail-key">Position</div>
                    <div className="detail-value" style={{ display: "flex", gap: 6 }}>
                      <InlineNumberInput
                        value={obj.position[0]}
                        onCommit={(v) => setPositionElem(obj.id, "position", 0, v)}
                        step={0.01}
                        style={{ width: 72 }}
                      />
                      <InlineNumberInput
                        value={obj.position[1]}
                        onCommit={(v) => setPositionElem(obj.id, "position", 1, v)}
                        step={0.01}
                        style={{ width: 72 }}
                      />
                      <InlineNumberInput
                        value={obj.position[2]}
                        onCommit={(v) => setPositionElem(obj.id, "position", 2, v)}
                        step={0.01}
                        style={{ width: 72 }}
                      />
                    </div>
                  </div>
                )}

                {/* Charge: Intensity C (same as popup) */}
                {obj.type === "charge" && (
                  <div className="detail-row">
                    <div className="detail-key">Intensity C</div>
                    <div className="detail-value">
                      <InlineNumberInput
                        value={obj.charge}
                        onCommit={(v) => updateObject?.(obj.id, { charge: v })}
                        step={0.1}
                        style={{ width: 140 }}
                      />
                    </div>
                  </div>
                )}

                {/* Plane: Superficial Charge Density σ + Infinite */}
                {obj.type === "plane" && (
                  <>
                    <div className="detail-row">
                      <div className="detail-key">Superficial Charge Density σ</div>
                      <div className="detail-value">
                        <InlineNumberInput
                          value={obj.charge_density}
                          onCommit={(v) => updateObject?.(obj.id, { charge_density: v })}
                          step={0.1}
                          style={{ width: 140 }}
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
                            onChange={(e) => updateObject?.(obj.id, { infinite: e.target.checked })}
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
                        <InlineNumberInput
                          value={obj.charge_density}
                          onCommit={(v) => updateObject?.(obj.id, { charge_density: v })}
                          step={0.1}
                          style={{ width: 140 }}
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
                            onChange={(e) => updateObject?.(obj.id, { infinite: e.target.checked })}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="detail-row">
                  <div className="detail-key">Actions</div>
                  <div className="detail-value" style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onRemove(obj.id, obj.name)} style={{ padding: "6px 8px" }}>
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


