import React, { useRef, useEffect, useState } from 'react'
import SlicerMenu from './SlicerMenu'
import TestChargeMenu from './TestChargeMenu'
import EFieldMenu from './EFieldMenu'
import GaussianMenu from './GaussianMenu'
import './ToolbarPopup.css'
import Pin from '../../../../assets/pin.svg'
import Close from '../../../../assets/close_X.svg'
import Minimize from '../../../../assets/minimize.svg'


export default function ToolbarPopup({ id, onClose, popupProps = {} }) {

  const ref = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 })
  
  const storageKey = `popup-pos-${id}`

  // Load from storage synchronously inside useState (Lazy Initialization)
  // This prevents the default value from overwriting the saved value
  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.left === 'number' && typeof p.top === 'number') {
          return p
        }
      }
    } catch (e) { /* ignore */ }

    // Fallback: Random staggered position if no save exists
    return { 
      left: 20 + (Math.random() * 50), 
      top: 120 + (Math.random() * 50) 
    }
  })

  const [minimized, setMinimized] = useState(false)
  const [pinned, setPinned] = useState(false)

  // 1. Auto-Save position whenever it changes
  useEffect(() => {
     localStorage.setItem(storageKey, JSON.stringify(pos))
  }, [pos, storageKey])

  // 2. Handle Global Dragging
  useEffect(() => {
    const onMove = (ev) => {
      if (!dragRef.current.dragging) return
      
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      
      const newLeft = Math.max(0, Math.round(dragRef.current.origX + dx))
      const newTop = Math.max(0, Math.round(dragRef.current.origY + dy))

      setPos({ left: newLeft, top: newTop })
    }

    const onUp = () => {
      dragRef.current.dragging = false
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const startDrag = (ev) => {
    if (pinned) return
    if (ev.button !== 0) return 
    ev.preventDefault()
    
    dragRef.current.dragging = true
    dragRef.current.startX = ev.clientX
    dragRef.current.startY = ev.clientY
    dragRef.current.origX = pos.left
    dragRef.current.origY = pos.top
  }

  const renderContent = () => {
    switch (id) {
      case 'Slice':
        return <SlicerMenu {...popupProps} minimized={minimized} />
      case 'TestCharge':
         return <TestChargeMenu {...popupProps} minimized={minimized} />
      case 'EField':
        return <EFieldMenu {...popupProps} minimized={minimized} />
      case 'Gaussian':
        return <GaussianMenu {...popupProps} minimized={minimized} />
      default:
        return <div style={{padding: 15}}>Unknown Tool: {id}</div>
    }
  }

  return (
    <div
      ref={ref}
      className={`toolbar-popup ${minimized ? 'minimized' : ''} ${pinned ? 'pinned' : ''}`}
      style={{
        position: 'absolute',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 1200, 
      }}
    >
      <div
        className="toolbar-popup-handle"
        onPointerDown={startDrag}
      >
        <span style={{ marginLeft: 4, fontWeight: 'bold', fontSize: 12, color: '#ccc' }}>
            {id}
        </span>
        
        <div className="toolbar-popup-controls" onPointerDown={e => e.stopPropagation()}>
          <button
            className={`tp-icon-btn ${pinned ? 'on' : ''}`}
            onClick={() => setPinned(!pinned)}
            title="Pin position"
          >
            <img src={Pin} alt="Pin" />
          </button>

          <button
            className={`tp-icon-btn ${minimized ? 'on' : ''}`}
            onClick={() => setMinimized(!minimized)}
            title="Minimize"
          >
            <img src={Minimize} alt="Min" />
          </button>

          <button
            className="tp-icon-btn close-btn"
            onClick={onClose}
            title="Close"
          >
            <img src={Close} alt="Close" />
          </button>
        </div>
      </div>

      {renderContent()}
      
    </div>
  )
}