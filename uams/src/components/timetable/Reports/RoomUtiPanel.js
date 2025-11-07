import React from "react";

/**
 * RoomUtilizationPanel
 * --------------------------------------------
 * Horizontal bar chart-like list (no external libs).
 * Props:
 *  - data: Array<{ building: string, pct: number }>
 */
export default function RoomUtilizationPanel({ data = [] }) {
  return (
    <div className="tt-card tt-panel">
      <h3 style={{ marginTop: 0 }}>Room Utilization</h3>
      <div>
        {data.map((d) => (
          <div key={d.building} className="tt-bar-row">
            <div className="tt-bar-label"><strong>{d.building}</strong></div>
            <div className="tt-bar-track">
              <div className="tt-bar-fill" style={{ width: `${Math.max(0, Math.min(100, d.pct))}%` }} />
            </div>
            <div className="tt-bar-val">{Math.round(d.pct)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
