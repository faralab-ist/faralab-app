import React from 'react';
import './fluxWindow.css';

export default function FluxWindow({ value = 0, visible = true }) {
  if (!visible) return null;

  // Formatação limpa (ex: 1.23e+2)
  const displayValue = (typeof value === 'number') ? value.toExponential(2) : value;

  return (
    <div className="flux-window-wrap"> 
      <div className="flux-window-panel">
        <div className="flux-header">Flux</div>
        <div className="flux-content">
           <span className="flux-value">Φ = {displayValue}</span>
           <span className="flux-unit">Vm</span>
        </div>
      </div>
    </div>
  );
}
