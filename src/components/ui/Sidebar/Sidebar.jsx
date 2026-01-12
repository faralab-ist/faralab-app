import React, { useState, useEffect, useRef } from "react";
import ObjectList from "./ObjectList";
import "./Sidebar.css";
import PosChargeIcon from "../../../assets/pos_charge.svg";
import NegChargeIcon from "../../../assets/neg_charge.svg";
import LowercaseQIcon from "../../../assets/lowercase_q2.svg"
import WireIcon from "../../../assets/wire.svg";
import SphereIcon from "../../../assets/sphere.svg";
import CuboidIcon from "../../../assets/cuboid.svg";
import CylinderIcon from "../../../assets/cylinder.svg";
import PlaneIcon from "../../../assets/plane.svg";
import ChargeSphereIcon from "../../../assets/charge_sphere.svg";
import RingCoilIcon from "../../../assets/ring_coil.svg";
import PolygonCoilIcon from "../../../assets/polygon_coil.svg";
import PathIcon from "../../../assets/path1.svg";
import BarMagnetIcon from "../../../assets/bar_magnet.svg";
import SolenoidIcon from "../../../assets/solenoid.svg";
import FaradayCoilIcon from "../../../assets/faraday_coil.svg";
import TestCoilIcon from "../../../assets/test_coil.svg";

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
  // --- Esferas e Fios ---
  addRadiusToChargedSphere,
  setRadiusToChargedSphere,
  removeLastRadiusFromChargedSphere,
  setMaterialForLayerInChargedSphere,
  setDielectricForLayerInChargedSphere,
  setChargeForLayerInChargedSphere,
  // --- Planos ---
  addPlaneToStackedPlanes,
  removeLastPlaneFromStackedPlanes,
  setSpacingForStackedPlanes,
  setChargeDensityForPlaneInStackedPlanes,
  // path
  addPointToPath,
  removeLastPointFromPath,
  setPointInPath,
  changePathChargeCount,
  changePathCharge,
  changePathVelocity,
  showFlux,

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

  

  const pillObjects = (objects || []).filter(o => 
    ['testCoil', 'path', 'charge', 'testPointCharge','wire', 'plane', 'surface','chargedSphere', 'stackedPlanes', 'concentricSpheres', 'concentricInfWires', 'coil', 'barMagnet','testCoil', 'faradayCoil'].includes(o.type));
  const typeCounters = {};
  const subtypeCounters = {};

  const minibarItems = pillObjects.map((o) => {
    if (o.type === 'coil') {
      const coilType = o.coilType === 'ring' ? 'ringCoil' : o.coilType === 'polygon' ? 'polygonCoil' : o.coilType === 'solenoid' ? 'solenoid' : 'ringCoil';
      typeCounters[coilType] = (typeCounters[coilType] || 0) + 1;
      const label = `${coilType === 'ringCoil' ? 'Ring Coil' : coilType === 'polygonCoil' ? 'Polygon Coil' : 'Solenoid'} ${typeCounters[coilType]}`;
      return { id: o.id, type: coilType, subtype: null, label, name: o.name, obj: o };
    } else if (o.type === 'surface') {
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
                // const chargeClass = item.type === 'charge' ? (isNegativeCharge ? 'negative' : 'positive') : '';
                return (
                  <button
                    key={item.id}
                    className={`${
                      ['pos_charge','neg_charge','testPointCharge','wire','plane','surface','charged_sphere', 'stackedPlanes','concentricSpheres', 'concentricInfWires', 'ringCoil', 'polygonCoil', 'solenoid', 'barMagnet', 'faradayCoil', 'testCoil', 'path'].includes(item.type)
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
                    aria-label={item.name || item.label} 
                  >
                    {item.type === 'pos_charge' ? (
                      <img src={PosChargeIcon} alt="Positive Charge" className="sidebar-icon" />
                    ) : item.type === 'neg_charge' ? (
                      <img src={NegChargeIcon} alt="Negative Charge" className="sidebar-icon" />
                    ) : item.type === 'testPointCharge' ? (
                      <img src={LowercaseQIcon} alt="Test Charge" className="sidebar-icon" />
                    ) : item.type === 'wire' ? (
                      <img src={WireIcon} alt="Wire" className="sidebar-icon" />
                    ) : item.type === 'concentricInfWires' ? (
                      <img src={WireIcon} alt="Concentric Wires" className="sidebar-icon" />  
                    ) : item.type === 'plane' ? (
                      <img src={PlaneIcon} alt="Plane" className="sidebar-icon" />
                    ) : item.type === 'stackedPlanes' ? (
                      <img src={PlaneIcon} alt="StackedPlanes" className="sidebar-icon" />  
                    ) : item.type === 'charged_sphere' ? (
                      <img src={ChargeSphereIcon} alt="Charged Sphere" className="sidebar-icon" />
                    ) : item.type === 'concentricSpheres' ? (
                      <img src={ChargeSphereIcon} alt="Concentric Spheres" className="sidebar-icon" />  
                    ) : item.subtype === 'sphere' ? (
                      <img src={SphereIcon} alt="Sphere" className="sidebar-icon" />
                    ) : item.subtype === 'cuboid' ? (
                      <img src={CuboidIcon} alt="Cuboid" className="sidebar-icon" />
                    ) : item.subtype === 'cylinder' ? (
                      <img src={CylinderIcon} alt="Cylinder" className="sidebar-icon" />
                    ) : item.type === 'ringCoil' ? (
                      <img src={RingCoilIcon} alt="Ring Coil" className="sidebar-icon" />
                    ) : item.type === 'polygonCoil' ? (
                      <img src={PolygonCoilIcon} alt="Polygon Coil" className="sidebar-icon" />
                    ) : item.type === 'solenoid' ? (
                      <img src={SolenoidIcon} alt="Solenoid" className="sidebar-icon" />
                    ) : item.type === 'barMagnet' ? (
                      <img src={BarMagnetIcon} alt="Bar Magnet" className="sidebar-icon" />
                    ) : item.type === 'faradayCoil' ? (
                      <img src={FaradayCoilIcon} alt="Faraday Coil" className="sidebar-icon" />
                    ) : item.type === 'testCoil' ? (
                      <img src={TestCoilIcon} alt="Test Coil" className="sidebar-icon" />
                    ) : item.type === 'path' ? (
                      <img src={PathIcon} alt="Path" className="sidebar-icon" />
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
              showFlux={showFlux}
              updateObject={updateObject}
              removeObject={removeObject}
              expandId={expandId}
              minimized={minimized}
              hoveredId={hoveredId}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onHoverStart={hoverStart}
              onHoverEnd={hoverEnd}
              
              // --- Esferas ---
              addRadiusToChargedSphere={addRadiusToChargedSphere}
              removeLastRadiusFromChargedSphere={removeLastRadiusFromChargedSphere}
              setRadiusToChargedSphere={setRadiusToChargedSphere}
              setMaterialForLayerInChargedSphere={setMaterialForLayerInChargedSphere}
              setDielectricForLayerInChargedSphere={setDielectricForLayerInChargedSphere}
              setChargeForLayerInChargedSphere={setChargeForLayerInChargedSphere}
              
              // --- Planos ---
              addPlaneToStackedPlanes={addPlaneToStackedPlanes}
              removeLastPlaneFromStackedPlanes={removeLastPlaneFromStackedPlanes}
              setSpacingForStackedPlanes={setSpacingForStackedPlanes}
              setChargeDensityForPlaneInStackedPlanes={setChargeDensityForPlaneInStackedPlanes}

              // --- Fios ---
              addRadiusToConcentricInfiniteWire={addRadiusToChargedSphere}
              removeLastRadiusFromConcentricInfiniteWire={removeLastRadiusFromChargedSphere}
              setRadiusToConcentricInfiniteWire={setRadiusToChargedSphere}
              setMaterialForLayerInConcentricInfiniteWire={setMaterialForLayerInChargedSphere}
              setDielectricForLayerInConcentricInfiniteWire={setDielectricForLayerInChargedSphere}
              setChargeForLayerInConcentricInfiniteWire={setChargeForLayerInChargedSphere}

              // --- Path ---
              addPointToPath={addPointToPath}
              removeLastPointFromPath={removeLastPointFromPath}
              setPointInPath={setPointInPath}
              changePathChargeCount={changePathChargeCount}
              changePathCharge={changePathCharge}
              changePathVelocity={changePathVelocity}
            />
          </div>
        )}
      </div>
    </div>
  );
}