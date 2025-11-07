import React from "react";

/**
 * RoomTable
 * --------------------------------------------
 * Props:
 *  - rooms: [{ id, venue, building, capacity, status, utilization }]
 *  - loading: boolean
 *  - onEdit: (room) => void
 */
export default function RoomTable({ rooms = [], loading = false, onEdit }) {
  return (
    <div className="tt-table-wrap">
      <table className="tt-table" role="table" aria-label="Room list">
        <thead>
          <tr>
            <th>Venue</th>
            <th>Building</th>
            <th>Capacity</th>
            <th>Utilization</th>
            <th className="tt-center">Status</th>
            <th className="tt-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6}><div className="tt-loading"><div className="tt-skeleton" /></div></td></tr>
          ) : rooms.length === 0 ? (
            <tr><td colSpan={6} className="tt-center" style={{ padding: 18, color: "#6b7280" }}>No rooms found.</td></tr>
          ) : (
            rooms.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.venue}</strong></td>
                <td>{r.building}</td>
                <td>{r.capacity}</td>
                <td>
                  <span className="tt-util-bar">
                    <span className="tt-util-fill" style={{ width: `${Math.max(0, Math.min(100, r.utilization || 0))}%` }} />
                  </span>
                  {Math.round(r.utilization || 0)}%
                </td>
                <td className="tt-center">
                  <span
                    className={
                      "tt-pill " +
                      (r.status === "Available"
                        ? "tt-pill-green"
                        : r.status === "Occupied"
                        ? "tt-pill-amber"
                        : "tt-pill-gray")
                    }
                  >
                    {r.status || "—"}
                  </span>
                </td>
                <td className="tt-center">
                  <button className="tt-icon-btn" title="Edit" onClick={() => onEdit?.(r)}>✏️</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
