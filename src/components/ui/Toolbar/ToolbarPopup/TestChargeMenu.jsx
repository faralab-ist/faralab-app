import React, { useState, useMemo } from 'react'
import './TestChargeMenu.css'
import Reset from '../../../../assets/reset.svg'
import Confirm from '../../../../assets/confirm.svg'
import { InlineDecimalInput } from '../../io/decimalInput'
import '../../io/decimalInput.css'
import { POS_MIN, POS_MAX} from "../../Sidebar/utils";


export default function TestChargeMenu({ addObject, updatePosition, sceneObjects = [] }) {
  const [isOpen, setIsOpen] = useState(true)
  const [position, setPosition] = useState([0, 0, 0])

  const testCharges = useMemo(() => {
    return sceneObjects.filter(obj => obj.type === 'testPointCharge')
  }, [sceneObjects])



const clampWithError = (val, min, max) => {
  if (isNaN(val)) return 0;
  return Math.max(min, Math.min(val, max));
};
  const handleConfirm = () => {
    addObject('testPointCharge', { position: [...position] })
    setIsOpen(false)
    setPosition([0, 0, 0])
  }

  const updatePos = (index, val) => {
    const newPos = [...position]
    newPos[index] = val
    setPosition(newPos)
  }

  return (
    <div className="test-charge-panel">
      {/* Add Test Charge Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`add-test-charge-btn ${isOpen ? 'active' : ''}`}
      >
        <span className="btn-label">
          {isOpen ? '▼ Configure Charge' : '▶ Add Test Charge'}
        </span>
      </button>

      {/* Dropdown Panel - styled like .efield-section */}
      {isOpen && (
        <div className="test-charge-config">
          
          <div className="config-inputs">
            <label className="section-title">Position (x, y, z)</label>
            <div className='position-inputs'>
              <InlineDecimalInput 
                value={position[0]} 
                min={POS_MIN}
                max={POS_MAX}
                onChange={(v) => updatePos(0, v)} 
                decimals={2} step={0.1} 
              />
              <InlineDecimalInput 
                value={position[1]} 
                min={POS_MIN}
                max={POS_MAX}
                onChange={(v) => updatePos(1, v)} 
                decimals={2} step={0.1} 
              />
              <InlineDecimalInput 
                value={position[2]} 
                min={POS_MIN}
                max={POS_MAX}
                onChange={(v) => updatePos(2, v)} 
                decimals={2} step={0.1} 
              />
            </div>
          </div>

          <div className="config-actions">
            <button 
              onClick={handleConfirm} 
              className="action-btn primary" 
              title="Confirm"
            >
              <img src={Confirm} alt="Confirm" />
            </button>
            
            <button 
              onClick={() => setPosition([0, 0, 0])} 
              className="action-btn secondary" 
              title="Reset"
            >
              <img src={Reset} alt="Reset" />
            </button>
            
            
          </div>

        </div>
      )}

      {/* Test Charges List */}
      {testCharges.length > 0 && (
        <>
          <div className="charges-divider"></div>
          
          <div className="charges-list">
            <div className="charges-header">Active Test Charges</div>
            
            {testCharges.map((charge) => (
              <div key={charge.id} className="charge-item">
                <div className="charge-name">{charge.name || 'Test Charge'}</div>
                <div className="charge-info">
                  <span className="charge-efield">
                    E = {charge.eFieldValue?.toExponential(2) || '—'} N/C
                  </span>
                  <span className="charge-direction">
                    dir: {charge.eFieldDirection ? 
                      `(${charge.eFieldDirection[0].toFixed(2)}, ${charge.eFieldDirection[1].toFixed(2)}, ${charge.eFieldDirection[2].toFixed(2)})` 
                      : '(—, —, —)'}
                  </span>

                
                  <div className="subsection-header">
                    <div className="subsection-line" />
                  </div>
                  <span>Position (X, Y, Z)</span>
                        <div className="detail-value" style={{ display: "flex", gap: 6, paddingLeft:"2px" }}>
                    {['x', 'y', 'z'].map((axis, idx) => (
                      <InlineDecimalInput
                        key={axis}
                        initialValue={charge.position[idx]}
                        min={POS_MIN}
                        max={POS_MAX}
                        step={0.01}
                        onChange={(val) => {
                          const safe = clampWithError(val, POS_MIN, POS_MAX);
                          const newPos = [...charge.position];
                          newPos[idx] = safe;
                    
                          updatePosition(charge.id, newPos); 
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
