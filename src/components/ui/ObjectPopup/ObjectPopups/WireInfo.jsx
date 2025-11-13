import { useState } from 'react'


export default function WireInfo({ object, updateObject }) {

   const MAX_DENSITY = 5
    const MIN_DENSITY = -5
  
    const [inputValue, setInputValue] = useState(
      object.charge_density === 0 ? '' : String(object.charge_density ?? '')
    )
    const [error, setError] = useState('')
  
    const handleDensityChange = (e) => {
      const value = e.target.value
      setInputValue(value)
  
      if (value === '') {
        updateObject(object.id, { charge_density: 0 })
        setError('')
        return
      }
  
      const num = parseFloat(value)
      if (!Number.isFinite(num)) {
        setError('Invalid number.')
        return
      }
  
      if (num > MAX_DENSITY || num < MIN_DENSITY) {
        setError(`Please keep the density between ${MIN_DENSITY} and ${MAX_DENSITY}.`)
        return
      }
  
      setError('')
      updateObject(object.id, { charge_density: num })
    }
  const handleTypeChange = (e) => {
    const value = e.target.value
    updateObject(object.id, { material: value }) // muda o campo p.ex. "material"
  }

  const handleChangeInfinite = (e) => {
  updateObject(object.id, { infinite: e.target.checked })
}


   return (
    <div>
      <label>
        Linear Charge Density λ:
        <input
         type="number"
          value={inputValue}
          step={0.1}
          min={MIN_DENSITY}
          max={MAX_DENSITY}
          onChange={handleDensityChange}
          className={`popup-number-input ${error ? 'has-error' : ''}`}
        />
      </label>
      {error && <div className="input-error">{error}</div>}

      <div className="checkbox-row">
        <label htmlFor="infinite">
           Infinite:
          <input
            id="infinite"
            type="checkbox"
            name="infinite"
            checked={object.infinite || false}
            onChange={handleChangeInfinite}
          />
         
        </label>
      </div>


     {/* <label>
        Material:
        <select value={object.material || 'conductor'} onChange={handleTypeChange}>
          <option value="dielectric">Dielectric</option>
          <option value="conductor">Conductor</option>
        </select>
      </label> */}
    </div>
  )
}