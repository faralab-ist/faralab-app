import { Center } from '@react-three/drei';
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
    vectorScale, 
    setVectorScale, 
    vectorStep,
    setVectorStep,
    lineMin, 
    setLineMin, 
    showLines,
    lineNumber,
    setLineNumber,
    inline,
    hasField = true,
    // wave propagation props
    wavePropagationEnabled,
    setWavePropagationEnabled,
    waveDuration,
    setWaveDuration
}) {
    const disabledTitle_vectors = "Enable the field vectors to use this";
    const disabledTitle_lines = "Enable the field lines to use this";

    const content = (
        <div className="efield-controls">
            <div className="efield-row compact" style={{alignItems: 'center', gap: 8}}>
                <label className="efield-label horizontal">
                    <span className="label-text" style= {{justifyContent:'normal'}}>Wave Propagation</span>
                    <input
                        type="checkbox"
                        checked={!!wavePropagationEnabled}
                        onChange={e => setWavePropagationEnabled?.(e.target.checked)}
                        title={(!wavePropagationEnabled || !hasField) ? 'Enable field vectors to control this' : undefined}
                        disabled={!hasField || !showField}
                        className="efield-checkbox"
                    />
                </label>

                {/* Always render the Wave Duration row — greyed/disabled when wavePropagationEnabled is false */}
                <label
                    className={`efield-label ${(!wavePropagationEnabled || !showField) ? 'dimmed' : ''}`}
                    style={{display:'flex', alignItems:'center', gap:8}}
                    title={(!wavePropagationEnabled || !showField) ? 'Enable field vectors to control this' : undefined}
                    aria-hidden={!showField && !wavePropagationEnabled ? 'true' : undefined}
                >
                    <span className="label-text">Wave Duration (s)</span>
                    <input
                        type="range"
                        min={0.02}
                        max={1.0}
                        step={0.01}
                        value={waveDuration ?? 0.1}
                        onChange={e => setWaveDuration?.(parseFloat(e.target.value))}
                        disabled={!wavePropagationEnabled || !showField}
                        className="efield-range"
                    />
                    <span className="slider-value" style={{minWidth:48, textAlign:'right'}}>{(waveDuration ?? 0.1).toFixed(2)}</span>
                </label>
            </div>
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
                            value={vectorScale}
                            onChange={e => {setVectorScale(Number(e.target.value))}}
                            disabled={!hasField || !showField}
                            aria-disabled={!hasField}
                            title={!hasField || !showField ? disabledTitle_vectors : undefined}
                         />
                     </label>
                     <label className="efield-label">
                        <span className="label-text">Density</span>
                        <input
                            type="number"
                            min={0.2}
                            max={2}
                            step={0.2}
                            value={vectorStep}
                            onChange={e => {setVectorStep(Number(e.target.value))}}
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
                            value={lineNumber}
                            onChange={e => setLineNumber(Number(e.target.value))}
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