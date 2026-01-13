import React, { useRef, useEffect } from "react";

export function InlineDecimalInput({
  initialValue = 0,
  step = 0.01,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  onChange,
  value,
  className,
  decimals = 2,
  onCommit,
  normalizeOnCommit,
  onError,
  errorMsg,
  style,
  inputStyle,
}) {
  const spanRef = useRef(null);
  const spinRef = useRef(null);
  const safeDecimals = Number.isFinite(decimals) ? Math.max(0, decimals) : 2;

  function format(v) {
    if (isNaN(v)) v = 0;
    v = Math.min(max, Math.max(min, v));
    return v.toFixed(safeDecimals);
  }

  function readValue() {
    const el = spanRef.current;
    if (!el) return 0;
    const v = parseFloat(el.textContent);
    if (isNaN(v)) return 0;
    return Math.min(max, Math.max(min, v));
  }

  function writeValue(v) {
    const el = spanRef.current;
    if (!el) return;
    const txt = format(v);
    if (el.textContent !== txt) {
      el.textContent = txt;
    }
  }

  function selectAll() {
    const el = spanRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function stepValue(delta) {
    const current = readValue();
    const next = current + delta;
    writeValue(next);
    if (onChange) onChange(readValue());
  }

  function startSpin(delta) {
    stepValue(delta);
    stopSpin();
    spinRef.current = setInterval(() => stepValue(delta), 100);
  }

  function stopSpin() {
    if (spinRef.current) {
      clearInterval(spinRef.current);
      spinRef.current = null;
    }
  }

 
  function sanitizeDuringEdit() {
    const el = spanRef.current;
    if (!el) return;

    let txt = el.textContent || "";
    
    // Preserve minus sign at the start
    const hasMinusAtStart = txt.startsWith("-");
    txt = txt.replace(/,/g, ".").replace(/[^\d.-]/g, "");
    
    // Ensure only one minus sign at the start
    if (hasMinusAtStart && !txt.startsWith("-")) {
      txt = "-" + txt.replace(/-/g, "");
    } else {
      txt = txt.replace(/-/g, "");
      if (hasMinusAtStart) txt = "-" + txt;
    }

    const first = txt.indexOf(".");
    if (safeDecimals === 0) {
      txt = txt.replace(/\./g, "");
    } else if (first !== -1) {
      const before = txt.slice(0, first + 1);
      let after = txt.slice(first + 1).replace(/\./g, "");
      after = after.slice(0, safeDecimals);
      txt = before + after;
    }

    if (txt !== el.textContent) {
      el.textContent = txt;
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function normalizeOnBlur() {
    const el = spanRef.current;
    if (!el) return;
    stopSpin();

    let txt = el.textContent || "";
    
    // Preserve minus sign at the start
    const hasMinusAtStart = txt.startsWith("-");
    txt = txt.replace(/,/g, ".").replace(/[^\d.-]/g, "");
    
    // Remove all minus signs and re-add at start if needed
    txt = txt.replace(/-/g, "");
    if (hasMinusAtStart) txt = "-" + txt;

    if (txt === "" || txt === "." || txt === "-" || txt === "-.") {
      writeValue(0);
      onChange?.(0);
      onCommit?.(0);
      onError?.(null);
      return;
    }

    let v = parseFloat(txt);
    if (!Number.isFinite(v)) v = 0;
    if (typeof normalizeOnCommit === "function") v = normalizeOnCommit(v);

    const beforeClamp = v;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);

    if (min !== undefined && beforeClamp < min) onError?.(errorMsg || `Min: ${min}`);
    else if (max !== undefined && beforeClamp > max) onError?.(errorMsg || `Max: ${max}`);
    else onError?.(null);

    writeValue(v);
    onChange?.(v);
    onCommit?.(v);
    window.getSelection().removeAllRanges();
  }

  const handleMouseDown = (e) => {
    e.preventDefault();
    spanRef.current?.focus();
  };

  const handleFocus = () => {
    selectAll();
  };

  const handleKeyDown = (e) => {
    const el = spanRef.current;
    if (!el) return;

    if (e.key === "Enter") {
      e.preventDefault();
      normalizeOnBlur();
      el.blur();
      return;
    }

    const allow = [
      "Backspace",
      "Delete",
      "Tab",
      "Home",
      "End",
      "ArrowLeft",
      "ArrowRight",
    ];
    if (allow.includes(e.key)) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!spinRef.current) startSpin(step);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!spinRef.current) startSpin(-step);
      return;
    }

    const sel = window.getSelection();
    const text = el.textContent || "";
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const pos = range.startOffset;

    if (e.key === "." || e.key === ",") {
      if (safeDecimals === 0) e.preventDefault();
      return;
    }
    
    // Allow minus sign only at the start
    if (e.key === "-") {
      if (pos !== 0) {
        e.preventDefault();
      }
      return;
    }

    if (e.key.length === 1 && /[0-9]/.test(e.key)) {
      const dot = text.indexOf(".");
      if (dot !== -1 && pos > dot) {
        const decimals = text.slice(dot + 1);
        if (decimals.length >= safeDecimals) {
          e.preventDefault();
          return;
        }
      }
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      stopSpin();
    }
  };

  const handleInput = () => {
    sanitizeDuringEdit();
  };

  const handleBlur = () => {
    normalizeOnBlur();
  };
  useEffect(() => {
    const v = value !== undefined ? value : initialValue;
    writeValue(v);
  }, [value, initialValue]);

  useEffect(() => {
    return () => stopSpin();
  }, []);

  return (
    <div
      className={`inline-decimal-wrapper${className ? ` ${className}` : ""}`}
      style={style}
    >
      <span
        ref={spanRef}
        id="inline-decimal"
        contentEditable
        suppressContentEditableWarning
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onInput={handleInput}
        onBlur={handleBlur}
        style={{ paddingRight: 2, display: "inline-block", ...inputStyle }}
      />
    </div>
  );
}
