export default function ChargedSphereInfo({ object, updateObject }) {
  const handleDensityChange = (e) => {
    const value = e.target.value
    // If empty string, pass 0 to object but keep input empty
    updateObject(object.id, { 
      charge_density: value === '' ? 0 : parseFloat(value) 
    })
  }

    const handleRadiusChange = (e) => {
    const value = e.target.value
    // If empty string, pass 0 to object but keep input empty
    updateObject(object.id, { 
      radius: value === '' ? 0 : parseFloat(value) 
    })
  }

  const handleTypeChange = (e) => {
    const value = e.target.value
    updateObject(object.id, { material: value }) // muda o campo p.ex. "material"
  }

  const handleChangeHollow= (e) => {
  updateObject(object.id, { isHollow: e.target.checked })
}


   return (
    <div>
      <label>
        Superficial Charge Density σ:
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

        <label>
        Radius:
        <input
          type="number"
          // Show empty string if value is 0, otherwise show the value
          value={object.radius === 0 ? '' : object.radius}
          step={0.1}
          min={-10}
          max={10}
          onChange={handleRadiusChange}
        />
      </label>

      <div className="checkbox-row">
        <label>
           Hollow:
          <input
            id="hollow"
            type="checkbox"
            name="hollow"
            checked={object.isHollow || false}
            onChange={handleChangeHollow}
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