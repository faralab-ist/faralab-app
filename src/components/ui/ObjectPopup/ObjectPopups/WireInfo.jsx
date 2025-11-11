export default function WireInfo({ object, updateObject }) {
  const handleDensityChange = (e) => {
    const value = e.target.value
    // If empty string, pass 0 to object but keep input empty
    updateObject(object.id, { 
      charge_density: value === '' ? 0 : parseFloat(value) 
    })
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
          // Show empty string if value is 0, otherwise show the value
          value={object.charge_density === 0 ? '' : object.charge_density}
          step={0.1}
          min={-10}
          max={10}
          onChange={handleDensityChange}
        />
      </label>

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