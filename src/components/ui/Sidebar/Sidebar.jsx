import React, { useState, useEffect } from "react";
import ObjectList from "./ObjectList";
import "./Sidebar.css";

/**
 * Sidebar agora suporta 3 estados:
 * - open: painel completo visível (isOpen === true)
 * - minimized: painel reduzido mostrando só as pills (isOpen === false && counts.total > 0)
 * - closed: completamente escondido (isOpen === false && counts.total === 0)
 *
 * Clicar numa pill ou na setinha abre o painel completo.
 */
export default function Sidebar({ 
  objects, 
  counts = {},
  isOpen, 
  setIsOpen, 
  updateObject, 
  removeObject, 
  onMinimizedChange, 
  hoveredId,
   }) {
  const [expandId, setExpandId] = useState(null);

  const hasObjects = (counts?.total ?? 0) > 0;
  const minimized = !isOpen && hasObjects;

  // notify parent / other logic whenever minimized changes
  useEffect(() => {
    if (typeof onMinimizedChange === "function") onMinimizedChange(minimized);
  }, [minimized, onMinimizedChange]);

  const togglePanel = () => setIsOpen((p) => !p);
  const openPanel = (idToOpen = null) => {
    if (idToOpen) setExpandId(idToOpen);
    setIsOpen?.(true);
  };

  // helper para detectar subtype em nomes de campo comuns
  const detectSubtype = (o) => {
    if (!o) return null;
    const candidates = ['subtype'];

    if (o.name && typeof o.name === 'string') {
      const n = o.name.toLowerCase();
      if (n.includes('cuboid') || n.includes('box')) return 'cuboid';
      if (n.includes('sphere') || n.includes('ball')) return 'sphere';
      if (n.includes('cylinder')) return 'cylinder';
    }

    return null;
  };

  const pillObjects = (objects || []).filter(o => ['charge', 'wire', 'plane', 'surface'].includes(o.type));

  const typeCounters = {};
  const subtypeCounters = {};

  const minibarItems = pillObjects.map((o) => {
    if (o.type === 'surface') {
      const raw = detectSubtype(o);
      const subtype = raw || 'surface';
      subtypeCounters[subtype] = (subtypeCounters[subtype] || 0) + 1;
      const label = `${subtype.charAt(0).toUpperCase() + subtype.slice(1)} ${subtypeCounters[subtype]}`;
      return { id: o.id, type: 'surface', subtype, label, name: o.name };
    } else {
      const t = o.type;
      typeCounters[t] = (typeCounters[t] || 0) + 1;
      const label = `${t.charAt(0).toUpperCase() + t.slice(1)} ${typeCounters[t]}`;
      return { id: o.id, type: t, subtype: null, label, name: o.name };
    }
  });

  return (
    <div className={`sidebar-wrap ${isOpen ? "open" : minimized ? "minimized" : "closed"}`}>
      <button
        className="toggle-tab"
        aria-label={isOpen ? "Close panel" : "Open panel"}
        onClick={togglePanel}
        title={isOpen ? "Close" : "Open"}
      >
        {isOpen ? ">" : "<"}
      </button>

      <div className={`sidebar ${isOpen ? "open" : minimized ? "minimized" : "closed"}`}>
        {/* Minimized view: show individual pills (one per object) */}
        {minimized ? (
          <div className="minibar" role="group" aria-label="Objects quick bar">
            {minibarItems.length === 0 ? (
              <div className="muted">No objects</div>
            ) : (
              minibarItems.map((item) => (
                <button
                  key={item.id}
                  className={`pill ${item.subtype || item.type} minibar-pill ${hoveredId === item.id ? 'hovered' : ''}`}
                  onClick={() => openPanel(item.id)}
                  title={item.name || item.label}
                >
                  <strong>{item.label}</strong>
                </button>
              ))
            )}
          </div>
        ) : (
          // Full panel content
          <div className="panel-content">
            <header className="panel-header">
              <div className="header-left">
                <h3 className="panel-title">Panel</h3>
                <p className="panel-sub">Manage scene objects</p>
              </div>
              <div className="header-pills">
                <span className="pill objects">
                  <strong>Objects</strong>
                  <span className="count">{counts.total}</span>
                </span>
                <span className="pill surface">
                  <strong>Surface</strong>
                  <span className="count">{counts.surface}</span>
                </span>
              </div>
            </header>

            <ObjectList
              items={objects}
              updateObject={updateObject}
              removeObject={removeObject}
              expandId={expandId}
              minimized={minimized}           /* pass to child if needed */
              hoveredId ={hoveredId}
            />
          </div>
        )}
      </div>
    </div>
  );
}



