import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import './LectureTimeTable.css';

// Helper: random light color for cards
function getRandomLightColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 80%, 90%)`;
}

// Helper: format time "HH:MM:SS" or "HH:MM" -> "HH:MM"
function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr).slice(0, 5);
}

export default function TimetableDisplay() {
  const navigate = useNavigate();

  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    faculty: '',
    degree: '',
    cname: '',
    year: '',
    semester: '',
    date: '',
  });

  // Fetch faculty, degree, course, and location filters (wrapped in useCallback)
  const fetchFilters = useCallback(async () => {
    try {
      console.log('fetchFilters: starting');
      const [
        { data: facultyData, error: fErr },
        { data: degreeData, error: dErr },
        { data: courseData, error: cErr },
      ] = await Promise.all([
        supabase.from('faculty').select('facultyid, fname'),
        supabase.from('degree').select('degreeid, dname, facultyid'),
        supabase.from('course').select('cid, cname, year, semester, degreeid'),
      ]);

      if (fErr || dErr || cErr) {
        console.error('fetchFilters errors', { fErr, dErr, cErr });
        setError('Failed to load lookup data. See console.');
      } else {
        setError('');
      }

      setFaculties(facultyData || []);
      setDegrees(degreeData || []);
      setCourses(courseData || []);
      console.log('fetchFilters: done', {
        faculties: (facultyData || []).length,
        degrees: (degreeData || []).length,
        courses: (courseData || []).length,
      });
    } catch (err) {
      console.error('fetchFilters exception', err);
      setError('Unexpected error loading lookup data. See console.');
    }
  }, []);

  // Fetch timetable from the DB view 'timetable_grid' (wrapped in useCallback)
  const fetchTimetables = useCallback(async () => {
    setLoading(true);
    try {
      console.log('fetchTimetables (view): starting, filters=', filters);
      let query = supabase
        .from('timetable_grid')
        .select('*')
        .order('date', { ascending: true })
        .order('starttime', { ascending: true });

      if (filters.faculty) query = query.eq('facultyid', filters.faculty);
      if (filters.degree) query = query.eq('degreeid', filters.degree);
      if (filters.cname) query = query.eq('cname', filters.cname);
      if (filters.year) query = query.eq('year', filters.year);
      if (filters.semester) query = query.eq('semester', filters.semester);
      if (filters.date) query = query.eq('date', filters.date);

      const { data: rows, error } = await query;
      console.log('fetchTimetables (view) response', { error, count: (rows || []).length });
      if (error) {
        console.error('timetable_grid fetch error:', error);
        setError('Failed to load timetable. See console.');
        setTimetables([]);
        return;
      }

      const mapped = (rows || []).map(r => ({
        classtimetableid: r.classtimetableid,
        date: r.date,
        starttime: r.starttime,
        endtime: r.endtime,
        vid: r.vid,
        venue: r.location || r.venue || '',
        cid: r.cid || '',
        cname: r.cname || '',
        year: r.year || '',
        semester: r.semester || '',
        degreeid: r.degreeid || '',
        dname: r.dname || '',
        facultyid: r.facultyid || '',
        fname: r.fname || '',
        lid: r.lid || '',
        lecturer: [r.lecturer_fname, r.lecturer_lname].filter(Boolean).join(' '),
      }));

      setError('');
      setTimetables(mapped);
      console.log('fetchTimetables (view): set timetables count=', mapped.length);
    } catch (err) {
      console.error('fetchTimetables (view) exception:', err);
      setError('Unexpected error fetching timetable. See console.');
      setTimetables([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    // fetch timetables after filter lookups change or filters change
    fetchTimetables();
  }, [fetchTimetables]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      if (name === 'faculty') {
        return { ...prev, faculty: value, degree: '', cname: '', year: '', semester: '' };
      }
      if (name === 'degree') {
        return { ...prev, degree: value, cname: '', year: '', semester: '' };
      }
      if (name === 'cname') {
        return { ...prev, cname: value, year: '', semester: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const filteredDegrees = filters.faculty
    ? degrees.filter(d => String(d.facultyid) === String(filters.faculty))
    : degrees;

  const filteredCourses = courses.filter((c) => {
    if (filters.degree && String(c.degreeid) !== String(filters.degree)) return false;
    if (!filters.degree && filters.faculty) {
      const degree = degrees.find(d => String(d.degreeid) === String(c.degreeid));
      if (!degree || String(degree.facultyid) !== String(filters.faculty)) return false;
    }
    if (filters.year && String(c.year) !== String(filters.year)) return false;
    if (filters.semester && String(c.semester) !== String(filters.semester)) return false;
    return true;
  });

  const filteredYears = [...new Set(filteredCourses.map(c => c.year))].filter(Boolean);
  const filteredSemesters = [...new Set(filteredCourses.map(c => c.semester))].filter(Boolean);

  const grouped = timetables.reduce((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t);
    return acc;
  }, {});

  // default display: today and future. If user chooses a date, show only that date.
  const today = new Date().toISOString().slice(0, 10);
  let displayDates = Object.keys(grouped);
  if (filters.date) {
    displayDates = displayDates.filter(date => date === filters.date);
  } else {
    displayDates = displayDates.filter(date => date >= today);
  }
  displayDates.sort();

  // current time for marking past time slots (HH:MM)
  const nowTime = new Date();
  const nowHHMM = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="timetable-container">
      <div className="timetable-header-bg-only">UAMS - TIME TABLE DASHBOARD</div>

      <div className="timetable-filters">
        <select name="faculty" onChange={handleChange} value={filters.faculty}>
          <option value="">All Faculties</option>
          {faculties.map((f) => (
            <option key={f.facultyid} value={f.facultyid}>{f.fname}</option>
          ))}
        </select>

        <select name="degree" onChange={handleChange} value={filters.degree}>
          <option value="">All Degrees</option>
          {filteredDegrees.map((d) => (
            <option key={d.degreeid} value={d.degreeid}>{d.dname}</option>
          ))}
        </select>

        <select name="cname" onChange={handleChange} value={filters.cname}>
          <option value="">All Subjects</option>
          {filteredCourses.map((c) => (
            <option key={c.cid} value={c.cname}>{c.cname}</option>
          ))}
        </select>

        <select name="year" onChange={handleChange} value={filters.year}>
          <option value="">All Years</option>
          {filteredYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select name="semester" onChange={handleChange} value={filters.semester}>
          <option value="">All Semesters</option>
          {filteredSemesters.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input type="date" name="date" onChange={handleChange} value={filters.date} />

        <button type="button" onClick={() => navigate('/academic-coordinator-dashboard')}>
          Academic Coordinator Dashboard
        </button>

        <button type="button" onClick={() => navigate('/view-my-own-timetable')}>
          View My Own Time Table
        </button>

        <button type="button" onClick={() => navigate('/academic-full-view')}>
          Full view
        </button>
      </div>

      {loading && <p>Loading timetables...</p>}
      {!loading && displayDates.length === 0 && <p>No timetables found.</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && displayDates.length > 0 && displayDates.map((date) => {
        // is this date earlier than today?
        const dateIsPast = date < today;
        return (
          <div key={date} className="timetable-date">
            <h3>{date}</h3>
            <div className="timetable-blocks">
              {grouped[date].map((t) => {
                const end = (t.endtime || '00:00').slice(0,5);
                // for today's slots, consider slot past when endtime <= now
                const isPastSlot = dateIsPast || (date === today && end <= nowHHMM);
                return (
                  <div
                    className="timetable-block"
                    key={t.classtimetableid || `${t.cid}-${t.date}-${t.starttime}`}
                    style={{
                      background: getRandomLightColor(),
                      opacity: isPastSlot ? 0.5 : 1,
                      pointerEvents: isPastSlot ? 'none' : 'auto'
                    }}
                    data-past={isPastSlot}
                  >
                    <div><strong>Faculty -</strong> {t.fname}</div>
                    <div><strong>Degree -</strong> {t.dname}</div>
                    <div><strong>Subject -</strong> {t.cname}</div>
                    <div><strong>Year -</strong> {t.year}</div>
                    <div><strong>Semester -</strong> {t.semester}</div>
                    <div>
                      <strong>Time -</strong> {formatTime(t.starttime)} - {formatTime(t.endtime)}
                    </div>
                    <div><strong>Lecturer -</strong> {t.lecturer}</div>
                    <div><strong>Location -</strong> {t.venue}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}