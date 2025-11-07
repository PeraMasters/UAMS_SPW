import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import supabase from "../../../lib/supabaseClient";
import "./schedule-modal.css";

export default function ScheduleModal({ open, onClose, onSaved, slot }) {
  // --------------------- state ---------------------
  const [eventType, setEventType] = useState("Lecture"); // 'Lecture' | 'Exam'

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]); // degree table
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState(""); // degree id
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [lecturerId, setLecturerId] = useState("");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [roomVid, setRoomVid] = useState("");
  const [recurring, setRecurring] = useState("Single Occurrence");

  const [roomConflicts, setRoomConflicts] = useState([]);
  const [lecConflicts, setLecConflicts] = useState([]);
  const [altRooms, setAltRooms] = useState([]);
  const [altTime, setAltTime] = useState(null);
  const [saving, setSaving] = useState(false);
  // Exam-only fields
  const [examCategory, setExamCategory] = useState("Mid"); // Mid | Practical | Final

  // --------------------- body scroll lock while open ---------------------
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  // --------------------- fetch reference data ---------------------
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    (async () => {
      const [{ data: fac }, { data: dep }, { data: crs }, { data: lec }, { data: loc }] =
        await Promise.all([
          supabase.from("faculty").select("*").order("fname", { ascending: true }),
          supabase.from("degree").select("*").order("dname", { ascending: true }),
          supabase.from("course").select("*").order("cname", { ascending: true }),
          supabase.from("lecturer").select("*").order("l_name", { ascending: true }),
          supabase.from("location").select("*").order("venue", { ascending: true }),
        ]);

      if (!mounted) return;
      setFaculties(fac || []);
      setDepartments(dep || []);
      setCourses(crs || []);
      setLecturers(lec || []);
      setRooms(loc || []);
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  // ✅ Prefill date/time from slot (+ button or header button)
  useEffect(() => {
    if (!open) return;
    if (slot?.date)  setDate(slot.date);
    if (slot?.start) setStart(slot.start);
    if (slot?.end)   setEnd(slot.end);
  }, [open, slot]);

  // Reset form selections when switching between Lecture and Exam, but keep date/time
  useEffect(() => {
    if (!open) return;
    setFaculty("");
    setDepartment("");
    setCourseId("");
    setCourseName("");
    setLecturerId("");
    setRoomVid("");
    setRoomConflicts([]);
    setLecConflicts([]);
    setAltRooms([]);
    setAltTime(null);
    setExamCategory("Mid");
  }, [eventType, open]);

  /* ====================== NORMALIZE SCHEMAS (unchanged) =======================
     Tolerates different column names:
     - degree rows: did/degreeid/id, fid/facultyid, dname/name/degree_name/title
     - course rows: cid/courseid/id, did/degreeid/degree_id, fid/facultyid, cname/name/course_name/title
  -----------------------------------------------------------------------------*/
  const degreesNorm = useMemo(() => {
    return (departments || [])
      .map(r => ({
        did:   r.did ?? r.degreeid ?? r.id,
        fid:   r.fid ?? r.facultyid ?? r.fid_fk ?? r.faculty_id,
        dname: r.dname ?? r.name ?? r.degree_name ?? r.title,
        _raw: r,
      }))
      .filter(d => d.did != null);
  }, [departments]);

  const coursesNorm = useMemo(() => {
    return (courses || [])
      .map(r => ({
        cid:   r.cid ?? r.courseid ?? r.id,
        did:   r.did ?? r.degreeid ?? r.degree_id,
        fid:   r.fid ?? r.facultyid ?? r.faculty_id,
        cname: r.cname ?? r.name ?? r.course_name ?? r.title,
        _raw: r,
      }))
      .filter(c => c.cid != null);
  }, [courses]);

  // Normalize lecturers (supports f_name/l_name, fname/lname, etc.)
  const lecturersNorm = useMemo(() => {
    return (lecturers || [])
      .map((r) => {
        const lid = r.lid ?? r.lecturer_id ?? r.id;
        const fname = r.f_name ?? r.fname ?? r.first_name ?? "";
        const lname = r.l_name ?? r.lname ?? r.last_name ?? r.name ?? r.fullname ?? "";
        const name = `${fname} ${lname}`.trim() || lname || fname || String(lid ?? "");
        return { lid, name, _raw: r };
      })
      .filter((l) => l.lid != null);
  }, [lecturers]);

  // --------------------- CASCADE (updated) ---------------------
  // Faculty -> Degree
  const filteredDegrees = useMemo(() => {
    if (!faculty) return degreesNorm;
    return degreesNorm.filter(d => String(d.fid) === String(faculty));
  }, [degreesNorm, faculty]);

  // Degree -> Course
  const filteredCourses = useMemo(() => {
    if (!department) return coursesNorm;
    return coursesNorm.filter(c => String(c.did) === String(department));
  }, [coursesNorm, department]);

  // Course change → show name & auto-set fid/did if present (normalized)
  useEffect(() => {
    if (!open) return;
    const found = coursesNorm.find(c => String(c.cid) === String(courseId));
    if (found) {
      setCourseName(found.cname || "");
      if (found.did && !department) setDepartment(found.did);
      if (found.fid && !faculty) setFaculty(found.fid);
    } else {
      setCourseName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, coursesNorm, open]);

  // --------------------- conflicts + suggestions (unchanged) ---------------------
  const timeOverlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

  useEffect(() => {
    if (!open) return;
    if (!date || !start || !end || (!roomVid && !lecturerId)) {
      setRoomConflicts([]);
      setLecConflicts([]);
      setAltRooms([]);
      setAltTime(null);
      return;
    }

    const run = async () => {
      const [classRes, examRes] = await Promise.all([
        supabase
          .from("classtimetable")
          .select("cid,lid,vid,date,starttime,endtime")
          .eq("date", date),
        supabase
          .from("examtimetable")
          .select("cid,lid,vid,date,starttime,endtime")
          .eq("date", date),
      ]);

      const all = [...(classRes.data || []), ...(examRes.data || [])];

      const rConf = [];
      const lConf = [];

      const s = start;
      const e = end;

      all.forEach((row) => {
        if (!row.starttime || !row.endtime) return;
        if (!timeOverlaps(s, e, row.starttime, row.endtime)) return;

        if (roomVid && String(row.vid) === String(roomVid)) {
          rConf.push({ label: `${row.starttime}–${row.endtime}`, vid: row.vid });
        }
        if (lecturerId && String(row.lid) === String(lecturerId)) {
          lConf.push({ label: `${row.starttime}–${row.endtime}`, lid: row.lid });
        }
      });

      setRoomConflicts(rConf);
      setLecConflicts(lConf);

      // Alternative rooms
      const busyVids = new Set(
        all
          .filter((row) => timeOverlaps(s, e, row.starttime, row.endtime))
          .map((row) => String(row.vid))
      );
      const freeRooms = (rooms || []).filter((r) => !busyVids.has(String(r.vid)));
      setAltRooms(freeRooms.slice(0, 6));

      // Suggest a shifted time if any conflict
      if (rConf.length || lConf.length) {
        const ns = new Date(`2000-01-01T${start}:00`);
        const ne = new Date(`2000-01-01T${end}:00`);
        ns.setMinutes(ns.getMinutes() + 30);
        ne.setMinutes(ne.getMinutes() + 30);
        const hh = String(ns.getHours()).padStart(2, "0");
        const mm = String(ns.getMinutes()).padStart(2, "0");
        const ehh = String(ne.getHours()).padStart(2, "0");
        const emm = String(ne.getMinutes()).padStart(2, "0");
        setAltTime({ start: `${hh}:${mm}`, end: `${ehh}:${emm}` });
      } else {
        setAltTime(null);
      }
    };

    run();
  }, [open, date, start, end, roomVid, lecturerId, rooms]);

  // --------------------- validation ---------------------
  const requiredMissing =
    !courseId ||
    !lecturerId ||
    !date ||
    !start ||
    !end ||
    !roomVid ||
    !faculty ||
    !department;

  if (!open) return null;

  // --------------------- UI (unchanged) ---------------------
  const backdropClick = (e) => {
    if (e.currentTarget === e.target) onClose && onClose();
  };

  const content = (
    <div className="sched-modal__backdrop" onMouseDown={backdropClick}>
      <div className="sched-modal__panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tt-modal">
          {/* Header */}
          <div className="tt-modal-header">
            <h2 className="tt-modal-title">Schedule {eventType}</h2>
            <button className="tt-modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          {/* Lecture | Exam toggle */}
          <div className="tt-event-type">
            <label className="tt-pill">
              <input
                type="radio"
                name="etype"
                checked={eventType === "Lecture"}
                onChange={() => setEventType("Lecture")}
              />
              <span>Lecture</span>
            </label>
            <label className="tt-pill">
              <input
                type="radio"
                name="etype"
                checked={eventType === "Exam"}
                onChange={() => setEventType("Exam")}
              />
              <span>Exam</span>
            </label>
          </div>

          {/* Two columns */}
          <div className="tt-grid">
            {/* LEFT: Course details */}
            <div className="tt-col">
              <h3 className="tt-section-title">Course Details</h3>

              <div className="tt-field">
                <label className="tt-label">Faculty *</label>
                <select
                  className="tt-select"
                  value={faculty}
                  onChange={(e) => {
                    setFaculty(e.target.value);
                    setDepartment("");
                    setCourseId("");
                  }}
                >
                  <option value="">Select faculty</option>
                  {faculties.map((f) => (
                    <option key={f.facultyid ?? f.fid} value={f.facultyid ?? f.fid}>{f.fname}</option>
                  ))}
                </select>
              </div>

              <div className="tt-field">
                <label className="tt-label">Degree *</label>
                <select
                  className="tt-select"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setCourseId("");
                  }}
                >
                  <option value="">Select degree</option>
                  {filteredDegrees.map((d) => (
                    <option key={d.did} value={d.did}>{d.dname}</option>
                  ))}
                </select>
              </div>

              <div className="tt-field">
                <label className="tt-label">Course *</label>
                <select
                  className="tt-select"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="">Select course</option>
                  {filteredCourses.map((c) => (
                    <option key={c.cid} value={c.cid}>{c.cname}</option>
                  ))}
                </select>
                {courseName && <div className="tt-help">{courseName}</div>}
              </div>

              {eventType === "Exam" && (
                <div className="tt-field">
                  <label className="tt-label">Exam Category</label>
                  <select
                    className="tt-select"
                    value={examCategory}
                    onChange={(e) => setExamCategory(e.target.value)}
                  >
                    <option>Mid</option>
                    <option>Practical</option>
                    <option>Final</option>
                  </select>
                </div>
              )}

              <div className="tt-field">
                <label className="tt-label">Lecturer *</label>
                <select
                  className="tt-select"
                  value={lecturerId}
                  onChange={(e) => setLecturerId(e.target.value)}
                >
                  <option value="">Select lecturer</option>
                  {lecturersNorm.map((l) => (
                    <option key={l.lid} value={l.lid}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Conflicts panel — ALWAYS visible */}
              <div
                className={`tt-card ${roomConflicts.length || lecConflicts.length ? "tt-danger" : ""}`}
                role="region"
                style={{ marginTop: 8 }}
              >
                <div className="tt-card-title">
                  {roomConflicts.length || lecConflicts.length ? "⚠️ Scheduling Conflicts" : " No Conflicts"}
                </div>

                {roomConflicts.length || lecConflicts.length ? (
                  <ul>
                    {roomConflicts.map((c, i) => (
                      <li key={`r${i}`}>Room is already booked ({c.label}).</li>
                    ))}
                    {lecConflicts.map((c, i) => (
                      <li key={`l${i}`}>Lecturer has another class ({c.label}).</li>
                    ))}
                  </ul>
                ) : (
                  <ul>
                    <li>No conflicts for the chosen time.</li>
                  </ul>
                )}
              </div>
            </div>

            {/* RIGHT: Schedule & location */}
            <div className="tt-col">
              <h3 className="tt-section-title">Schedule &amp; Location</h3>

              <div className="tt-field">
                <label className="tt-label">Room/Location *</label>
                <select
                  className="tt-select"
                  value={roomVid}
                  onChange={(e) => setRoomVid(e.target.value)}
                >
                  <option value="">Select room</option>
                  {rooms.map((r) => (
                    <option key={r.vid} value={r.vid}>{r.venue}</option>
                  ))}
                </select>
              </div>

              <div className="tt-field">
                <label className="tt-label">Date *</label>
                <input
                  type="date"
                  className="tt-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="tt-row">
                <div className="tt-field">
                  <label className="tt-label">Start Time *</label>
                  <input
                    type="time"
                    className="tt-input"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="tt-field">
                  <label className="tt-label">End Time *</label>
                  <input
                    type="time"
                    className="tt-input"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="tt-field">
                <label className="tt-label">Recurring Pattern</label>
                <select
                  className="tt-select"
                  value={recurring}
                  onChange={(e) => setRecurring(e.target.value)}
                >
                  <option>Single Occurrence</option>
                  <option>Weekly</option>
                  <option>Custom</option>
                </select>
              </div>

              {/* Suggestions */}
              <div className="tt-card tt-info" style={{ marginTop: 12 }}>
                <div className="tt-card-title">💡 Suggestions</div>
                <ul>
                  {altRooms.length === 0 && !altTime && <li>No suggestions for the chosen time.</li>}
                  {altRooms.slice(0, 4).map((r) => (
                    <li key={r.vid}>Alternative rooms available: {r.venue}</li>
                  ))}
                  {altTime && (
                    <li>
                      Consider moving to <strong>{altTime.start}–{altTime.end}</strong> (available)
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="tt-actions">
            <button className="tt-btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="tt-btn-primary"
              disabled={saving || requiredMissing}
              onClick={async () => {
                if (requiredMissing) return;
                setSaving(true);
                try {
                  if (eventType === "Lecture") {
                    const { error } = await supabase.from("classtimetable").insert({
                      cid: courseId,
                      lid: lecturerId,
                      vid: roomVid,
                      date,
                      starttime: start,
                      endtime: end,
                    });
                  if (error) throw error;
                } else {
                  const { error } = await supabase.from("examtimetable").insert({
                    cid: courseId,
                    lid: lecturerId,
                    vid: roomVid,
                    date,
                    starttime: start,
                    endtime: end,
                    examcategory: examCategory,
                    Exam_Type: "Proper",
                    Status: "Scheduled",
                  });
                  if (error) throw error;
                }
                  onSaved && onSaved();
                  onClose && onClose();
                } catch (e) {
                  alert(e.message || "Failed to save");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : eventType === "Lecture" ? "Schedule Lecture" : "Schedule Exam"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
