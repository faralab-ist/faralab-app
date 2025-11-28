import React, { use } from 'react'
import './SlicerMenu.css'
import '../../SettingsButtons/SubButtons/PotButtons.css'
import Flip from '../../../../assets/flip.svg'
import Slice1 from '../../../../assets/slice.svg'
import Helper from '../../../../assets/helper.svg'

export default function SlicerMenu({
  useSlice,
  setUseSlice,
  showSliceHelper,
  setShowSliceHelper,
  setSlicePlane,
  slicePlane,
  slicePos,
  setSlicePos,
  slicePlaneFlip,
  setSlicePlaneFlip,
  onClose
}) {
  return (
    <div className={`slicing-panel ${useSlice ? 'active' : 'disabled'}`}>
      <div className="slice-row">
        <button
          className={`slicing-btn ${useSlice ? 'active' : ''}`}
          onClick={() => setUseSlice?.(!useSlice)}
          aria-pressed={!!useSlice}
          title="Toggle slicing"
        >
          <img src={Slice1} alt="" aria-hidden="true" />
          <span className="btn-label">Slicing</span>
        </button>

        <button
          className={`helper-btn ${showSliceHelper && useSlice ? 'active' : ''}`}
          onClick={() => setShowSliceHelper?.(!showSliceHelper)}
          disabled={!useSlice}
          aria-pressed={!!showSliceHelper}
          title="Toggle helper"
        >
          <img src={Helper} alt="" aria-hidden="true" />
          <span className="btn-label">Helper</span>
        </button>

        <button
          className={`flip-btn ${slicePlaneFlip && useSlice ? 'active' : ''}`}
          onClick={() => setSlicePlaneFlip?.(!slicePlaneFlip)}
          disabled={!useSlice}
          aria-pressed={!!slicePlaneFlip}
          title="Flip slice orientation"
        >
          <img src={Flip} alt="" aria-hidden="true" />
          <span className="btn-label">Orientation</span>
        </button>
      </div>

      <div className="efield-section">
        <div className="efield-section-title">Slicing Plane</div>
        <div className="plane-buttons-group">
          <button
            className={`plane-button ${slicePlane === 'xy' && useSlice ? 'active' : 'inactive'}`}
            onClick={() => { if (!useSlice) return; setSlicePlane?.('xy') }}
            disabled={!useSlice}
            aria-disabled={!useSlice}
            title={!useSlice ? "Enable slicing to change plane" : "Select XY plane"}
          >XY</button>

          <button
            className={`plane-button ${slicePlane === 'yz' && useSlice ? 'active' : 'inactive'}`}
            onClick={() => { if (!useSlice) return; setSlicePlane?.('yz') }}
            disabled={!useSlice}
            aria-disabled={!useSlice}
            title={!useSlice ? "Enable slicing to change plane" : "Select YZ plane"}
          >YZ</button>

          <button
            className={`plane-button ${slicePlane === 'xz' && useSlice ? 'active' : 'inactive'}`}
            onClick={() => { if (!useSlice) return; setSlicePlane?.('xz') }}
            disabled={!useSlice}
            aria-disabled={!useSlice}
            title={!useSlice ? "Enable slicing to change plane" : "Select XZ plane"}
          >XZ</button>
        </div>
      </div>

      <div className="efield-section">
        <div className="efield-section-title">Slicing coordinate</div>
        <div className="efield-row compact">
          <input
            type="range"
            min={-10}
            max={10}
            step={0.1}
            value={slicePos ?? 0}
            onChange={e => setSlicePos?.(parseFloat(e.target.value))}
            disabled={!useSlice}
          />
          <span className="slider-value">{Number(slicePos ?? 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}