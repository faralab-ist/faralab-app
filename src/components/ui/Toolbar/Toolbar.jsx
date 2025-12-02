import React from 'react'
import './Toolbar.css'
import RecordingButtons from '../RecordingButtons/RecordingButtons'

export default function Toolbar() {
  return (
    <div className="top-toolbar">
      <RecordingButtons />
    </div>
  )
}
