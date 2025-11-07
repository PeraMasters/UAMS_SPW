import React, { useEffect, useMemo, useState } from "react";

/**
 * AddRoomModal
 * -------------------------------------------------
 * Modal to create or edit a room (pure UI; persistence handled by parent).
 *
 * Props:
 *  - isOpen: boolean
 *  - mode: 'create' | 'edit'
 *  - initialData?: { id?, venue?, status? }
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
    status: initialData.status || "Available",
  }), [initialData]);

  const [values, setValues] = useState(defaults);
  const [err, setErr] = useState("");

  useEffect(() => setValues(defaults), [defaults]);

  if (!isOpen) return null;

  const handle = (k) => (e) => {
    const v = e.target.value;
    setValues((cur) => ({
      ...cur,
      [k]: v,
    }));
  };

  const validate = () => {
    if (!values.venue.trim()) return "Venue is required.";
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
