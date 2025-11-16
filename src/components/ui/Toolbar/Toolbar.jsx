import React from 'react'
import './Toolbar.css'

export default function Toolbar() {
  const handleClick = (name, e) => {
    e.preventDefault()
    // dummy handler — replace with real actions later
    // eslint-disable-next-line no-console
    console.log(`Toolbar: ${name} clicked`)
    alert(`${name} (dummy)`) // quick visual feedback
  }

  return (
    <div className="top-toolbar">
      <button className="tb-btn" onClick={(e) => handleClick('Tool A', e)}>Tool A</button>
      <button className="tb-btn" onClick={(e) => handleClick('Tool B', e)}>Tool B</button>
      <button className="tb-btn" onClick={(e) => handleClick('Tool C', e)}>Tool C</button>
      <div className="tb-sep" />
      <button className="tb-btn small" onClick={(e) => handleClick('Settings', e)}>⚙</button>
    </div>
  )
}
