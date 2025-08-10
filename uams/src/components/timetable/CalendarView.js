import React, { useEffect, useMemo, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import supabase from "../../lib/supabaseClient";
import { checkClash } from "../../utils/ClashDetection";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./TimetableDashboard.css";

const localizer = momentLocalizer(moment);
const TYPE_COLORS = { lecture: "#E6BB0C", exam: "#90CAF9" };

const safeToDate = (date, time) => {
  if (!date || !time) return null;
  const t = time.length === 5 ? `${time}:00` : time;
  const d = new Date(`${date}T${t}`);
  return isNaN(d.getTime()) ? null : d;
};

export default function CalendarView({ refreshKey = 0, onChanged }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);

  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState({
    type:"", id:null, table:"",
    date:"", starttime:"", endtime:"", vid:"", lid:"", cid:"",
    examcategory:"Mid", Status:"Proper",
  });

  async function fetchWithFallback(table, preferredPk, fallbackPk, columns) {
    const q1 = await supabase.from(table).select(`${preferredPk}, ${columns}`)
      .order("date", { ascending:true }).order("starttime", { ascending:true });
    if (!q1.error) return { data: q1.data, pkName: preferredPk };

    const q2 = await supabase.from(table).select(`${fallbackPk}, ${columns}`)
      .order("date", { ascending:true }).order("starttime", { ascending:true });
    if (!q2.error) return { data: q2.data, pkName: fallbackPk };

    throw q1.error || q2.error;
  }

  const load = async () => {
    setLoading(true); setErrorText("");
    try {
      const [clsRes, exRes] = await Promise.all([
        fetchWithFallback("classtimetable", "classtimetableid", "id",
          "date, starttime, endtime, vid, lid, cid"),
        fetchWithFallback("examtimetable", "examtimetableid", "id",
          "date, starttime, endtime, vid, lid, cid, examcategory, Status"),
      ]);

      const lectures = (clsRes.data || []).map((r) => {
        const id = r[clsRes.pkName];
        const start = safeToDate(r.date, r.starttime);
        const end = safeToDate(r.date, r.endtime);
        if (!id || !start || !end) return null;
        return {
          id, type:"lecture", table:"classtimetable",
          title: r.cid ? `Lecture: ${r.cid}` : "Lecture",
          start, end, resource: { ...r, pkName: clsRes.pkName },
        };
      }).filter(Boolean);

      const exams = (exRes.data || []).map((r) => {
        const id = r[exRes.pkName];
        const start = safeToDate(r.date, r.starttime);
        const end = safeToDate(r.date, r.endtime);
        if (!id || !start || !end) return null;
        return {
          id, type:"exam", table:"examtimetable",
          title: r.cid ? `Exam: ${r.cid}` : `Exam${r.examcategory ? ` (${r.examcategory})`:""}`,
          start, end, resource: { ...r, pkName: exRes.pkName },
        };
      }).filter(Boolean);

      setEvents([...lectures, ...exams]);
    } catch (err) {
      setErrorText(err?.message || "Failed to load timetable.");
      setEvents([]);
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [refreshKey]);

  const eventPropGetter = useMemo(
    () => (event) => ({
      style: { backgroundColor: TYPE_COLORS[event.type] || "#ddd", border:"none", color:"#000", opacity:0.95 },
    }),
    []
  );

  const onSelectEvent = (ev) => {
    const r = ev.resource || {};
    setSelected(ev);
    setEdit({
      type: ev.type, id: ev.id, table: ev.table,
      date: r.date || moment(ev.start).format("YYYY-MM-DD"),
      starttime: (r.starttime || moment(ev.start).format("HH:mm")).slice(0,5),
      endtime: (r.endtime || moment(ev.end).format("HH:mm")).slice(0,5),
      vid: r.vid ?? "", lid: r.lid ?? "", cid: r.cid ?? "",
      examcategory: r.examcategory ?? "Mid",
      Status: r.Status ?? "Proper",
    });
  };

  const clearSelection = () => {
    setSelected(null);
    setEdit({
      type:"", id:null, table:"", date:"", starttime:"", endtime:"",
      vid:"", lid:"", cid:"", examcategory:"Mid", Status:"Proper",
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    if (!edit.date || !edit.starttime || !edit.endtime) return alert("Set date/start/end.");
    const s = safeToDate(edit.date, edit.starttime), e = safeToDate(edit.date, edit.endtime);
    if (!s || !e || !(s<e)) return alert("Start time must be before End time.");

    const exclude = { table: edit.table, id: edit.id };
    const issues = await checkClash(
      { date: edit.date, starttime: edit.starttime, endtime: edit.endtime, vid: edit.vid, lid: edit.lid, cid: edit.cid },
      edit.type,
      exclude
    );
    if (issues.length) {
      const kinds = [...new Set(issues.map(c=>c.type))].join(", ");
      return alert(`⚠ Clash detected (${kinds}). Adjust time/venue/lecturer.`);
    }

    try {
      if (edit.type === "lecture") {
        const { error } = await supabase.from("classtimetable").update({
          date: edit.date, starttime: edit.starttime, endtime: edit.endtime,
          vid: edit.vid || null, lid: edit.lid || null, cid: edit.cid || null,
        }).eq(selected.resource?.pkName || "classtimetableid", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("examtimetable").update({
          date: edit.date, starttime: edit.starttime, endtime: edit.endtime,
          vid: edit.vid || null, lid: edit.lid || null, cid: edit.cid || null,
          examcategory: edit.examcategory || null, Status: edit.Status || null,
        }).eq(selected.resource?.pkName || "id", edit.id);
        if (error) throw error;
      }
      await load(); onChanged && onChanged(); clearSelection(); alert("✅ Saved.");
    } catch (err) { console.error(err); alert("❌ Save failed: "+(err?.message||"unknown")); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm("Delete this scheduled item?")) return;
    try {
      const pkName = selected.resource?.pkName || (selected.type === "lecture" ? "classtimetableid" : "id");
      const { error } = await supabase.from(selected.table).delete().eq(pkName, selected.id);
      if (error) throw error;
      await load(); onChanged && onChanged(); clearSelection(); alert("🗑️ Deleted.");
    } catch (err) { console.error(err); alert("❌ Delete failed: "+(err?.message||"unknown")); }
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h3>
          Timetable Preview {loading ? "(loading...)" : ""}
          <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>• Lecture = yellow • Exam = blue</span>
        </h3>
        {!!errorText && <div style={{ color: "#b00", fontSize: 12, marginTop: 4 }}>Load error: {errorText}</div>}
        {!loading && !errorText && events.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            No events found. Add items or navigate to a week that contains data.
          </div>
        )}
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        date={currentDate}
        onNavigate={(d) => setCurrentDate(d)}
        view={view}
        onView={(v) => setView(v)}
        views={[Views.WEEK, Views.MONTH]}
        style={{ height: 560 }}
        eventPropGetter={eventPropGetter}
        onSelectEvent={onSelectEvent}
      />

      <div className="calendar-actions">
        <div className="edit-fields">
          <label> Date
            <input type="date" value={edit.date} onChange={(e)=>setEdit((p)=>({ ...p, date: e.target.value }))} disabled={!selected}/>
          </label>
          <label> Start
            <input type="time" value={edit.starttime} onChange={(e)=>setEdit((p)=>({ ...p, starttime: e.target.value }))} disabled={!selected}/>
          </label>
          <label> End
            <input type="time" value={edit.endtime} onChange={(e)=>setEdit((p)=>({ ...p, endtime: e.target.value }))} disabled={!selected}/>
          </label>
          <label> Venue (vid)
            <input type="text" value={edit.vid} onChange={(e)=>setEdit((p)=>({ ...p, vid: e.target.value }))} placeholder="H_01 / E_03" disabled={!selected}/>
          </label>
          <label> Lecturer (lid)
            <input type="number" value={edit.lid} onChange={(e)=>setEdit((p)=>({ ...p, lid: e.target.value }))} placeholder="2407" disabled={!selected}/>
          </label>
          <label> Course (cid)
            <input type="text" value={edit.cid} onChange={(e)=>setEdit((p)=>({ ...p, cid: e.target.value }))} placeholder="IT1010 / IT2160" disabled={!selected}/>
          </label>
          <label style={{ gridColumn: "span 2" }}> Exam Category
            <select value={edit.examcategory} onChange={(e)=>setEdit((p)=>({ ...p, examcategory: e.target.value }))} disabled={!selected || edit.type!=="exam"}>
              {["Mid","Final","Practical","Assignment"].map((c)=><option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ gridColumn: "span 2" }}> Exam Type (Status)
            <select value={edit.Status} onChange={(e)=>setEdit((p)=>({ ...p, Status: e.target.value }))} disabled={!selected || edit.type!=="exam"}>
              {["Proper","Repeat"].map((t)=><option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <div className="buttons-row">
          <button className="btn" onClick={clearSelection} disabled={!selected}>Clear</button>
          <button className="btn danger" onClick={handleDelete} disabled={!selected}>Delete</button>
          <button className="btn primary" onClick={handleSave} disabled={!selected}>Save</button>
        </div>
      </div>
    </div>
  );
}
