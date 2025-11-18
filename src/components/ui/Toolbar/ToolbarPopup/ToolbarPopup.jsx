import React, { useRef, useEffect, useState } from 'react'
import SlicerMenu from './SlicerMenu'
import './ToolbarPopup.css'
import Pin from '../../../../assets/pin.svg'
import Close from '../../../../assets/close_X.svg'
import Minimize from '../../../../assets/Minimize.svg'

export default function ToolbarPopup({ active, setActive, popupProps = {} }) {
  const ref = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 })
  const prevActive = useRef(null)
  const [pos, setPos] = useState({ left: 80, top: 80, width: 320 })
  const [minimized, setMinimized] = useState(false)
  const [pinned, setPinned] = useState(false)

  // load saved pos when popup opens
  useEffect(() => {
    if (!active) return
    prevActive.current = active
    const key = `toolbar-popup-pos-${active}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.left === 'number' && typeof p.top === 'number') {
          setPos({ left: p.left, top: p.top, width: p.width || 320 })
          return
        }
      }
    } catch (e) { /* ignore */ }

    // default position (center-ish)
    const w = Math.min(420, Math.max(240, ref.current?.offsetWidth || 320))
    const left = Math.max(8, Math.round((window.innerWidth - w) / 2))
    const top = 80
    setPos({ left, top, width: w })
  }, [active])

  // pointer move/up handlers (global)
  useEffect(() => {
    const onMove = (ev) => {
      if (!dragRef.current.dragging) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      setPos({
        left: Math.max(8, Math.round(dragRef.current.origX + dx)),
        top: Math.max(8, Math.round(dragRef.current.origY + dy)),
        width: pos.width
      })
    }
    const onUp = () => {
      if (!dragRef.current.dragging) return
      dragRef.current.dragging = false
      // persist
      const key = prevActive.current ? `toolbar-popup-pos-${prevActive.current}` : null
      if (key) {
        try { localStorage.setItem(key, JSON.stringify(pos)) } catch (e) {}
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      // persist on unmount if still relevant
      const key = prevActive.current ? `toolbar-popup-pos-${prevActive.current}` : null
      if (key) {
        try { localStorage.setItem(key, JSON.stringify(pos)) } catch (e) {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])

  const startDrag = (ev) => {
    // do not allow dragging while pinned
    if (pinned) return
    if (ev.button !== undefined && ev.button !== 0) return
    ev.preventDefault()
    dragRef.current.dragging = true
    dragRef.current.startX = ev.clientX
    dragRef.current.startY = ev.clientY
    dragRef.current.origX = pos.left
    dragRef.current.origY = pos.top
    try { ev.target?.setPointerCapture?.(ev.pointerId) } catch (e) {}
  }

  if (!active) return null

  const renderFor = (name) => {
    switch (name) {
      case 'Slice':
        return <SlicerMenu {...popupProps} onClose={() => setActive?.(null)} />
      default:
        return null
    }
  }

  return (
    <div
      ref={ref}
      className={`toolbar-popup ${minimized ? 'minimized' : ''} ${pinned ? 'pinned' : ''}`}
      role="dialog"
      aria-modal="false"
      style={{
        position: 'absolute',   // positioned relative to .toolbar-root
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 1200,
        /* allow CSS max-width to control maximum size; size will now follow inner content */
        maxWidth: '90vw'
      }}
    >
      <div
        className="toolbar-popup-handle"
        onPointerDown={startDrag}
        onMouseDown={(e) => e.stopPropagation()}
        title="Drag to move"
      >
        <div className="toolbar-popup-controls" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`tp-icon-btn pin-btn ${pinned ? 'on' : ''}`}
            onClick={() => { setPinned(v => !v) }}
            aria-pressed={pinned}
            title={pinned ? 'Unpin' : 'Pin'}
          >
            <img src={Pin} alt="Pin" />
          </button>

          <button
            type="button"
            className={`tp-icon-btn mini-btn ${minimized ? 'on' : ''}`}
            onClick={() => { setMinimized(v => !v) }}
            aria-pressed={minimized}
            title={minimized ? 'Restore' : 'Minimize'}
          >
            <img src={Minimize} alt="Minimize" />
          </button>

          <button
            type="button"
            className="tp-icon-btn close-btn"
            onClick={() => { setActive?.(null) }}
            title="Close"
          >
            <img src={Close} alt="Close" />
          </button>
        </div>
      </div>

      <h3 className={`${active}`}>{active}</h3>
      {/* when minimized, hide the inner content but keep title visible */}
      {!minimized && renderFor(active)}
    </div>
  )
}