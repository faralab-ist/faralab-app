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
              <button onClick={onToggleEquipotentialSurface}>
                {showEquipotentialSurface ? 'Hide Equipotential' : 'Show Equipotential'}
              </button>

             
              <div className="slider-row">
                <label className="slider-label">
                  Target V: <span className="slider-value">{Number(potentialTarget).toFixed(2)}</span>
                </label>
                <input
                  className="potential-slider"                
                  type="range"
                  min={-20}
                  max={20}
                  step={0.1}
                  value={potentialTarget ?? 0}
                  onChange={(e) => setPotentialTarget?.(parseFloat(e.target.value))}
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