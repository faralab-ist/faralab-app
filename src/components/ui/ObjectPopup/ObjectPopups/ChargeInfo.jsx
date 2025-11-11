export default function ChargeInfo({ object, updateObject }) {
  const handleIntensityChange = (e) => {
    const value = e.target.value
    // If empty string, pass 0 to object but keep input empty
    updateObject(object.id, { 
      charge: value === '' ? 0 : parseFloat(value) 
    })
  }


  return (
    <div>
        <label>
        Intensity C:
        <input
          type="number"
          // Show empty string if value is 0, otherwise show the value
          value={object.charge === 0 ? '' : object.charge}
          step={0.1}
          min={-20}
          max={20}
          onChange={handleIntensityChange}
          style={{ width: '50px' }}
        />
      </label>
  
    </div>
  )
}