import './PotButtons.css'

export default function PotButons({
    onToggleEquipotentialSurface,
    showEquipotentialSurface,
    potentialTarget,
    setPotentialTarget,
    inline
}) {
    const content = (
    <div className="potential-controls">
              <button 
              className='pot-toggle-btn'
              onClick={onToggleEquipotentialSurface}
              >
                {showEquipotentialSurface ? 'Hide Equipotential' : 'Show Equipotential'}
              </button>

             
              <div className="slider-row">
                <label className="slider-label">
                  Target V (exp): <span className="slider-value">{Number(potentialTarget).toFixed(1)}</span>
                </label>
                <input
                  className="potential-slider"                
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={potentialTarget ?? 0}
                  onChange={(e) => setPotentialTarget?.(parseFloat(e.target.value))}
                  disabled={!showEquipotentialSurface}
                />
              </div>
            </div>
    );
    if (inline) return content;

    // original popup behavior (unchanged)
    return (
        <div className="settings-panel up">
            {content}
        </div>
    );
}