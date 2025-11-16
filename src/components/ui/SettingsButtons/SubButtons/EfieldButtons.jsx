import './EfieldButtons.css'
import PlaneButtons from './PlaneButtons'


export default function EfieldButtons({
    onToggleField,
    onToggleLines,
    vectorMinTsl, 
    setVectorMinTsl, 
    activePlane,
    onPlaneSelect,
    showField, 
    scaleInput, 
    setScaleInput, 
    commitScale, 
    lineMin, 
    setLineMin, 
    showLines,
    lineNumInput,
    setLineNumInput,
    commitLineNum,
    inline,
    hasField = true
}) {
    const disabledTitle_vectors = "Enable the field vectors to use this";
    const disabledTitle_lines = "Enable the field lines to use this";

    const content = (
        <div className="efield-controls">
            <div className="field-buttons-row">
                <button
                    type="button"
                    className={`efield-toggle-btn ${showField ? 'active' : ''} ${!hasField ? 'disabled' : ''}`}
                    onClick={() => { if (!hasField) return; onToggleField?.(); }}
                    aria-disabled={!hasField}
                    //title={!hasField ? disabledTitle : undefined}
                >
                    {showField ? 'Hide Vectors' : 'Show Vectors'}
                </button>
                <button
                    type="button"
                    className={`efield-toggle-btn ${showLines ? 'active' : ''} ${!hasField ? 'disabled' : ''}`}
                    onClick={() => { if (!hasField) return; onToggleLines?.(); }}
                    aria-disabled={!hasField}
                   // title={!hasField ? disabledTitle : undefined}
                >
                    {showLines ? 'Hide Lines' : 'Show Lines'}
                </button>
            </div> 
            
            {/* only render Vectors section when active */}
            
            <div className={`efield-section ${!hasField ? 'disabled' : ''}`} role={ !hasField ? 'presentation' : undefined }>
                 <div className="efield-section-title">Vectors</div>
                 <div className="efield-row compact">
                     <label className="efield-label">
                         <span className="label-text">Min Threshold</span>
                         <input
                             type="number"
                             min={0.00}
                             step={0.05}
                             value={vectorMinTsl}
                             onChange={e => setVectorMinTsl(Number(e.target.value))}
                             disabled={!hasField || !showField}
                             aria-disabled={!hasField}
                             title={!hasField || !showField ? disabledTitle_vectors : undefined}
                         />
                     </label>
                     <label className="efield-label">
                         <span className="label-text">Scale</span>
                         <input
                             type="number"
                             min={0.1}
                             max={5}
                             step={0.1}
                             value={scaleInput}
                             onChange={e => setScaleInput(e.target.value)}
                             onBlur={commitScale}
                             onKeyDown={e => { if (e.key === 'Enter') commitScale() }}
                            disabled={!hasField || !showField}
                             aria-disabled={!hasField}
                             title={!hasField || !showField ? disabledTitle_vectors : undefined}
                         />
                     </label>
                 </div>
             </div>
             
 
            {/* only render Lines section when active */}
            
            <div className={`efield-section ${!hasField ? 'disabled' : ''}`} role={ !hasField ? 'presentation' : undefined }>
                 <div className="efield-section-title">Lines</div>
                 <div className="efield-row compact">
                     <label className="efield-label">
                         <span className="label-text">Min Threshold</span>
                         <input
                             type="number"
                             min={0.00}
                             step={0.05}
                             value={lineMin}
                             onChange={e => setLineMin(Number(e.target.value))}
                             disabled={!hasField || !showLines}
                             aria-disabled={!hasField}
                             title={!hasField || ! showLines? disabledTitle_lines : undefined}
                             placeholder="0.1"
                         />
                     </label>
                     <label className="efield-label">
                         <span className="label-text">Nº of Lines</span>
                         <input
                             type="number"
                             min={1}
                             max={50}
                             step={1}
                             value={lineNumInput}
                             onChange={e => setLineNumInput(e.target.value)}
                             onBlur={commitLineNum}
                             onKeyDown={e => { if (e.key === 'Enter') commitLineNum() }}
                             placeholder="20"
                             disabled={!hasField || !showLines}
                             aria-disabled={!hasField}
                             title={!hasField || !showLines ? disabledTitle_lines : undefined}
                         />
                     </label>
                 </div>
             </div>
             
        </div>
    );

    if (inline) return content;

   
    return (
        <div className="settings-panel up">
            {content}
        </div>
    );
}