import React, { useState, useEffect } from "react";
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
export default function ObjectList({ items = [], updateObject, removeObject }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

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

  // Inline number input: usa input type="number" (native spinners inside)
  // mantém comportamento de permitir "-" / vazio e atualiza em tempo real quando válido.
  function InlineNumberInput({ value, onCommit, step = 0.01, style }) {
    const [str, setStr] = useState(value === undefined || value === null ? "" : String(value));

    useEffect(() => {
      setStr(value === undefined || value === null ? "" : String(value));
    }, [value]);

    const parseCandidate = (s) => {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : null;
    };

    const handleChange = (e) => {
      const s = e.target.value;
      setStr(s);
      const n = parseCandidate(s);
      if (n !== null) onCommit(n);
    };

    const commitOnFinish = () => {
      if (str === "" || str === "-") {
        onCommit(0);
        setStr("0");
        return;
      }
      const n = parseCandidate(str);
      if (n !== null) onCommit(n);
      else {
        onCommit(0);
        setStr("0");
      }
    };

    const stepNum = Number(step) || 0.01;
    const current = parseCandidate(str) ?? (Number.isFinite(value) ? value : 0);

    const doInc = () => {
      const next = Math.round((current + stepNum) * 100000) / 100000;
      setStr(String(next));
      onCommit(next);
    };
    const doDec = () => {
      const next = Math.round((current - stepNum) * 100000) / 100000;
      setStr(String(next));
      onCommit(next);
    };

    return (
      <input
        type="number"
        inputMode="decimal"
        value={str}
        onChange={handleChange}
        onBlur={commitOnFinish}
        step={stepNum}
        style={{ width: 84, padding: "4px 8px", ...style }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitOnFinish();
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            doInc();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            doDec();
          }
        }}
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

  return (
    <ul className="object-list">
      {items.map((obj) => (
        <li key={obj.id} className="object-row-wrapper">
          <div
            className="object-row"
            role="button"
            tabIndex={0}
            onClick={() => toggle(obj.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(obj.id);
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


