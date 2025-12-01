import React, { useState, useEffect } from "react";
import ObjectItem from "./ObjectItem";
import "./Sidebar.css"; // Certifica-te que copiaste o CSS para aqui

export default function ObjectList({ 
  items = [], 
  updateObject, 
  removeObject, 
  expandId = null,
  hoveredId,
  setHoveredId, // Corrigido para receber o setter do pai se existir, ou podes gerir localmente
  selectedId,
  setSelectedId,
  addPlaneToStackedPlanes,
  removeLastPlaneFromStackedPlanes,
  setSpacingForStackedPlanes,
  setChargeDensityForPlaneInStackedPlanes,
  addRadiusToChargedSphere, 
  removeLastRadiusFromChargedSphere,
  setRadiusToChargedSphere,           
  setMaterialForLayerInChargedSphere,
  setDielectricForLayerInChargedSphere,
  setChargeForLayerInChargedSphere,
  addRadiusToConcentricInfiniteWire, 
  removeLastRadiusFromConcentricInfiniteWire,
  setRadiusToConcentricInfiniteWire,
  setMaterialForLayerInConcentricInfiniteWire,
  setDielectricForLayerInConcentricInfiniteWire,
  setChargeForLayerInConcentricInfiniteWire,
  ...rest
}) {
  const [expandedMap, setExpandedMap] = useState({});

  // Expandir automaticamente via props (ex: ao clicar no canvas 3D)
  useEffect(() => {
    if (!expandId) return;
    setExpandedMap((s) => ({ ...s, [expandId]: true }));
    
    // Pequeno delay para garantir que o DOM renderizou antes do scroll
    setTimeout(() => {
      const el = document.querySelector(`[data-objid="${expandId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }, [expandId]);

  const toggleExpand = (id) => {
    setExpandedMap(prev => {
        const isOpen = !!prev[id];
        const next = { ...prev, [id]: !isOpen };
        
        // Sincronizar com a seleção externa (opcional, baseado no teu código original)
        if (!isOpen && setSelectedId) setSelectedId(id);
        else if (isOpen && setSelectedId && selectedId === id) setSelectedId(null);
        
        return next;
    });
  };

  if (!items?.length) {
    return (
      <div className="object-list-empty" style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
        No objects yet
      </div>
    );
  }

  return (
    <ul className="object-list">
      {items.map((obj) => (
        <ObjectItem
          key={obj.id}
          obj={obj}
          expanded={!!expandedMap[obj.id]}
          hovered={hoveredId === obj.id}
          toggleExpand={toggleExpand}
          setHoveredId={setHoveredId} // Se não passares isto como prop no pai, remove aqui
          updateObject={updateObject}
          removeObject={removeObject}

          stackedPlaneActions={{
            addPlane: addPlaneToStackedPlanes,
            removeLastPlane: removeLastPlaneFromStackedPlanes,
            setSpacing: setSpacingForStackedPlanes,
            setChargeDensity: setChargeDensityForPlaneInStackedPlanes
          }}

          concentricActions={{
            addLayer: addRadiusToChargedSphere, 
            removeLastLayer: removeLastRadiusFromChargedSphere,
            setRadius: setRadiusToChargedSphere,
            setMaterial: setMaterialForLayerInChargedSphere,
            setDielectric: setDielectricForLayerInChargedSphere,
            setCharge: setChargeForLayerInChargedSphere
          }}

          // Ações para Concentric Wires
          concentricWireActions={{
            addLayer: addRadiusToConcentricInfiniteWire, 
            removeLastLayer: removeLastRadiusFromConcentricInfiniteWire,
            setRadius: setRadiusToConcentricInfiniteWire,
            setMaterial: setMaterialForLayerInConcentricInfiniteWire,
            setDielectric: setDielectricForLayerInConcentricInfiniteWire,
            setCharge: setChargeForLayerInConcentricInfiniteWire
          }}
        />
      ))}
    </ul>
  );
}