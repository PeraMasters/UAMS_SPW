// src/components/timetable/Rooms/RoomFilter.js
import React from "react";

const STATUS_OPTIONS = ["All", "Available", "Maintenance", "Occupied"];

export default function RoomFilters({ values, onChange }) {
  const handleChange = (key) => (e) => onChange({ [key]: e.target.value });

  return (
    <div className="tt-card">
      <div className="tt-row tt-row-end">
        {/* Search Field */}
        <div className="tt-field">
          <label className="tt-label">Search</label>
          <input
            type="text"
            className="tt-input"
            placeholder="Search by venue"
            value={values.search || ""}
            onChange={handleChange("search")}
          />
        </div>

        {/* Status Dropdown */}
        <div className="tt-field">
          <label className="tt-label">Status</label>
          <select
            className="tt-input"
            value={values.status || "All"}
            onChange={handleChange("status")}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons: View + Reset */}
        <div
          className="tt-field tt-field-button"
          style={{ display: "flex", gap: "10px", alignItems: "end" }}
        >
          <button
            type="button"
            className="tt-btn tt-btn-primary"
            onClick={() =>
              document.dispatchEvent(new Event("tt.refreshRooms"))
            }
          >
            View
          </button>

          <button
            type="button"
            className="tt-btn"
            onClick={() => {
              onChange({ search: "", status: "All" });
              document.dispatchEvent(new Event("tt.refreshRooms"));
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
