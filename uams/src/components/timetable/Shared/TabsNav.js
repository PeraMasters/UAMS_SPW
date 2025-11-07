import React from "react";

/**
 * TabsNav (mobile-first)
 * --------------------------------------------
 * Shown under the header on small screens (sidebar is hidden there).
 * Props:
 *  - items: [{ key: string, label: string }]
 *  - activeKey: string
 *  - onChange: (key: string) => void
 */
export default function TabsNav({ items = [], activeKey, onChange }) {
  return (
    <div className="tt-tabs" role="tablist" aria-label="Timetable tabs">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`tt-tab ${activeKey === it.key ? "active" : ""}`}
          onClick={() => onChange(it.key)}
          role="tab"
          aria-selected={activeKey === it.key}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
