import React, { useRef, useEffect, useState } from 'react'
import SlicerMenu from './SlicerMenu'
import TestChargeMenu from './TestChargeMenu'
import EFieldMenu from './EFieldMenu'
import GaussianMenu from './GaussianMenu'
import './ToolbarPopup.css'
import Pin from '../../../../assets/pin.svg'
import Close from '../../../../assets/close_X.svg'
import Minimize from '../../../../assets/minimize.svg'


export default function ToolbarPopup({ id, onClose, popupProps = {}, onDock, undockPosition }) {

  const ref = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 })
  
  const storageKey = `popup-pos-${id}`
  const [isDragOverDock, setIsDragOverDock] = useState(false)

  // Load from storage synchronously inside useState (Lazy Initialization)
  // This prevents the default value from overwriting the saved value
  const [pos, setPos] = useState(() => {
    // First priority: undockPosition from drag
    if (undockPosition && typeof undockPosition.left === 'number' && typeof undockPosition.top === 'number') {
      return undockPosition;
    }
    
    // Second priority: localStorage
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
      
      // Check if dragging over docker sidebar (left 320px)
      const isOverDock = ev.clientX < 320 && ev.clientY > 0
      setIsDragOverDock(isOverDock)
      
      // Toggle drag-active and drag-over classes on docker sidebar
      const dockElement = document.querySelector('.dock-sidebar')
      if (dockElement) {
        dockElement.classList.add('drag-active')
        if (isOverDock) {
          dockElement.classList.add('drag-over')
        } else {
          dockElement.classList.remove('drag-over')
        }
      }
    }

    const onUp = (ev) => {
      if (!dragRef.current.dragging) return
      dragRef.current.dragging = false
      
      // Check if released over dock area
      if (ev.clientX < 320 && ev.clientY > 0) {
        onDock?.(id)
        onClose?.() // Close the floating popup
      }
      
      // Clean up drag classes
      const dockElement = document.querySelector('.dock-sidebar')
      if (dockElement) {
        dockElement.classList.remove('drag-over')
        dockElement.classList.remove('drag-active')
      }
      setIsDragOverDock(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [id, onDock, onClose])

  const startDrag = (ev) => {
    if (pinned) return
    if (ev.button !== 0) return
    
    // Don't start drag if clicking on interactive elements
    const target = ev.target
    const isButton = target.closest('button, input, select, textarea, a, [role="button"]')
    if (isButton) return
    
    ev.preventDefault()
    
    dragRef.current.dragging = true
    dragRef.current.startX = ev.clientX
    dragRef.current.startY = ev.clientY
    dragRef.current.origX = pos.left
    dragRef.current.origY = pos.top
    
    // Add drag-active class when starting to drag
    const dockElement = document.querySelector('.dock-sidebar')
    if (dockElement) {
      dockElement.classList.add('drag-active')
    }
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
      className={`toolbar-popup ${minimized ? 'minimized' : ''} ${pinned ? 'pinned' : ''} ${isDragOverDock ? 'drag-to-dock' : ''}`}
      style={{
        position: 'absolute',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 1200,
        cursor: pinned ? 'default' : 'default',
      }}
      onPointerDown={startDrag}
    >
      <div
        className="toolbar-popup-handle"
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