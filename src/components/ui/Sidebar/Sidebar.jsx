import React, { useState, useEffect, useRef } from "react";
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
  selectedId,
  setSelectedId,
}) {
  const [expandId, setExpandId] = useState(null);
  const sidebarRootRef = useRef(null)

  const hasObjects = (counts?.total ?? 0) > 0;
  const minimized = !isOpen && hasObjects;

  // Sync expandId with selectedId whenever selectedId changes and sidebar is open
  useEffect(() => {
    if (selectedId) {
      setExpandId(selectedId);
      // If sidebar is closed, open it
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  }, [selectedId, isOpen, setIsOpen]);

  // notify parent / other logic whenever minimized changes
  useEffect(() => {
    if (typeof onMinimizedChange === "function") onMinimizedChange(minimized);
  }, [minimized, onMinimizedChange]);

  
  useEffect(() => {
    if (selectedId) {
      setExpandId(selectedId);
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  }, [selectedId, isOpen, setIsOpen])

  const togglePanel = () => {setIsOpen((p) => !p); setExpandId(null) };
  const openPanel = (idToOpen = null) => {
    if (idToOpen) setExpandId(idToOpen);
    setIsOpen?.(true);
  };
  const handleRowClick = (item) => {
    if (typeof setSelectedId === 'function') {
      setSelectedId(selectedId === item.id ? null : item.id);
    }
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

  const pillObjects = (objects || []).filter(o => ['charge', 'wire', 'plane', 'surface','chargedSphere'].includes(o.type));

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
      if (t === 'chargedSphere') { //Shouldn't be hardcoded, but for now it works :)
        const label = `Charged Sphere ${typeCounters[t]}`
        return { id: o.id, type: t, subtype: null, label, name: o.name };
      }
      const label = `${t.charAt(0).toUpperCase() + t.slice(1)} ${typeCounters[t]}`;
      return { id: o.id, type: t, subtype: null, label, name: o.name };
    }
  });

  useEffect(() => {
    const onDocMouseDown = (e) => {
      // if sidebar is not open, do nothing
      if (!isOpen) return
      const sidebarEl = sidebarRootRef.current
      if (!sidebarEl) return
      // allow clicks inside sidebar
      if (sidebarEl.contains(e.target)) return
      // allow clicks inside settings window (class used by SettingsButtons)
      const settingsEl = document.querySelector('.settings-buttons-root')
      if (settingsEl && settingsEl.contains(e.target)) return
      // outside click -> close sidebar
      setIsOpen?.(false)
      setExpandId(null)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [isOpen, setIsOpen])
  
  const effectiveClass = isOpen ? "open" : minimized ? "minimized" : "closed";

  return (
    <div ref={sidebarRootRef} className={`sidebar-wrap ${effectiveClass}`}>
       <button
         className="toggle-tab"
         aria-label={isOpen ? "Close panel" : "Open panel"}
         onClick={togglePanel}
         title={isOpen ? "Close" : "Open"}
       >
         {isOpen ? ">" : "<"}
       </button>

      <div className={`sidebar ${effectiveClass}`}>
        {/* Minimized view: show individual pills (one per object) */}
        {minimized ? (
          <div className="minibar" role="group" aria-label="Objects quick bar">
            {minibarItems.length === 0 ? (
              <div className="muted">No objects</div>
            ) : (
              minibarItems.map((item) => (
                <button
                  key={item.id}
                  className={`pill ${item.subtype || item.type} minibar-pill ${hoveredId === item.id || selectedId === item.id ? 'hovered' : ''}`}
                  onClick={() => {openPanel(item.id); handleRowClick(item) }}
                  
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(item); }
              }}
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
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          </div>
        )}
      </div>
    </div>
  );
}



