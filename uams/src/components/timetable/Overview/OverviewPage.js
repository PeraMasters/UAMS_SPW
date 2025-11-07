import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './overview.css';
import FilterBar from './FilterBar';
import CalenderView from './CalenderView';
import ScheduleModal from './ScheduleModal';

import {
  getFaculties,
  getDegreesByFaculty,
  getCoursesByDegree,
  getCoursesByDegrees,
  getClassTimetable,
  getExamTimetable,
} from '../utils/supabaseFetch';

function pad(n){return String(n).padStart(2,'0')}
function dateStr(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}

export default function OverviewPage(){
  const [mode, setMode] = useState('week');           // 'week' | 'month'
  const [cursor, setCursor] = useState(new Date());

  // editing vs applied
  const [draft, setDraft] = useState({ faculty:null, degree:null, course:null, view:'' });
  const [applied, setApplied] = useState({ faculty:null, degree:null, course:null, view:'' });

  // master lists
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]); // degrees under selected faculty
  const [courses, setCourses] = useState([]);         // courses under selected degree

  // events
  const [events, setEvents] = useState([]);

  // restrict by faculty/degree
  const [allowedCourseIds, setAllowedCourseIds] = useState(null); // null = no restriction

  // modal
  const [slot, setSlot] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // currently selected existing event

  /* ===== Top-bar purple button hookup =====
     Add id="topScheduleBtn" to your existing header button. */
  useEffect(() => {
  const handler = () => {
    const d = dateStr(new Date());
    openAdd({ date: d, start: "09:00", end: "10:00" });
  };
  document.addEventListener("openScheduleEvent", handler);
  return () => document.removeEventListener("openScheduleEvent", handler);
}, []);

  /* ===== master data cascade ===== */
  useEffect(()=>{ (async()=>{
    const facs = await getFaculties();
    setFaculties(Array.isArray(facs)?facs:[]);
  })(); },[]);

  useEffect(()=>{ (async()=>{
    if (!draft.faculty) { setDepartments([]); setCourses([]); return; }
    const degs = await getDegreesByFaculty(Number(draft.faculty));
    setDepartments(Array.isArray(degs)?degs:[]);
    setDraft(p=>({ ...p, degree:null, course:null }));
  })(); }, [draft.faculty]);

  useEffect(()=>{ (async()=>{
    if (!draft.degree) { setCourses([]); return; }
    const cs = await getCoursesByDegree(draft.degree);
    setCourses(Array.isArray(cs)?cs:[]);
    setDraft(p=>({ ...p, course:null }));
  })(); }, [draft.degree]);

  /* ===== date range ===== */
  const range = useMemo(()=>{
    if (mode==='week'){
      const d = new Date(cursor);
      const day = d.getDay();
      const monday = new Date(d); monday.setDate(d.getDate() - (day===0?6:day-1));
      const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
      return { from: dateStr(monday), to: dateStr(sunday) };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last  = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0);
    return { from: dateStr(first), to: dateStr(last) };
  }, [mode, cursor]);

  /* ===== events fetch ===== */
  const load = useCallback(async ()=>{
    const [cls, ex] = await Promise.all([
      getClassTimetable({ fromDate: range.from, toDate: range.to }),
      getExamTimetable({ fromDate: range.from, toDate: range.to }),
    ]);
    const a = (cls||[]).map(x => ({ ...x, type:'class' }));
    const b = (ex ||[]).map(x => ({ ...x, type:'exam'  }));
    setEvents([...a, ...b]);
  }, [range.from, range.to]);
  useEffect(()=>{ load(); }, [load]);

  /* ===== apply filters ===== */
  const applyFilters = () => setApplied({ ...draft });

  // build allowed cids when applied faculty/degree changes
  useEffect(() => {
    (async () => {
      if (!applied.faculty && !applied.degree) {
        setAllowedCourseIds(null);
        return;
      }
      if (applied.degree) {
        const cs = await getCoursesByDegree(applied.degree);
        setAllowedCourseIds(new Set((cs || []).map(c => c.cid)));
        return;
      }
      if (applied.faculty) {
        const degs = await getDegreesByFaculty(Number(applied.faculty));
        const ids = (degs || []).map(d => d.degreeid);
        const cs = await getCoursesByDegrees(ids);
        setAllowedCourseIds(new Set((cs || []).map(c => c.cid)));
        return;
      }
    })();
  }, [applied.faculty, applied.degree]);

  const filtered = useMemo(()=>{
    return events.filter(ev=>{
      if (applied.view && ev.type !== applied.view) return false;     // Lecture/Exam
      if (applied.course && ev.cid !== applied.course) return false;  // Specific course
      if (allowedCourseIds && !allowedCourseIds.has(ev.cid)) return false; // Faculty/Degree
      return true;
    });
  }, [events, applied.view, applied.course, allowedCourseIds]);

  /* ===== nav & modal ===== */
  const prev  = ()=> setCursor(d => { const x = new Date(d); mode==='week'? x.setDate(x.getDate()-7) : x.setMonth(x.getMonth()-1); return x; });
  const next  = ()=> setCursor(d => { const x = new Date(d); mode==='week'? x.setDate(x.getDate()+7) : x.setMonth(x.getMonth()+1); return x; });
  const today = ()=> setCursor(new Date());

  const openAdd = ({date, start, end})=>{ setEditing(null); setSlot({date, start, end}); setOpen(true); };
  const openEdit = (ev)=>{ setSlot(null); setEditing(ev); setOpen(true); };
  const closeModal = (changed)=>{ setOpen(false); setSlot(null); setEditing(null); if (changed) load(); };

  return (
    <div className="overview-wrap">
      {/* FILTERS */}
      <FilterBar
        faculties={faculties}
        departments={departments}
        courses={courses}
        draft={draft}
        onDraftChange={setDraft}
        onApply={applyFilters}
      />

      {/* View toggle buttons under filters */}
      <div className="view-toggle">
        <button className={mode==='week'?'active':''} onClick={()=>setMode('week')}>Weekly</button>
        <button className={mode==='month'?'active':''} onClick={()=>setMode('month')}>Monthly</button>
      </div>

      {/* calendar */}
      <CalenderView
        mode={mode}
        cursor={cursor}
        events={filtered}
        onPrev={prev}
        onToday={today}
        onNext={next}
        onAdd={openAdd}      // "+" uses the same modal
        onEventClick={openEdit}
      />

      {/* schedule modal */}
      <ScheduleModal
        open={open}
        onClose={closeModal}
        slot={{ date: slot?.date || '', start: slot?.start || '', end: slot?.end || '' }}
        editing={editing}
        defaults={{ faculties, applied }}   // modal can prefill with current filters
        onSaved={() => closeModal(true)}
      />
    </div>
  );
}
