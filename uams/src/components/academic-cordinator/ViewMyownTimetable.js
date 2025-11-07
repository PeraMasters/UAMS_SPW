import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import './LectureTimeTable.css';
import './OwnTimetable.css';

export default function ViewMyOwnTimetable() {
  const [timetable, setTimetable] = useState([]);
  const [filteredTimetable, setFilteredTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lecturerName, setLecturerName] = useState('');
  const [filters, setFilters] = useState({ date: '', cname: '', degree_name: '' });

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Resolve username from dashboard localStorage or supabase auth
        let username = null;
        try {
          const raw = localStorage.getItem('userSession');
          if (raw) username = JSON.parse(raw)?.username ?? null;
        } catch (e) { /* ignore */ }

        if (!username) {
          try {
            const authRes = supabase.auth?.getUser ? await supabase.auth.getUser() : { data: { user: supabase.auth?.user?.() } };
            const user = authRes?.data?.user ?? authRes?.user ?? null;
            username = user?.user_metadata?.user_name ?? user?.email ?? user?.id ?? null;
          } catch (e) { /* ignore */ }
        }

        if (!username) {
          if (mounted) setError('No logged-in username found.');
          return;
        }

        // Try mapping username -> login.id
        let loginId = null;
        try {
          const { data: loginRow, error: loginErr } = await supabase
            .from('login')
            .select('id,user_name')
            .eq('user_name', username)
            .limit(1)
            .maybeSingle();
          if (!loginErr && loginRow?.id != null) loginId = loginRow.id;
        } catch (e) { /* ignore */ }

        // Values to try for lid: loginId, numeric username, string username
        const tryVals = [];
        if (loginId != null) tryVals.push(loginId);
        const maybeNum = Number(username);
        if (!Number.isNaN(maybeNum)) tryVals.push(maybeNum);
        tryVals.push(String(username));

        let finalRows = [];
        let lastErr = null;
        for (const val of tryVals) {
          const { data, error } = await supabase
            .from('view_my_own_timetable')
            .select('*')
            .eq('lid', val)
            .order('date', { ascending: true })
            .order('starttime', { ascending: true });
          lastErr = error;
          if (error) console.debug('query error for lid', val, error);
          if (data && data.length) {
            finalRows = data;
            break;
          }
        }

        // If found, set timetable and lecturer name
        if (mounted) {
          setTimetable(finalRows || []);
          if (finalRows && finalRows.length) {
            const r = finalRows[0];
            setLecturerName(`${r.lecturer_fname || ''} ${r.lecturer_lname || ''}`.trim());
            setError('');
          } else {
            setError(lastErr ? 'Failed to load timetable (see console).' : 'No timetable entries found for your account.');
          }
        }
      } catch (e) {
        console.error('fetch error', e);
        if (mounted) {
          setTimetable([]);
          setError('Unexpected error fetching timetable.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filter & sort
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    let filtered = timetable.slice();

    if (filters.cname) filtered = filtered.filter(r => r.cname === filters.cname);
    if (filters.degree_name) filtered = filtered.filter(r => r.degree_name === filters.degree_name);
    if (filters.date) filtered = filtered.filter(r => r.date === filters.date);
    else filtered = filtered.filter(r => r.date >= today);

    filtered.sort((a, b) => {
      if (a.date === b.date) return (a.starttime || '').localeCompare(b.starttime || '');
      return (a.date || '').localeCompare(b.date || '');
    });

    setFilteredTimetable(filtered);
  }, [timetable, filters]);

  const courseNames = useMemo(() => [...new Set(timetable.map(r => r.cname).filter(Boolean))], [timetable]);
  const degreeNames = useMemo(() => [...new Set(timetable.map(r => r.degree_name).filter(Boolean))], [timetable]);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const grouped = useMemo(() => {
    return filteredTimetable.reduce((acc, t) => {
      acc[t.date] = acc[t.date] || [];
      acc[t.date].push(t);
      return acc;
    }, {});
  }, [filteredTimetable]);

  const displayDates = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  function formatTime(s) { if (!s) return ''; return String(s).slice(0,5); }

  function getTotalLectureHours() {
    let total = 0;
    filteredTimetable.forEach(t => {
      if (t.starttime && t.endtime) {
        const [sh, sm] = t.starttime.split(':').map(Number);
        const [eh, em] = t.endtime.split(':').map(Number);
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
        if (end > start) total += (end - start);
      }
    });
    const h = Math.floor(total/60); const m = total%60;
    return `${h}h ${m}m`;
  }

  if (loading) return <p>Loading your timetable...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="timetable-container">
      <div className="timetable-header-row">
        <div className="timetable-header-bg-only" style={{ flex: 1 }}>
          {lecturerName ? <>TIME TABLE OF <span className="cc-lecturer-name">{lecturerName}</span></> : 'Own Time Table'}
        </div>
        <div className="timetable-header-actions" style={{ gap: 16, marginLeft: 18 }}>
          <button className="timetable-header-btn" onClick={() => navigate('/academic-coordinator-dashboard')}>Academic Coordinator Dashboard</button>
          <button className="timetable-header-btn" onClick={() => navigate('/lecture-time-table')}>Lecture Timetable</button>
        </div>
      </div>

      <div className="lecture-summary" style={{ marginBottom: 18 }}>
        <span>Total Allocated Lectures: <strong>{filteredTimetable.length}</strong></span>
        <span style={{ marginLeft: 24 }}>Total Lecture Hours: <strong>{getTotalLectureHours()}</strong></span>
      </div>

      <div className="timetable-filters">
        <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
        <select name="cname" value={filters.cname} onChange={handleFilterChange}>
          <option value="">All Courses</option>
          {courseNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select name="degree_name" value={filters.degree_name} onChange={handleFilterChange}>
          <option value="">All Degrees</option>
          {degreeNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {filters.date && <button onClick={() => setFilters({ ...filters, date: '' })}>Clear Date Filter</button>}
      </div>

      {displayDates.length === 0 ? (
        <p>No timetables found.</p>
      ) : (
        displayDates.map(date => (
          <div key={date} className="timetable-date">
            <h3>{date}</h3>
            <div className="timetable-blocks">
              {grouped[date].map(t => (
                <div className="timetable-block" key={t.classtimetableid} style={{ background: '#f6d365' }}>
                  <div><strong>Course:</strong> {t.cname}</div>
                  <div><strong>Degree:</strong> {t.degree_name}</div>
                  <div><strong>Year:</strong> {t.year}</div>
                  <div><strong>Semester:</strong> {t.semester}</div>
                  <div><strong>Time:</strong> {formatTime(t.starttime)} - {formatTime(t.endtime)}</div>
                  <div><strong>Lecturer:</strong> <span className="cc-lecturer-name">{`${t.lecturer_fname || ''} ${t.lecturer_lname || ''}`}</span></div>
                  <div><strong>Venue:</strong> {t.vid || t.location || ''}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}