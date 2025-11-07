import React from "react";

/**
 * SideNav
 * --------------------------------------------
 * Left navigation bar inside the Timetable module.
 * Props:
 *  - activeKey: currently selected section
 *  - onChange: function(key) → called when user clicks an item
 */
export default function SideNav({ activeKey, onChange }) {
  const items = [
    { key: "overview", label: "Timetable Overview", icon: "📅" },
    { key: "exams",    label: "Exam Management",     icon: "📝" },
    { key: "rooms",    label: "Room Management",     icon: "🏫" },
    { key: "reports",  label: "Reports & Analytics", icon: "📊" },
  ];

  return (
    <aside className="tt-sidenav" aria-label="Timetable navigation">
      <div className="tt-sidenav-header">Timetable</div>
      <nav className="tt-sidenav-list">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`tt-sidenav-item ${
              activeKey === it.key ? "active" : ""
            }`}
            onClick={() => onChange(it.key)}
          >
            <span className="tt-sidenav-icon" aria-hidden="true">
              {it.icon}
            </span>
            <span className="tt-sidenav-label">{it.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
