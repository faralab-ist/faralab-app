import React from 'react';

export default function SphereInfo({ object, updateObject }) {
  const handleChange = (field, value) => {
    updateObject(object.id, { [field]: value === '' ? 0 : Number(value) });
  };

  return (
    <div className="object-info">
      <label>
        Radius
        <input
          type="number"
          value={object.radius === 0 ? '' : object.radius}
          onChange={(e) => handleChange('radius', e.target.value)}
          step={0.1}
        />
      </label>

      <label>
        Opacity
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={object.opacity}
          onChange={(e) => handleChange('opacity', Number(e.target.value))}
        />
      </label>
    </div>
  );
}
