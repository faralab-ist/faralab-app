import React, { useState, useRef, useEffect } from "react";
import { CuboidInfo, CylinderInfo, SphereInfo, ChargeInfo, WireInfo, PlaneInfo } from "./ObjectPopups";
import "./ObjectPopup.css";

export default function ObjectPopup({
  selectedObject,
  updateObject,
  removeObject,
  screenPosition,
  isMinimized,
  setIsMinimized,
  setSelectedId,
  sidebarOpen, // <- nova prop
}) {
  if (!selectedObject) return null;

  const { type } = selectedObject;

  const xRef = useRef(null)
  const yRef = useRef(null)
  const zRef = useRef(null)

  const [posInputs, setPosInputs] = useState(() => {
    const p = selectedObject.position || [0, 0, 0]
    return { x: p[0].toFixed(2), y: p[1].toFixed(2), z: p[2].toFixed(2) }
  })

  const clamp2 = (s) => {
    if (s === '' || s === '-' || s === '.' || s === '-.') return s
    return s.replace(/^(-?\d+)(\.(\d{0,2})?)?.*$/, (_, i, dec='') => i + dec)
  }
  const toNum = (s) => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : 0
  }

  const commitAxis = (axis, raw) => {
    const idx = { x:0, y:1, z:2 }[axis]
    const newPos = [...(selectedObject.position || [0,0,0])]
    // clamp to [min, max] for position inputs
    newPos[idx] = Math.max(-10, Math.min(10, toNum(raw)))
    updateObject(selectedObject.id, { position: newPos })
  }

  const handlePosChange = (axis, value) => {
    const clamped = clamp2(value)
    setPosInputs(prev => ({ ...prev, [axis]: clamped }))
    // live commit
    commitAxis(axis, clamped)
  }

  const handlePosBlur = (axis) => {
    const raw = posInputs[axis]
    const n = toNum(raw)
    setPosInputs(prev => ({ ...prev, [axis]: n.toFixed(2) }))
    commitAxis(axis, n.toFixed(2))
  }

  const handleWheel = (axis, e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.01 : -0.01
    const n = +(toNum(posInputs[axis]) + delta).toFixed(2)
    const s = n.toFixed(2)
    setPosInputs(prev => ({ ...prev, [axis]: s }))
    commitAxis(axis, s)
  }

  // On object id change: force new values & blur any focused position input
  useEffect(() => {
    const p = selectedObject.position || [0,0,0]
    setPosInputs({
      x: p[0].toFixed(2),
      y: p[1].toFixed(2),
      z: p[2].toFixed(2)
    })
    const ae = document.activeElement
    if (ae === xRef.current || ae === yRef.current || ae === zRef.current) {
      ae.blur()
    }
  }, [selectedObject.id])

  // External position changes (drag/preset) -> sync unless that input is focused
  useEffect(() => {
    const p = selectedObject.position || [0,0,0]
    setPosInputs(prev => ({
      x: document.activeElement === xRef.current ? prev.x : p[0].toFixed(2),
      y: document.activeElement === yRef.current ? prev.y : p[1].toFixed(2),
      z: document.activeElement === zRef.current ? prev.z : p[2].toFixed(2),
    }))
  }, [selectedObject.position])

  // choose specific panel...
  let SpecificPanel = null
  switch (type) {
    case 'charge':   SpecificPanel = <ChargeInfo object={selectedObject} updateObject={updateObject} />; break
    case 'wire':     SpecificPanel = <WireInfo object={selectedObject} updateObject={updateObject} />; break
    case 'plane':    SpecificPanel = <PlaneInfo object={selectedObject} updateObject={updateObject} />; break
    case 'surface':
      switch (selectedObject.surfaceType) {
        case 'sphere':  SpecificPanel = <SphereInfo object={selectedObject} updateObject={updateObject} />; break
        case 'cylinder':SpecificPanel = <CylinderInfo object={selectedObject} updateObject={updateObject} />; break
        case 'cuboid':  SpecificPanel = <CuboidInfo object={selectedObject} updateObject={updateObject} />; break
      }
      break
    default: SpecificPanel = <div>Unknown Type</div>
  }

  const sidebarWidth = 320; // px
  const sidebarExtraOffset = 70; // px — ajuste à vontade
  const totalSidebarOffset = sidebarOpen ? sidebarWidth + sidebarExtraOffset : 0;

  const style = screenPosition
    ? {
        position: "absolute",
        left: `${Math.max(8, screenPosition.left - totalSidebarOffset)}px`,
        top: `${screenPosition.top}px`,
        transform: "translate(0, 0)"
      }
    : {
        position: "absolute",
        right: sidebarOpen ? `calc(20px + ${totalSidebarOffset}px)` : "20px",
        top: "20px"
      };

  const handleToggleFixed = () => {
    updateObject(selectedObject.id, { fixed: !selectedObject.fixed })
  }

  if (isMinimized) {
    return (
      <div className="object-popup minimized" style={style}>
        <div className="popup-header">
          <span>{selectedObject.name}</span>
          <div className="popup-controls">
            <button className="icon-button" onClick={() => setIsMinimized(false)}>□</button>
            <button className="icon-button" onClick={() => setSelectedId(null)}>×</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="object-popup" style={style}>
      <div className="popup-header">
        <h3>{selectedObject.name}</h3>
        <div className="popup-controls">
          <button className="icon-button" onClick={() => setIsMinimized((v) => !v)}>_</button>
          <button className="icon-button" onClick={() => setSelectedId(null)}>×</button>
        </div>
      </div>

      <div className="popup-content">
        {type === "surface" && (
          <button className={`fixed-btn ${selectedObject.fixed ? "active" : ""}`} onClick={handleToggleFixed}>
            {selectedObject.fixed ? "Fixed ✅" : "Unfixed ⚙️"}
          </button>
        )}

        <p><b>Type:</b> {type[0].toUpperCase() + type.substr(1)}</p>

        <fieldset>
          <legend><b>Position</b></legend>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label>
              X
              <input
                key={`${selectedObject.id}-x`}
                ref={xRef}
                type="number"
                step={0.01}
                min={-10}
                max={10}
                value={posInputs.x}
                onChange={e => handlePosChange('x', e.target.value)}
                onBlur={() => handlePosBlur('x')}
                onWheel={e => handleWheel('x', e)}
                onKeyDown={e => { if (e.key === 'Enter'){ handlePosBlur('x'); e.currentTarget.blur(); } }}
                style={{ width:'50px' }}
              />
            </label>
            <label>
              Y
              <input
                key={`${selectedObject.id}-y`}
                ref={yRef}
                type="number"
                step={0.01}
                min={-10}
                max={10}
                value={posInputs.y}
                onChange={e => handlePosChange('y', e.target.value)}
                onBlur={() => handlePosBlur('y')}
                onWheel={e => handleWheel('y', e)}
                onKeyDown={e => { if (e.key === 'Enter'){ handlePosBlur('y'); e.currentTarget.blur(); } }}
                style={{ width:'50px' }}
              />
            </label>
            <label>
              Z
              <input
                key={`${selectedObject.id}-z`}
                ref={zRef}
                type="number"
                step={0.01}
                min={-10}
                max={10}
                value={posInputs.z}
                onChange={e => handlePosChange('z', e.target.value)}
                onBlur={() => handlePosBlur('z')}
                onWheel={e => handleWheel('z', e)}
                onKeyDown={e => { if (e.key === 'Enter'){ handlePosBlur('z'); e.currentTarget.blur(); } }}
                style={{ width:'50px' }}
              />
            </label>
          </div>
        </fieldset>

        {SpecificPanel}
      </div>

      <div className="popup-footer">
        <button className="remove-button" onClick={() => removeObject(selectedObject.id)}>Remove</button>
      </div>
    </div>
  )
}

