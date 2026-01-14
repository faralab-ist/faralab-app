import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { TYPE_CONFIG } from "./utils";
import "./Sidebar.css";

export default function DataList({ items = [], updateObject, hoveredId, setHoveredId, selectedId, setSelectedId, showFlux }) {
  const [expandedMap, setExpandedMap] = useState({});

  // Auto-expand selected object
  useEffect(() => {
    if (selectedId) {
      setExpandedMap(prev => ({ ...prev, [selectedId]: true }));
    }
  }, [selectedId]);

  const toggleExpand = (id) => {
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
    // Also select the object when expanding
    if (setSelectedId) {
      setSelectedId(id);
    }
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
        <DataListItem
          key={obj.id}
          obj={obj}
          expanded={expandedMap[obj.id]}
          hovered={hoveredId === obj.id}
          toggleExpand={toggleExpand}
          setHoveredId={setHoveredId}
          updateObject={updateObject}
          showFlux={showFlux}
        />
      ))}
    </ul>
  );
}

function DataListItem({ obj, expanded, hovered, toggleExpand, setHoveredId, updateObject, showFlux }) {
  const detailsRef = useRef(null);
  const detailsContentRef = useRef(null);
  const [detailsHeight, setDetailsHeight] = useState(0);
  
  const isSurfaceWithoutFlux = obj.type === 'surface' && !showFlux;

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

  // Get icon data
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

  return (
    <li
      className={`object-row-wrapper ${expanded ? "expanded" : ""}`}
      data-objid={obj.id}
    >
      <div
        className={`object-row ${hovered ? "hovered" : ""} ${expanded ? "selected" : ""}`}
        onClick={() => toggleExpand(obj.id)}
        onMouseEnter={() => setHoveredId(obj.id)}
        onMouseLeave={() => setHoveredId(null)}
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
          title={isSurfaceWithoutFlux ? "Enable Gaussian Surface mode to view labels" : "Toggle label visibility"}
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
          {Array.isArray(obj.labelInfo) && obj.labelInfo.length > 0 ? (
            obj.labelInfo.map((info, idx) => (
              <div key={idx} className="detail-row">
                <div className="detail-value" style={{ color: "#aaa" }}>
                  {info}
                </div>
              </div>
            ))
          ) : (
            <div className="detail-row" style={{ color: "#666" }}>
              <div className="detail-value">No label data</div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
