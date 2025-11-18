import React, { useState } from 'react'
import './Toolbar.css'
import Slice from '../../../assets/slice.svg'
import Edit from '../../../assets/edit.svg'
import Clean from '../../../assets/clean.svg'

export default function Toolbar({
  creativeMode,
  setCreativeMode,
  setSceneObjects,
  active,         // lifted state from App
  setActive,      // lifted setter from App
}) {
  const handleClick = (name, e) => {
    e.preventDefault()
    setActive((a) => (a === name ? null : name))
  }

  const handleClearCanvas = () => { setSceneObjects?.([]) }

  return (
    <div className="top-toolbar">
      
      <div className="tb-group">
        <button
          className={`tb-btn ${active === 'Slice' ? 'active' : ''}`}
          onClick={(e) => handleClick('Slice', e)}
          title="Slice"
          aria-pressed={active === 'Slice'}
        >
          <img className="tb-icon" src={Slice} alt="" />
        </button>

        <button
          className={`tb-btn ${creativeMode ? 'active' : ''}`}
          onClick={() => setCreativeMode(v => !v)}
          title="Enable manual object creation"
          aria-pressed={creativeMode}
        >
          <img className="tb-icon" src={Edit} alt="" />
        </button>

        <button
          className={`tb-btn `}
          onClick={() => handleClearCanvas()}
          title="Clear canvas"
        >
          <img className="tb-icon" src={Clean} alt="" />
        </button>
      </div>
    </div>
  )
}
