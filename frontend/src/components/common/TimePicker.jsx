import React, { useState, useEffect, useRef } from "react";

/**
 * CustomTimePicker
 * Props:
 *   value    {string} HH:MM (24-hour format stored in state/DB)
 *   onChange {fn}     called with (name, "HH:MM")
 *   name     {string} field name forwarded to onChange
 *   label    {string} optional label
 *   disabled {boolean}
 */
const TimePicker = ({ value = "", onChange, name, label, disabled }) => {
  const parse24 = (v) => {
    if (!v) return { h24: 0, m: 0 };
    const [hStr, mStr] = v.split(":");
    return { h24: parseInt(hStr, 10) || 0, m: parseInt(mStr, 10) || 0 };
  };

  const [open, setOpen] = useState(false);
  const [is24, setIs24] = useState(false);

  const { h24: initH, m: initM } = parse24(value);
  const [h24, setH24] = useState(initH);
  const [minute, setMinute] = useState(initM);

  const wrapRef = useRef(null);
  const hourRef = useRef(null);
  const minRef = useRef(null);

  // Emit value as 24-h string
  const emit = (newH24, newM) => {
    onChange(name, `${String(newH24).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
  };

  // Sync from external value
  useEffect(() => {
    const { h24: h, m } = parse24(value);
    setH24(h);
    setMinute(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll selected into view
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      hourRef.current?.querySelector("[data-sel]")?.scrollIntoView({ block: "center" });
      minRef.current?.querySelector("[data-sel]")?.scrollIntoView({ block: "center" });
    }, 40);
  }, [open]);

  // Derived display period for 12h mode
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  // Hour array changes based on mode
  const hoursArr = is24
    ? Array.from({ length: 24 }, (_, i) => i)
    : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const minutesArr = Array.from({ length: 60 }, (_, i) => i);

  const handleHour = (h) => {
    let newH24;
    if (is24) {
      newH24 = h;
    } else {
      if (period === "AM") newH24 = h === 12 ? 0 : h;
      else newH24 = h === 12 ? 12 : h + 12;
    }
    setH24(newH24);
    emit(newH24, minute);
  };

  const handleMinute = (m) => {
    setMinute(m);
    emit(h24, m);
  };

  const handlePeriod = (p) => {
    setIs24(false);
    let newH24 = h24;
    if (p === "AM" && h24 >= 12) newH24 = h24 - 12;
    if (p === "PM" && h24 < 12) newH24 = h24 + 12;
    setH24(newH24);
    emit(newH24, minute);
  };

  const handle24 = () => {
    setIs24(true);
    emit(h24, minute);
  };

  const display = () => {
    if (!value) return "--:--";
    const mStr = String(minute).padStart(2, "0");
    if (is24) return `${String(h24).padStart(2, "0")}:${mStr}`;
    return `${String(h12).padStart(2, "0")}:${mStr} ${period}`;
  };

  const selectedHourIn12 = (h) => !is24 && h12 === h;
  const selectedHourIn24 = (h) => is24 && h24 === h;

  return (
    <div className="relative" ref={wrapRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={[
          "w-full flex items-center justify-between border rounded-md shadow-sm py-2 px-3 text-sm bg-white transition-all",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-indigo-400",
          open ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-300",
        ].join(" ")}
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>{display()}</span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[9999] mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl flex overflow-hidden select-none">
          {/* Hours column */}
          <div ref={hourRef} className="w-14 h-52 overflow-y-auto border-r border-gray-100" style={{ scrollbarWidth: "none" }}>
            {hoursArr.map((h) => {
              const sel = is24 ? selectedHourIn24(h) : selectedHourIn12(h);
              return (
                <div
                  key={h}
                  data-sel={sel ? "" : undefined}
                  onClick={() => handleHour(h)}
                  className={[
                    "py-2 text-center text-sm cursor-pointer transition-colors",
                    sel ? "bg-indigo-600 text-white font-bold" : "text-gray-700 hover:bg-indigo-50",
                  ].join(" ")}
                >
                  {String(h).padStart(2, "0")}
                </div>
              );
            })}
          </div>

          {/* Minutes column */}
          <div ref={minRef} className="w-14 h-52 overflow-y-auto border-r border-gray-100" style={{ scrollbarWidth: "none" }}>
            {minutesArr.map((m) => (
              <div
                key={m}
                data-sel={minute === m ? "" : undefined}
                onClick={() => handleMinute(m)}
                className={[
                  "py-2 text-center text-sm cursor-pointer transition-colors",
                  minute === m ? "bg-indigo-600 text-white font-bold" : "text-gray-700 hover:bg-indigo-50",
                ].join(" ")}
              >
                {String(m).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Period selector: PM / AM / separator / 24h */}
          <div className="flex flex-col items-center justify-start pt-3 px-1.5 gap-1.5 min-w-[52px]">
            {["PM", "AM"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriod(p)}
                className={[
                  "w-10 py-1.5 rounded-lg text-xs font-bold transition-colors",
                  !is24 && period === p
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-gray-100 text-gray-600 hover:bg-indigo-100",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
            <div className="w-8 border-t border-gray-200 my-0.5" />
            <button
              type="button"
              onClick={handle24}
              className={[
                "w-10 py-1.5 rounded-lg text-xs font-bold transition-colors",
                is24 ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-indigo-100",
              ].join(" ")}
            >
              24h
            </button>
          </div>
        </div>
      )}

      {/* Preview text */}
      {value && (
        <p className="mt-0.5 text-xs text-indigo-500 font-medium">{display()}</p>
      )}
    </div>
  );
};

export default TimePicker;
