import React from "react";
export default function DashboardStats({ stats = { lectures: 0, exams: 0, clashes: 0, rooms: 0 } }) {
  const items = [
    { label: "Lectures Scheduled", value: stats.lectures ?? 0 },
    { label: "Exams Scheduled", value: stats.exams ?? 0 },
    { label: "Detected Clashes", value: stats.clashes ?? 0 },
    { label: "Active Rooms", value: stats.rooms ?? 0 },
  ];

  return (
    <div className="tt-card" style={{ marginTop: 0 }}>
      <div className="tt-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {items.map((it) => (
          <div key={it.label} className="tt-field" style={{ minWidth: 180 }}>
            <div className="tt-stat-box">
              <div className="tt-stat-value">{it.value}</div>
              <div className="tt-stat-label">{it.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
