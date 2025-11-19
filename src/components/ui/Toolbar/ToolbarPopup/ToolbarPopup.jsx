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
  // keep a ref mirror for the latest pos so callbacks always read current value
  const posRef = useRef({ left: 80, top: 80, width: 320 })
  const [pos, setPosState] = useState(posRef.current)
  const [minimized, setMinimized] = useState(false)
  const [pinned, setPinned] = useState(false)

  const setPos = (next) => {
    const newPos = typeof next === 'function' ? next(posRef.current) : next
    posRef.current = newPos
    setPosState(newPos)
  }

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
          setPos({ left: p.left, top: p.top, width: p.width || posRef.current.width })
          return
        }
      }
    } catch (e) { /* ignore */ }

    // default position (center-ish relative to viewport)
    const w = Math.min(420, Math.max(240, ref.current?.offsetWidth || posRef.current.width))
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
        width: posRef.current.width
      })
    }
    const onUp = () => {
      if (!dragRef.current.dragging) return
      dragRef.current.dragging = false
      // persist only when user dragged (use posRef to get latest)
      const key = prevActive.current ? `toolbar-popup-pos-${prevActive.current}` : null
      if (key) {
        try { localStorage.setItem(key, JSON.stringify(posRef.current)) } catch (e) {}
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      // DON'T persist here — avoid saving default/initial positions on close
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startDrag = (ev) => {
    // do not allow dragging while pinned
    if (pinned) return
    if (ev.button !== undefined && ev.button !== 0) return
    ev.preventDefault()
    dragRef.current.dragging = true
    dragRef.current.startX = ev.clientX
    dragRef.current.startY = ev.clientY
    dragRef.current.origX = posRef.current.left
    dragRef.current.origY = posRef.current.top
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
        position: 'absolute',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 1200,
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
      {!minimized && renderFor(active)}
    </div>
  )
}