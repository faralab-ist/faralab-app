import React from 'react';

export default function CuboidInfo({ object, updateObject }) {
  const handleChange = (field, value) => {
    updateObject(object.id, { [field]: value === '' ? 0 : Number(value) });
  };

  return (
    <div className="object-info">
      <label>
        Width
        <input
          type="number"
          value={object.width === 0 ? '' : object.width}
          onChange={(e) => handleChange('width', e.target.value)}
          step={0.1}
        />
      </label>

      <label>
        Height
        <input
          type="number"
          value={object.height === 0 ? '' : object.height}
          onChange={(e) => handleChange('height', e.target.value)}
          step={0.1}
        />
      </label>

      <label>
        Depth
        <input
          type="number"
          value={object.depth === 0 ? '' : object.depth}
          onChange={(e) => handleChange('depth', e.target.value)}
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
