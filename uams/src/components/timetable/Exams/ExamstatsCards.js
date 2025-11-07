// src/components/timetable/Exams/ExamstatsCards.js
import React from "react";

/**
 * ExamStatsCards
 * Props:
 *  - stats: { total, upcoming, completed, postponed }
 * Notes:
 *  - GLOBAL snapshot counts (unfiltered).
 */
export default function ExamStatsCards({
  stats = { total: 0, upcoming: 0, completed: 0, postponed: 0 },
}) {
  const items = [
    { label: "Total Exams", value: stats.total ?? 0 },
    { label: "Upcoming", value: stats.upcoming ?? 0 },
    { label: "Completed", value: stats.completed ?? 0 },
    { label: "Postponed", value: stats.postponed ?? 0 },
  ];

  return (
    <div className="tt-card">
      <div className="tt-row tt-row-4">
        {items.map((it) => (
          <div key={it.label} className="tt-field">
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
