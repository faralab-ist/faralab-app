import React, { useState, useEffect, useRef } from 'react'
import './ExportDialog.css'

export default function ExportDialog({ isOpen, onClose, onConfirm }) {
  const [presetName, setPresetName] = useState('my-preset')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (presetName.trim()) {
      onConfirm(presetName.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog-header">
          <h3>Export Preset</h3>
          <button 
            className="export-dialog-close" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="export-dialog-body">
            <label htmlFor="preset-name">Preset name</label>
            <input
              ref={inputRef}
              id="preset-name"
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="my-custom-preset"
              maxLength={50}
            />
            <span className="export-dialog-hint">.json will be added automatically</span>
          </div>
          
          <div className="export-dialog-footer">
            <button 
              type="button" 
              className="export-dialog-cancel" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="export-dialog-confirm"
              disabled={!presetName.trim()}
            >
              Export
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
