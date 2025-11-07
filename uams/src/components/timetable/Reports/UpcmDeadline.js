import React from "react";

/**
 * UpcomingDeadlinesPanel
 * --------------------------------------------
 * Right-side panel listing deadlines with dates.
 * Props:
 *  - items: Array<{ id: string, label: string, date: 'YYYY-MM-DD' }>
 */
export default function UpcomingDeadlinesPanel({ items = [] }) {
  return (
    <div className="tt-card tt-panel">
      <h3 style={{ marginTop: 0 }}>Upcoming Deadlines</h3>
      {items.length === 0 ? (
        <div className="tt-warning">No deadlines in the next 2 weeks.</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {items.map((d) => (
            <li key={d.id} style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "center",
              padding: "10px 12px",
              border: "1px solid var(--tt-border)",
              borderRadius: 10,
              background: "#fff"
            }}>
              <div style={{ fontWeight: 700 }}>{d.label}</div>
              <div className="tt-pill tt-pill-gray">{d.date}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
