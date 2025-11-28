import React, { useState, useEffect } from "react";

export default function NumberInput({ 
  value, 
  onChange, 
  min, 
  max, 
  step = 0.1, 
  decimals = 2, 
  style, 
  onError,
  errorMsg
}) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(Number.isFinite(value) ? value : 0);
  }, [value]);

  const parseNum = (s) => {
    if (s === '' || s == null) return 0;
    const n = parseFloat(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const isPartial = (s) => s === '' || s === '-' || s === '.' || s === '-.';

  const handleChange = (e) => {
    const raw = e.target.value;
    setLocalVal(raw);

    if (isPartial(raw)) return;

    const n = parseNum(raw);
    
    if (min !== undefined && n < min) onError?.(errorMsg || `Min: ${min}`);
    else if (max !== undefined && n > max) onError?.(errorMsg || `Max: ${max}`);
    else {
      onError?.(null);
      onChange(n);
    }
  };

  const handleBlur = () => {
    let n = parseNum(isPartial(localVal) ? value : localVal);
    
    // Clamp values on blur
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);

    onChange(n);
    setLocalVal(Number(n).toFixed(decimals)); // Remove zeros desnecessários se quiseres usar parseFloat(n.toFixed(decimals))
    onError?.(null);
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ padding: "4px 8px", ...style }}
    />
  );
}