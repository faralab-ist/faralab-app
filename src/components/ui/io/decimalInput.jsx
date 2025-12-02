import React, { useRef, useEffect } from "react";
export function InlineDecimalInput({
  initialValue = 0,
  step = 0.01,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  onChange,
}) {
  const spanRef = useRef(null);

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

  function sanitizeDuringEdit() {
    const el = spanRef.current;
    if (!el) return;

    let txt = el.textContent || "";
    txt = txt.replace(/[^\d.]/g, "");

    const f = txt.indexOf(".");
    if (f !== -1) {
      const before = txt.slice(0, f + 1);
      const after = txt.slice(f + 1).replace(/\./g, "");
      txt = before + after;
    }

    if (!txt.includes(".")) {
      txt = txt === "" ? "." : txt + ".";
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
    let txt = el.textContent || "";
    txt = txt.replace(/[^\d.]/g, "");

    if (txt === "" || txt === ".") {
      writeValue(0);
      return;
    }

    const first = txt.indexOf(".");
    if (first === -1) {
      let digits = txt.replace(/\D/g, "");
      if (digits.length === 0) digits = "000";
      if (digits.length === 1) digits = "0" + digits;
      if (digits.length === 2) digits = "0" + digits;
      const intPart = digits.slice(0, -2);
      const fracPart = digits.slice(-2);
      el.textContent = intPart + "." + fracPart;
    } else {
      let pre = txt.slice(0, first).replace(/\D/g, "");
      let pos = txt.slice(first + 1).replace(/\D/g, "");

      if (pre === "") pre = "0";
      if (pos.length === 0) pos = "00";
      else if (pos.length === 1) pos = pos + "0";
      else if (pos.length > 2) pos = pos.slice(0, 2);

      el.textContent = pre + "." + pos;
    }

    const v = readValue();
    writeValue(v);
    if (onChange) onChange(v);
    const sel = window.getSelection();
    sel.removeAllRanges();
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

    // ENTER: submete e perde foco
    if (e.key === "Enter") {
      e.preventDefault();
      normalizeOnBlur();
      el.blur();
      return;
    }

    const sel = window.getSelection();
    const text = el.textContent || "";
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const pos = range.startOffset;

    if (e.key === "Backspace" && text[pos - 1] === ".") {
      e.preventDefault();
      return;
    }
    if (e.key === "Delete" && text[pos] === ".") {
      e.preventDefault();
      return;
    }

    const allow = ["Backspace", "Delete", "Tab", "Home", "End"];
    if (allow.includes(e.key)) return;

    if (e.key === ".") {
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepValue(step);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      stepValue(-step);
      return;
    }

    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleInput = () => {
    sanitizeDuringEdit();
  };

  const handleBlur = () => {
    normalizeOnBlur();
  };

  const handleArrowUpClick = (e) => {
    e.preventDefault();
    stepValue(step);
  };

  const handleArrowDownClick = (e) => {
    e.preventDefault();
    stepValue(-step);
  };

  useEffect(() => {
    writeValue(initialValue);
  }, [initialValue]);

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
        onInput={handleInput}
        onBlur={handleBlur}
        style={{ paddingRight: 22 }}
      />
      <div className="inline-decimal-arrows">
        <div className="inline-decimal-arrow" onMouseDown={handleArrowUpClick}>
          ▲
        </div>
        <div className="inline-decimal-arrow" onMouseDown={handleArrowDownClick}>
          ▼
        </div>
      </div>
    </div>
  );
}