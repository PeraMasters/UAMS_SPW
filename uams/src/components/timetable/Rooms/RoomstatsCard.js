import React from "react";

export default function RoomStatsCards({ stats = { total: 0, available: 0, maintenance: 0 } }) {
  const items = [
    { label: "Total Rooms", value: stats.total ?? 0 },
    { label: "Available", value: stats.available ?? 0 },
    { label: "Maintenance", value: stats.maintenance ?? 0 },
  ];

  return (
    <div className="tt-card" style={{ marginTop: 0 }}>
      <div className="tt-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
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
