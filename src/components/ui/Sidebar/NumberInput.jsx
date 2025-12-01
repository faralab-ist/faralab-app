import React, { useState, useEffect, useRef } from "react";

export default function NumberInput({
  value,
  onChange,
  onCommit,
  normalizeOnCommit,
  min,
  max,
  step = 0.1,
  decimals = 2,
  style,
  onError,
  errorMsg
}) {
  const format = (v) => (Number.isFinite(v) ? Number(v).toFixed(decimals) : "");
  const [localVal, setLocalVal] = useState(format(value));
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef(null);

  // Sync prop -> local only when NOT focused to avoid stealing focus/caret while typing
  useEffect(() => {
    if (!isFocused) setLocalVal(format(value));
  }, [value, decimals, isFocused]);

  const parseNum = (s) => {
    if (s === "" || s == null) return 0;
    const n = parseFloat(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const isPartial = (s) => s === "" || s === "-" || s === "." || s === "-.";

  const handleChange = (e) => {
    const raw = e.target.value;
    setLocalVal(raw);

    if (isPartial(raw)) return;

    const n = parseNum(raw);

    if (min !== undefined && n < min) onError?.(errorMsg || `Min: ${min}`);
    else if (max !== undefined && n > max) onError?.(errorMsg || `Max: ${max}`);
    else onError?.(null);

    onChange?.(n);
  };

  const handleBlur = () => {
    setIsFocused(false);

    let n = parseNum(isPartial(localVal) ? value : localVal);

    // Normalize on commit if provided
    if (typeof normalizeOnCommit === "function") n = normalizeOnCommit(n);

    // Clamp on blur
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);

    onChange?.(n);
    onCommit?.(n);
    setLocalVal(format(n));
    onError?.(null);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // keep raw string when focusing so user can continue editing
  };

  return (
    <input
      ref={ref}
      type="number"
      step={step}
      min={min}
      max={max}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ padding: "4px 8px", ...style }}
    />
  );
}