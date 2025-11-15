import React from 'react'
import './PlaneButtons.css'

export default function PlaneButtons({ activePlane, onPlaneSelect, title = 'Plane View' }) {
  return (
    <div className="plane-buttons-container">
      {/* simple header/title for the group */}
      <div className="plane-buttons-title">{title}</div>

      <div className="plane-buttons-group">
        {/* Plano XY (chão) */}
        <button
          className={`plane-button plane-xy ${activePlane === 'xy' ? 'active' : 'inactive'}`}
          onClick={() => onPlaneSelect('xy')}
          title="Plano XY"
        >
          <div className="plane-label">XY</div>
        </button>

        {/* Plano YZ (parede esquerda) */}
        <button
          className={`plane-button plane-yz ${activePlane === 'yz' ? 'active' : 'inactive'}`}
          onClick={() => onPlaneSelect('yz')}
          title="Plano YZ"
        >
          <div className="plane-label">YZ</div>
        </button>

        {/* Plano XZ (parede direita) */}
        <button
          className={`plane-button plane-xz ${activePlane === 'xz' ? 'active' : 'inactive'}`}
          onClick={() => onPlaneSelect('xz')}
          title="Plano XZ"
        >
          <div className="plane-label">XZ</div>
        </button>
      </div>
    </div>
  )
}
