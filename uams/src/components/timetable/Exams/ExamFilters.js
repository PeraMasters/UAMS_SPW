// src/components/timetable/Exams/ExamFilters.js
import React from "react";

/**
 * ExamFilters (Exam Management only)
 * Props:
 *  - values: { type: string, category: string, status: string }
 *  - onChange: (partial: object) => void
 *  - onView: () => void
 */
export default function ExamFilters({
  values = { type: "All", category: "All", status: "All" },
  onChange = () => {},
  onView = () => {},
}) {
  const safeOnChange = typeof onChange === "function" ? onChange : () => {};
  const handle = (key) => (e) => safeOnChange({ [key]: e.target.value });

  const TYPE_OPTS = ["All", "Proper", "Repeat"];
  const CAT_OPTS = ["All", "Mid", "Practical", "Final"];
  const STATUS_OPTS = ["All", "Scheduled", "Completed", "Postponed", "Cancelled"];

  return (
    <div className="tt-card">
      <div className="tt-row tt-row-end">
        {/* Exam Type */}
        <div className="tt-field">
          <label className="tt-label">Exam Type</label>
          <select
            className="tt-input"
            value={values.type}
            onChange={handle("type")}
            aria-label="Exam Type"
          >
            {TYPE_OPTS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Exam Category */}
        <div className="tt-field">
          <label className="tt-label">Exam Category</label>
          <select
            className="tt-input"
            value={values.category}
            onChange={handle("category")}
            aria-label="Exam Category"
          >
            {CAT_OPTS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Exam Status */}
        <div className="tt-field">
          <label className="tt-label">Exam Status</label>
          <select
            className="tt-input"
            value={values.status}
            onChange={handle("status")}
            aria-label="Exam Status"
          >
            {STATUS_OPTS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* View button */}
        <div className="tt-field tt-field-button">
          <button
            type="button"
            className="tt-btn tt-btn-primary"
            onClick={() => {
              if (typeof onView === "function") onView();
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}
