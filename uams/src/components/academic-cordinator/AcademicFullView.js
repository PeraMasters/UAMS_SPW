import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import './AcademicFullView.css';

function startOfIsoWeek(d) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // Monday=0
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function timeToMinutes(t) {
  if (!t) return 0;
  const s = String(t);
  const parts = s.split(':');
  return (Number(parts[0] || 0) * 60) + Number(parts[1] || 0);
}
function minutesToTime(m) {
  const hh = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function AcademicFullView() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfIsoWeek(new Date()));
  const SLOT_MINUTES = 30;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('timetable_grid')
        .select('*')
        .order('date', { ascending: true })
        .order('starttime', { ascending: true });

      if (error) {
        console.error('timetable_grid fetch error', error);
        setError('Failed to load data. See console.');
        setRows([]);
      } else {
        setError('');
        const mapped = (rows || []).map(r => ({
          ...r,
          cname: r.cname || r.course_name || '',
          dname: r.dname || r.degree_name || '',
          fname: r.fname || r.faculty_name || '',
          location: r.location || r.venue || '',
          starttime: r.starttime ? String(r.starttime) : '',
          endtime: r.endtime ? String(r.endtime) : '',
        }));
        setRows(mapped);
      }
    } catch (e) {
      console.error('fetch exception', e);
      setError('Unexpected error. See console.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // compute week range and filtered events
  const weekRange = useMemo(() => {
    const start = startOfIsoWeek(weekStart);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { start, days };
  }, [weekStart]);

  const weekEvents = useMemo(() => {
    const startISO = formatDate(weekRange.start);
    const endISO = formatDate(addDays(weekRange.start, 6));
    return (rows || []).filter(r => {
      if (!r.date) return false;
      const d = r.date.slice(0,10);
      return d >= startISO && d <= endISO;
    }).map(r => {
      const startMinutes = timeToMinutes(r.starttime);
      const endMinutes = timeToMinutes(r.endtime);
      return { ...r, startMinutes, endMinutes, duration: Math.max(0, endMinutes - startMinutes) };
    });
  }, [rows, weekRange]);

  // compute timeslots from events or defaults
  const { slotTimes } = useMemo(() => {
    const defaults = { min: 8 * 60, max: 18 * 60 }; // 08:00 - 18:00
    let minM = Infinity, maxM = -Infinity;
    weekEvents.forEach(e => {
      if (e.startMinutes < minM) minM = e.startMinutes;
      if (e.endMinutes > maxM) maxM = e.endMinutes;
    });
    if (minM === Infinity) { minM = defaults.min; maxM = defaults.max; }
    minM = Math.floor(minM / SLOT_MINUTES) * SLOT_MINUTES;
    maxM = Math.ceil(maxM / SLOT_MINUTES) * SLOT_MINUTES;
    const slots = [];
    for (let m = minM; m < maxM; m += SLOT_MINUTES) slots.push(m);
    return { slotTimes: slots, minM, maxM };
  }, [weekEvents]);

  // build day->time map with rowspan
  const gridMap = useMemo(() => {
    const map = {};
    for (let d = 0; d < 7; d++) map[d] = {};
    weekEvents.forEach(ev => {
      const evDate = new Date(ev.date);
      const dayIndex = (Math.floor((evDate - weekRange.start) / (24*60*60*1000)));
      if (dayIndex < 0 || dayIndex > 6) return;
      const startIdx = Math.round((ev.startMinutes - slotTimes[0]) / SLOT_MINUTES);
      const span = Math.max(1, Math.round(ev.duration / SLOT_MINUTES));
      map[dayIndex][startIdx] = { ev, span };
      for (let i = 1; i < span; i++) map[dayIndex][startIdx + i] = { covered: true };
    });
    return map;
  }, [weekEvents, weekRange, slotTimes]);

  const prevWeek = () => setWeekStart(s => addDays(s, -7));
  const nextWeek = () => setWeekStart(s => addDays(s, 7));
  const gotoToday = () => setWeekStart(startOfIsoWeek(new Date()));

  return (
    <div className="academic-fullview-container">
      <div className="afv-controls">
        <button className="afv-btn" onClick={prevWeek}>◀ Prev week</button>
        <button className="afv-btn" onClick={gotoToday}>Today</button>
        <button className="afv-btn" onClick={nextWeek}>Next week ▶</button>
        <button className="afv-btn" onClick={() => navigate('/lecture-time-table')}>Lecture TimeTable</button>
        <button className="afv-btn secondary" onClick={() => navigate('/academic-coordinator-dashboard')}>Full Dashboard</button>
        <div className="afv-week-range">
          <strong>Week:</strong> {formatDate(weekRange.start)} — {formatDate(addDays(weekRange.start,6))}
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div className="afv-table-wrapper">
        <table className="afv-table">
          <thead>
            <tr>
              <th className="afv-time-col">Time</th>
              {weekRange.days.map((d, idx) => (
                <th key={idx}>
                  {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotTimes.map((slotMin, slotIdx) => (
              <tr key={slotIdx}>
                <td className="afv-time-col">{minutesToTime(slotMin)}</td>
                {weekRange.days.map((_, dayIdx) => {
                  const cell = gridMap[dayIdx][slotIdx];
                  if (cell && cell.covered) return null;
                  if (cell && cell.ev) {
                    const ev = cell.ev;
                    const span = cell.span || 1;
                    return (
                      <td key={dayIdx} rowSpan={span} className="afv-event-cell">
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                          {ev.fname || 'Faculty'} — {ev.dname || 'Degree'}
                        </div>

                        <div style={{ fontSize: 13, marginBottom: 6 }}>
                          <strong>Subject:</strong> {ev.cname || '—'}
                        </div>

                        <div style={{ fontSize: 13, marginBottom: 6 }}>
                          <strong>Year / Semester:</strong> {ev.year || '—'} / {ev.semester || '—'}
                        </div>

                        <div style={{ fontSize: 13, marginBottom: 6 }}>
                          <strong>Lecturer:</strong> {ev.lecturer_fname || ev.lecturer || '—'}
                        </div>

                        <div style={{ fontSize: 13 }}>
                          <strong>Location:</strong> {ev.location || '—'}
                        </div>
                      </td>
                    );
                  }
                  return <td key={dayIdx} className="afv-empty-cell" />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
   );
}