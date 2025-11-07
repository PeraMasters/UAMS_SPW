// src/components/timetable/Rooms/RoomManagement.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "../../../lib/supabaseClient";
import AddRoomModal from "./AddRoom";

// Small helpers
const todayISO = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });

const STATUS_OPTS = ["All", "Available", "Maintenance", "Occupied"];

function RoomFilters({ values, onChange, onView }) {
  const handle = (k) => (e) => onChange({ [k]: e.target.value });

  return (
    <div className="tt-card">
      <div className="tt-row tt-row-end">
        {/* Search */}
        <div className="tt-field">
          <label className="tt-label">Search</label>
          <input
            className="tt-input"
            placeholder="Search by venue"
            value={values.q}
            onChange={handle("q")}
          />
        </div>

        {/* Status */}
        <div className="tt-field">
          <label className="tt-label">Status</label>
          <select
            className="tt-input"
            value={values.status}
            onChange={handle("status")}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* View button */}
        <div className="tt-field tt-field-button">
          <button type="button" className="tt-btn tt-btn-primary" onClick={onView}>
            View
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomTable({ rows, loading, onChangeStatus }) {
  const ACTIONS = ["Available", "Maintenance", "Occupied"];

  return (
    <div className="tt-card">
      <div className="tt-table-wrap">
        <table className="tt-table">
          <thead>
            <tr>
              <th>Venue</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="tt-cell-center" colSpan={3}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="tt-cell-center" colSpan={3}>
                  No rooms found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.vid}>
                  <td>{r.venue}</td>
                  <td>
                    <span
                      className={
                        r.status === "Occupied"
                          ? "tt-badge tt-badge-danger"
                          : r.status === "Maintenance"
                          ? "tt-badge tt-badge-warn"
                          : "tt-badge"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="tt-input"
                      defaultValue=""
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        await onChangeStatus(r.vid, val);
                        e.target.value = "";
                      }}
                    >
                      <option value="" disabled>
                        Update status…
                      </option>
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
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

export default function RoomManagement() {
  // KPI snapshot
  const [kpis, setKpis] = useState({ total: 0, available: 0, maintenance: 0, occupied: 0 });

  // Filters
  const [filters, setFilters] = useState({ q: "", status: "All" });

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add Room modal state and header-button hookup
  const [openAdd, setOpenAdd] = useState(false);
  useEffect(() => {
    const handler = () => setOpenAdd(true);
    document.addEventListener("tt.openAddRoomModal", handler);
    return () => document.removeEventListener("tt.openAddRoomModal", handler);
  }, []);

  const handleFilterChange = (partial) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  // Build a Set of vids that are booked today or later
  const getOccupiedSet = useCallback(async () => {
    const today = todayISO();

    const [classesRes, examsRes] = await Promise.all([
      supabase
        .from("classtimetable")
        .select("vid, date")
        .gte("date", today),
      supabase
        .from("examtimetable")
        .select("vid, date")
        .gte("date", today),
    ]);

    if (classesRes.error) throw classesRes.error;
    if (examsRes.error) throw examsRes.error;

    const occ = new Set();
    (classesRes.data || []).forEach((r) => r.vid && occ.add(String(r.vid)));
    (examsRes.data || []).forEach((r) => r.vid && occ.add(String(r.vid)));
    return occ;
  }, []);

  // Load table with auto-status logic
  const loadTable = useCallback(
    async (opts = filters) => {
      setLoading(true);
      try {
        // 1) pull locations
        const { data, error } = await supabase
          .from("location")
          .select("vid, venue, status, wifi_ssid, capacity");
        if (error) throw error;

        // 2) get occupied set for today+
        const occupied = await getOccupiedSet();

        // 3) compute effective status
        let list = (data || []).map((r) => {
          const isOccupied = occupied.has(String(r.vid));
          const effective =
            isOccupied ? "Occupied" : r.status ? r.status : "Available";
          return {
            vid: r.vid,
            venue: r.venue || "",
            status: effective,
          };
        });

        // 4) apply filters
        if (opts.q) {
          const q = opts.q.toLowerCase();
          list = list.filter((r) => r.venue.toLowerCase().includes(q));
        }
        if (opts.status && opts.status !== "All") {
          list = list.filter((r) => r.status === opts.status);
        }

        setRows(list);

        // 5) KPIs from effective statuses (global snapshot)
        const total = (data || []).length;
        const available = list.filter((r) => r.status === "Available").length;
        const maintenance = list.filter((r) => r.status === "Maintenance").length;
        const occupiedCount = list.filter((r) => r.status === "Occupied").length;
        setKpis({ total, available, maintenance, occupied: occupiedCount });
      } finally {
        setLoading(false);
      }
    },
    [filters, getOccupiedSet]
  );

  // Initial load
  useEffect(() => {
    loadTable();
  }, [loadTable]);

  const handleView = () => loadTable(filters);

  // Persist newly added room and refresh table
  const handleSaveRoom = async (room) => {
    try {
      const payload = {
        venue: room.venue,
        status: room.status || "Available",
        capacity: Number.isFinite(room.capacity) ? room.capacity : null,
      };
      const { error } = await supabase.from("location").insert(payload);
      if (error) throw error;
      setOpenAdd(false);
      await loadTable();
    } catch (e) {
      console.error(e);
      alert("Failed to save room. Please try again.");
    }
  };

  // Persist manual status update
  const handleChangeStatus = async (vid, newStatus) => {
    // If the room is actually occupied by schedule, we still let you set it
    // but the computed status on next reload will show "Occupied".
    const { error } = await supabase
      .from("location")
      .update({ status: newStatus })
      .eq("vid", vid);
    if (error) throw error;

    // Update UI immediately
    setRows((prev) =>
      prev.map((r) => (String(r.vid) === String(vid) ? { ...r, status: newStatus } : r))
    );
    // Refresh KPIs (cheap local recompute)
    setKpis((prev) => ({
      ...prev,
      available: rows.filter((r) => r.status === "Available").length,
      maintenance: rows.filter((r) => r.status === "Maintenance").length,
      occupied: rows.filter((r) => r.status === "Occupied").length,
    }));
  };

  // KPI items (we keep your style classes)
  const kpiItems = useMemo(
    () => [
      { label: "Total Rooms", value: kpis.total },
      { label: "Available", value: kpis.available },
      { label: "Occupied", value: kpis.occupied },
      { label: "Maintenance", value: kpis.maintenance },
    ],
    [kpis]
  );

  return (
    <>
      {/* KPI cards */}
      <div className="tt-card">
        <div className="tt-row tt-row-4">
          {kpiItems.map((it) => (
            <div key={it.label} className="tt-field">
              <div className="tt-stat-box">
                <div className="tt-stat-value">{it.value}</div>
                <div className="tt-stat-label">{it.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <RoomFilters
        values={filters}
        onChange={handleFilterChange}
        onView={handleView}
      />

      {/* Table */}
      <RoomTable rows={rows} loading={loading} onChangeStatus={handleChangeStatus} />

      {/* Add Room Modal */}
      <AddRoomModal
        isOpen={openAdd}
        onClose={() => setOpenAdd(false)}
        onSaved={handleSaveRoom}
      />
    </>
  );
}
