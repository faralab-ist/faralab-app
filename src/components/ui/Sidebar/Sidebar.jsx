import React, { useState, useEffect, useRef } from "react";
import ObjectList from "./ObjectList";
import "./Sidebar.css";
import PosChargeIcon from "../../../assets/pos_charge.svg";
import NegChargeIcon from "../../../assets/neg_charge.svg";
import WireIcon from "../../../assets/wire.svg";
import SphereIcon from "../../../assets/sphere.svg";
import CuboidIcon from "../../../assets/cuboid.svg";
import CylinderIcon from "../../../assets/cylinder.svg";
import PlaneIcon from "../../../assets/plane.svg";
import ChargeSphereIcon from "../../../assets/charge_sphere.svg";

/**
 * Sidebar agora suporta 3 estados:
 * - open: painel completo visível (isOpen === true)
 * - minimized: painel reduzido mostrando só os ícones (isOpen === false && counts.total > 0)
 * - closed: completamente escondido (isOpen === false && counts.total === 0)
 *
 * Clicar num ícone ou na setinha abre o painel completo.
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
  setHoveredId,
  selectedId,
  setSelectedId,
  addRadiusToChargedSphere,
  setRadiusToChargedSphere,
  removeLastRadiusFromChargedSphere,
  setMaterialForLayerInChargedSphere,
  setDielectricForLayerInChargedSphere,
  setChargeForLayerInChargedSphere,
  addPlaneToStackedPlanes,
  removeLastPlaneFromStackedPlanes,
  setSpacingForStackedPlanes,
  setChargeDensityForPlaneInStackedPlanes,
}) {
  const [expandId, setExpandId] = useState(null);
  const sidebarRootRef = useRef(null)

  // preserve previous selectedId while hovering
  const prevSelectedRef = useRef(null);
  const hoverStart = (id) => {
    if (typeof setHoveredId === 'function') setHoveredId(id);
  };
  const hoverEnd = () => {
    if (typeof setHoveredId === 'function') setHoveredId(prevSelectedRef.current);
  };

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

  // NEW: Open sidebar when clicking anywhere on it (minimized or closed)
  const handleSidebarClick = (e) => {
    if (!isOpen) {
      setIsOpen(true);
    }
  };
  
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
    if (!o || o.type !== 'surface') return null;

    const has = (k) => typeof o?.[k] === 'number';
    
    // Sphere: só radius
    if (has('radius') && !has('height') && !has('width') && !has('depth')) {
      return 'sphere';
    }
    // Cylinder: radius + height
    if (has('radius') && has('height') && !has('width') && !has('depth')) {
      return 'cylinder';
    }
    // Cuboid: width + height + depth
    if (has('width') && has('height') && has('depth')) {
      return 'cuboid';
    }
    
    // Fallback: check name
    if (o.name && typeof o.name === 'string') {
      const n = o.name.toLowerCase();
      if (n.includes('cuboid') || n.includes('box')) return 'cuboid';
      if (n.includes('sphere') || n.includes('ball')) return 'sphere';
      if (n.includes('cylinder')) return 'cylinder';
    }

    return 'surface';
  };

  const pillObjects = (objects || []).filter(o => ['charge', 'wire', 'plane', 'surface','chargedSphere', 'stackedPlanes', 'concentricSpheres', 'concentricInfWires'].includes(o.type));

  const typeCounters = {};
  const subtypeCounters = {};

  const minibarItems = pillObjects.map((o) => {
    if (o.type === 'surface') {
      const raw = detectSubtype(o);
      const subtype = raw || 'surface';
      subtypeCounters[subtype] = (subtypeCounters[subtype] || 0) + 1;
      const label = `${subtype.charAt(0).toUpperCase() + subtype.slice(1)} ${subtypeCounters[subtype]}`;
      return { id: o.id, type: 'surface', subtype, label, name: o.name, obj: o };
    } else if (o.type === 'charge') {
      const isNeg = o.charge < 0;
      const t = isNeg ? 'neg_charge' : 'pos_charge';
      typeCounters[t] = (typeCounters[t] || 0) + 1;
      const label = `${isNeg ? 'Negative Charge' : 'Positive Charge'} ${typeCounters[t]}`;
      return { id: o.id, type: t, subtype: null, label, name: o.name, obj: o, polarity: isNeg ? 'negative' : 'positive' };
    } else {
      const t = o.type === 'chargedSphere' ? 'charged_sphere' : o.type;
      typeCounters[t] = (typeCounters[t] || 0) + 1;
      const label = `${t.charAt(0).toUpperCase() + t.replace('_',' ').slice(1)} ${typeCounters[t]}`;
      return { id: o.id, type: t, subtype: null, label, name: o.name, obj: o };
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
      <div className={`sidebar ${effectiveClass}`} onClick={handleSidebarClick}>
        {minimized ? (
          <div className="minibar" role="group" aria-label="Objects quick bar">
            {minibarItems.length === 0 ? (
              <div className="muted">No objects</div>
            ) : (
              minibarItems.map((item) => {
                const isNegativeCharge = item.type === 'charge' && item.obj?.charge < 0;
                const chargeClass = item.type === 'charge' ? (isNegativeCharge ? 'negative' : 'positive') : '';
                return (
                  <button
                    key={item.id}
                    className={`${
                      ['pos_charge','neg_charge','wire','plane','surface','charged_sphere'].includes(item.type)
                        ? `${item.subtype || item.type}-icon-btn ${item.polarity || ''}`
                        : `pill ${item.subtype || item.type} minibar-pill`
                    } ${hoveredId === item.id || selectedId === item.id ? 'hovered' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPanel(item.id);
                      handleRowClick(item);
                    }}
                    onMouseEnter={() => hoverStart(item.id)}
                    onMouseLeave={() => hoverEnd()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(item); }
                    }}
                    aria-label={item.name || item.label} // Novo: sem tooltip visual
                  >
                    {item.type === 'pos_charge' ? (
                      <img src={PosChargeIcon} alt="Positive Charge" className="charge-icon" />
                    ) : item.type === 'neg_charge' ? (
                      <img src={NegChargeIcon} alt="Negative Charge" className="charge-icon" />
                    ) : item.type === 'wire' ? (
                      <img src={WireIcon} alt="Wire" className="wire-icon" />
                    ) : item.type === 'plane' ? (
                      <img src={PlaneIcon} alt="Plane" className="plane-icon" />
                    ) : item.type === 'charged_sphere' ? (
                      <img src={ChargeSphereIcon} alt="Charged Sphere" className="charged_sphere-icon" />
                    ) : item.subtype === 'sphere' ? (
                      <img src={SphereIcon} alt="Sphere" className="sphere-icon" />
                    ) : item.subtype === 'cuboid' ? (
                      <img src={CuboidIcon} alt="Cuboid" className="cuboid-icon" />
                    ) : item.subtype === 'cylinder' ? (
                      <img src={CylinderIcon} alt="Cylinder" className="cylinder-icon" />
                    ) : (
                      <strong>{item.label}</strong>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          // Full panel content
          <div className="panel-content">
            <header className="panel-header">
              <div className="header-left">
                <h3 className="panel-title">Panel</h3>
              </div>
            </header>

            <ObjectList
              items={objects}
              updateObject={updateObject}
              removeObject={removeObject}
              expandId={expandId}
              minimized={minimized}
              hoveredId={hoveredId}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onHoverStart={hoverStart}
              onHoverEnd={hoverEnd}
              addRadiusToChargedSphere={addRadiusToChargedSphere}
              removeLastRadiusFromChargedSphere={removeLastRadiusFromChargedSphere}
              setMaterialForLayerInChargedSphere={setMaterialForLayerInChargedSphere}
              setDielectricForLayerInChargedSphere={setDielectricForLayerInChargedSphere}
              setChargeForLayerInChargedSphere={setChargeForLayerInChargedSphere}
              addPlaneToStackedPlanes={addPlaneToStackedPlanes}
              removeLastPlaneFromStackedPlanes={removeLastPlaneFromStackedPlanes}
              setSpacingForStackedPlanes={setSpacingForStackedPlanes}
              setChargeDensityForPlaneInStackedPlanes={setChargeDensityForPlaneInStackedPlanes}
            />
          </div>
        )}
      </div>
    </div>
  );
}