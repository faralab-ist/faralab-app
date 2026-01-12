import React, { useRef, useEffect } from "react";

export function InlineDecimalInput({
  initialValue = 0,
  step = 0.01,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  onChange,
  value,
  spinners = true,
}) {
  const spanRef = useRef(null);
  const spinRef = useRef(null);

  function format(v) {
    if (isNaN(v)) v = 0;
    v = Math.min(max, Math.max(min, v));
    return v.toFixed(2);
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
    if (first !== -1) {
      const before = txt.slice(0, first + 1);
      let after = txt.slice(first + 1).replace(/\./g, "");
      after = after.slice(0, 2);
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
      return;
    }

    const first = txt.indexOf(".");
    if (first === -1) {
      let intPart = txt || "0";
      if (intPart === "-") intPart = "-0";
      el.textContent = intPart + ".00";
    } else {
      let pre = txt.slice(0, first);
      let pos = txt.slice(first + 1);

      if (pre === "" || pre === "-") pre = pre + "0";
      pos = pos.slice(0, 2).padEnd(2, "0");

      el.textContent = pre + "." + pos;
    }

    const v = readValue();
    writeValue(v);
    if (onChange) onChange(v);
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

    if (e.key === "." || e.key === ",") return;
    
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
        if (decimals.length >= 2) {
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

  const handleArrowUpMouseDown = (e) => {
    e.preventDefault();
    startSpin(step);
  };

  const handleArrowDownMouseDown = (e) => {
    e.preventDefault();
    startSpin(-step);
  };

  const handleArrowMouseUpLeave = () => {
    stopSpin();
  };

  useEffect(() => {
    const v = value !== undefined ? value : initialValue;
    writeValue(v);
  }, [value, initialValue]);

  useEffect(() => {
    return () => stopSpin();
  }, []);

  return (
    <div className="inline-decimal-wrapper">
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
        style={{ paddingRight: 22 }}
      />
      {spinners && (
      <div className="inline-decimal-arrows">
        <div
          className="inline-decimal-arrow"
          onMouseDown={handleArrowUpMouseDown}
          onMouseUp={handleArrowMouseUpLeave}
          onMouseLeave={handleArrowMouseUpLeave}
        >
          ▲
        </div>
        <div
          className="inline-decimal-arrow"
          onMouseDown={handleArrowDownMouseDown}
          onMouseUp={handleArrowMouseUpLeave}
          onMouseLeave={handleArrowMouseUpLeave}
        >
          ▼
        </div>
      </div>
      )}
    </div>
  );
}