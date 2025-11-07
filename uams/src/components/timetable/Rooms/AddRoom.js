import React, { useEffect, useMemo, useState } from "react";

/**
 * AddRoomModal
 * -------------------------------------------------
 * Modal to create or edit a room (pure UI; persistence handled by parent).
 *
 * Props:
 *  - isOpen: boolean
 *  - mode: 'create' | 'edit'
 *  - initialData?: { id?, venue?, building?, capacity?, status?, utilization? }
 *  - onClose: () => void
 *  - onSaved: (roomObj) => void
 *  - onDeleted?: (id) => void
 */
export default function AddRoomModal({
  isOpen,
  mode = "create",
  initialData = {},
  onClose,
  onSaved,
  onDeleted,
}) {
  const isEdit = mode === "edit";

  const defaults = useMemo(() => ({
    venue: initialData.venue || "",
    building: initialData.building || "Computing",
    capacity: Number.isFinite(initialData.capacity) ? initialData.capacity : 60,
    status: initialData.status || "Available",
    utilization: Number.isFinite(initialData.utilization) ? initialData.utilization : 0,
  }), [initialData]);

  const [values, setValues] = useState(defaults);
  const [err, setErr] = useState("");

  useEffect(() => setValues(defaults), [defaults]);

  if (!isOpen) return null;

  const handle = (k) => (e) => {
    const v = e.target.value;
    setValues((cur) => ({
      ...cur,
      [k]:
        k === "capacity" || k === "utilization"
          ? Number(v || 0)
          : v,
    }));
  };

  const validate = () => {
    if (!values.venue.trim()) return "Venue is required.";
    if (!values.building.trim()) return "Building is required.";
    if (values.capacity <= 0) return "Capacity must be greater than 0.";
    if (values.utilization < 0 || values.utilization > 100) return "Utilization must be 0–100.";
    return "";
  };

  const onSave = () => {
    const msg = validate();
    if (msg) return setErr(msg);
    const payload = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      ...values,
    };
    onSaved?.(payload);
  };

  const onDelete = () => {
    if (!isEdit || !initialData?.id) return;
    if (window.confirm("Delete this room?")) {
      onDeleted?.(initialData.id);
    }
  };

  const title = isEdit ? "Edit Room" : "Add Room";

  return (
    <div className="tt-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="tt-modal" role="dialog" aria-modal="true" aria-labelledby="tt-room-modal-title">
        <div className="tt-modal-header">
          <h2 id="tt-room-modal-title">{title}</h2>
          <button className="tt-close" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        {err ? <div className="tt-error" role="alert">{err}</div> : null}

        <div className="tt-form">
          {/* Venue */}
          <div className="tt-form-row">
            <label htmlFor="rm-venue">Venue</label>
            <input id="rm-venue" className="tt-input" value={values.venue} onChange={handle("venue")} placeholder="e.g., C-101" />
          </div>

          {/* Building */}
          <div className="tt-form-row">
            <label htmlFor="rm-building">Building</label>
            <select id="rm-building" className="tt-select" value={values.building} onChange={handle("building")}>
              <option>Computing</option>
              <option>Engineering</option>
              <option>Business</option>
              <option>Humanities</option>
            </select>
          </div>

          {/* Capacity */}
          <div className="tt-form-row">
            <label htmlFor="rm-capacity">Capacity</label>
            <input id="rm-capacity" type="number" className="tt-input" value={values.capacity} onChange={handle("capacity")} />
          </div>

          {/* Utilization */}
          <div className="tt-form-row">
            <label htmlFor="rm-util">Utilization (%)</label>
            <input id="rm-util" type="number" className="tt-input" value={values.utilization} onChange={handle("utilization")} />
          </div>

          {/* Status */}
          <div className="tt-form-row">
            <label htmlFor="rm-status">Status</label>
            <select id="rm-status" className="tt-select" value={values.status} onChange={handle("status")}>
              <option>Available</option>
              <option>Occupied</option>
              <option>Maintenance</option>
            </select>
          </div>

          {/* Footer */}
          <div className="tt-modal-footer">
            {isEdit && initialData?.id ? (
              <button type="button" className="tt-btn tt-btn-secondary" onClick={onDelete}>
                Delete
              </button>
            ) : (
              <span />
            )}
            <div>
              <button type="button" className="tt-btn tt-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="tt-btn tt-btn-primary" onClick={onSave} style={{ marginLeft: 8 }}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
