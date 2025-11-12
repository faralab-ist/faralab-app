import React from 'react'
import './PlaneButtons.css'

export default function PlaneButtons({ activePlane, onPlaneSelect }) {
  return (
    <div className="plane-buttons-container">
      <div className="plane-buttons-group">
        {/* Plano XY (chão) */}
        <button
          className={`plane-button plane-xy ${activePlane === 'xy' ? 'active' : ''}`}
          onClick={() => onPlaneSelect('xy')}
          title="Plano XY"
        >
          <div className="plane-label">XY</div>
        </button>

        {/* Plano YZ (parede esquerda) */}
        <button
          className={`plane-button plane-yz ${activePlane === 'yz' ? 'active' : ''}`}
          onClick={() => onPlaneSelect('yz')}
          title="Plano YZ"
        >
          <div className="plane-label">YZ</div>
        </button>

        {/* Plano XZ (parede direita) */}
        <button
          className={`plane-button plane-xz ${activePlane === 'xz' ? 'active' : ''}`}
          onClick={() => onPlaneSelect('xz')}
          title="Plano XZ"
        >
          <div className="plane-label">XZ</div>
        </button>
      </div>
    </div>
  )
}
