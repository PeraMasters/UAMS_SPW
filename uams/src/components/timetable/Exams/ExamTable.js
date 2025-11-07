// src/components/timetable/Exams/ExamTable.js
import React from "react";

/**
 * ExamTable
 * Props:
 *  - loading: boolean
 *  - rows: Array<{
 *      id, cid, course_name, exam_type, exam_category,
 *      date, start_time, end_time, venue_name, lecturer_name, status
 *    }>
 *  - onChangeStatus: (id, newStatus) => Promise<void>
 */
export default function ExamTable({ loading, rows = [], onChangeStatus }) {
  const fmtTime = (t) => (t ? t.slice(0, 5) : "—"); // HH:MM
  const fmtRange = (s, e) => {
    if (!s && !e) return "—";
    return `${fmtTime(s)}–${fmtTime(e)}`;
  };

  const statusClass = (status) => {
    const s = (status || "Scheduled").toLowerCase();
    if (s === "completed") return "tt-badge tt-badge-success";
    if (s === "postponed") return "tt-badge tt-badge-warn";
    if (s === "cancelled" || s === "canceled") return "tt-badge tt-badge-danger";
    return "tt-badge"; // Scheduled / others
  };

  const ACTION_OPTS = ["Postponed", "Completed", "Cancelled"];

  return (
    <div className="tt-card">
      <div className="tt-table-wrap">
        <table className="tt-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Course Name</th>
              <th>Exam Type</th>
              <th>Exam Category</th>
              <th>Date</th>
              <th>Time</th>
              <th>Venue</th>
              <th>Lecturer</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="tt-cell-center">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="tt-cell-center">No exams found.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.cid || "—"}</td>
                  <td>{r.course_name || "—"}</td>
                  <td>{r.exam_type || "—"}</td>
                  <td>{r.exam_category || "—"}</td>
                  <td>{r.date || "—"}</td>
                  <td>{fmtRange(r.start_time, r.end_time)}</td>
                  <td>{r.venue_name || "—"}</td>
                  <td>{r.lecturer_name || "—"}</td>
                  <td>
                    <span className={statusClass(r.status)}>
                      {r.status || "Scheduled"}
                    </span>
                  </td>
                  <td>
                    <select
                      className="tt-input"
                      defaultValue=""
                      onChange={async (e) => {
                        const value = e.target.value;
                        if (!value) return;
                        await onChangeStatus(r.id, value);
                        e.target.value = ""; // reset to placeholder
                      }}
                    >
                      <option value="" disabled>Update status…</option>
                      {ACTION_OPTS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
