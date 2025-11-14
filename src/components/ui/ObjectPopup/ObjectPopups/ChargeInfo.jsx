import { useState } from 'react'

export default function ChargeInfo({ object, updateObject }) {
  const MAX_INTENSITY = 5
  const MIN_INTENSITY = -5

  const [inputValue, setInputValue] = useState(
    object.charge === 0 ? '' : String(object.charge)
  )
  const [error, setError] = useState('')

  const handleIntensityChange = (e) => {
    const value = e.target.value
    setInputValue(value)

    if (value === '') {
      updateObject(object.id, { charge: 0 })
      setError('')
      return
    }

    const num = parseFloat(value)
    if (!Number.isFinite(num)) {
      setError('Invalid number.')
      return
    }

    if (num > MAX_INTENSITY || num < MIN_INTENSITY) {
      setError(`Please keep the intensity between ${MIN_INTENSITY} and ${MAX_INTENSITY}.`)
    } else {
      setError('')
      updateObject(object.id, { charge: num })
    }
  }

  return (
    <div className="charge-info">
      <label className="intensity-label">
        Intensity C:
        <input
          type="number"
          value={inputValue}
          step={0.1}
          min={MIN_INTENSITY}
          max={MAX_INTENSITY}
          onChange={handleIntensityChange}
          className={`popup-number-input ${error ? 'has-error' : ''}`}
        />
      </label>
      {error && <div className="input-error">{error}</div>}
    </div>
  )
}