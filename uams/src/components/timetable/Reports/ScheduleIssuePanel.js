import React from "react";

/**
 * ScheduleIssuesPanel
 * --------------------------------------------
 * List of current issues / conflicts with severity pills.
 * Props:
 *  - items: Array<{ id: string, title: string, severity: 'High'|'Medium'|'Low' }>
 */
export default function ScheduleIssuesPanel({ items = [] }) {
  const pillClass = (sev) =>
    "tt-pill " +
    (sev === "High" ? "tt-pill-amber" : sev === "Medium" ? "tt-pill-gray" : "tt-pill-gray");

  return (
    <div className="tt-card tt-panel">
      <h3 style={{ marginTop: 0 }}>Schedule Issues</h3>
      {items.length === 0 ? (
        <div className="tt-warning">No issues detected.</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {items.map((it) => (
            <li key={it.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 999, background: "#f59e0b",
                display: "inline-block"
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{it.title}</div>
              </div>
              <span className={pillClass(it.severity)}>{it.severity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
