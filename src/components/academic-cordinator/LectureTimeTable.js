import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import './LectureTimeTable.css';

// Function to generate a random light color
function getRandomLightColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 80%, 90%)`;
}

// Helper to format time as HH:MM (hide seconds)
function formatTime(timeStr) {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function TimetableDisplay() {
  const navigate = useNavigate();

  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [filters, setFilters] = useState({
    faculty: '',
    degree: '',
    cname: '',
    year: '',
    semester: '',
    date: '',
  });

  useEffect(() => {
    fetchFilters();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (courses.length && degrees.length && faculties.length && locations.length) {
      fetchTimetables();
    }
    // eslint-disable-next-line
  }, [filters, courses, degrees, faculties, locations]);

  // Fetch faculty, degree, course, and location filters
  const fetchFilters = async () => {
    const { data: facultyData } = await supabase.from('faculty').select('facultyid, fname');
    const { data: degreeData } = await supabase.from('degree').select('degreeid, dname, facultyid');
    const { data: courseData } = await supabase.from('course').select('cid, cname, year, semester, degreeid');
    const { data: locationData } = await supabase.from('location').select('vid, venue');
    setFaculties(facultyData || []);
    setDegrees(degreeData || []);
    setCourses(courseData || []);
    setLocations(locationData || []);
  };

  // Fetch timetable with filters (no SQL view, join client-side)
  const fetchTimetables = async () => {
    const { data: timetableData } = await supabase.from('classtimetable').select('*');
    const { data: lecturerData } = await supabase.from('lecturer').select('lid, f_name, l_name');

    const merged = timetableData.map((t) => {
      const course = courses.find(c => c.cid === t.cid) || {};
      const degree = degrees.find(d => d.degreeid === course.degreeid) || {};
      const faculty = faculties.find(f => f.facultyid === degree.facultyid) || {};
      const lecturer = lecturerData.find(l => l.lid === t.lid) || {};
      const location = locations.find(loc => loc.vid === t.vid) || {};
      return {
        ...t,
        facultyid: faculty.facultyid || '',
        fname: faculty.fname || '',
        degreeid: degree.degreeid || '',
        dname: degree.dname || '',
        cname: course.cname || '',
        year: course.year || '',
        semester: course.semester || '',
        lecturer: lecturer.f_name && lecturer.l_name ? `${lecturer.f_name} ${lecturer.l_name}` : '',
        venue: location.venue || '',
      };
    });

    // Apply filters using IDs (convert all to string for comparison)
    const filtered = merged.filter((t) => {
      return (
        (!filters.faculty || String(t.facultyid) === String(filters.faculty)) &&
        (!filters.degree || String(t.degreeid) === String(filters.degree)) &&
        (!filters.cname || t.cname === filters.cname) &&
        (!filters.year || String(t.year) === String(filters.year)) &&
        (!filters.semester || String(t.semester) === String(filters.semester)) &&
        (!filters.date || t.date === filters.date)
      );
    });

    setTimetables(filtered);
  };

  // Handle filter changes and reset dependent filters
  const handleChange = (e) => {
    if (e.target.name === 'faculty') {
      setFilters({
        ...filters,
        faculty: e.target.value,
        degree: '',
        cname: '',
        year: '',
        semester: '',
      });
    } else if (e.target.name === 'degree') {
      setFilters({
        ...filters,
        degree: e.target.value,
        cname: '',
        year: '',
        semester: '',
      });
    } else if (e.target.name === 'cname') {
      setFilters({
        ...filters,
        cname: e.target.value,
        year: '',
        semester: '',
      });
    } else {
      setFilters({ ...filters, [e.target.name]: e.target.value });
    }
  };

  // Filter degrees based on selected faculty
  const filteredDegrees = filters.faculty
    ? degrees.filter(d => String(d.facultyid) === String(filters.faculty))
    : degrees;

  // Filter courses based on selected degree, faculty, year, and semester
  const filteredCourses = courses.filter((c) => {
    // Degree filter
    if (filters.degree && String(c.degreeid) !== String(filters.degree)) return false;
    // Faculty filter (if no degree selected)
    if (!filters.degree && filters.faculty) {
      const degree = degrees.find(d => d.degreeid === c.degreeid);
      if (!degree || String(degree.facultyid) !== String(filters.faculty)) return false;
    }
    // Year filter
    if (filters.year && String(c.year) !== String(filters.year)) return false;
    // Semester filter
    if (filters.semester && String(c.semester) !== String(filters.semester)) return false;
    return true;
  });

  // Filter years and semesters based on filteredCourses
  const filteredYears = [...new Set(filteredCourses.map(c => c.year))];
  const filteredSemesters = [...new Set(filteredCourses.map(c => c.semester))];

  // Group by date
  const grouped = timetables.reduce((acc, t) => {
    acc[t.date] = acc[t.date] || [];
    acc[t.date].push(t);
    return acc;
  }, {});

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().slice(0, 10);

  // Determine which dates to display
  let displayDates = Object.keys(grouped);
  if (filters.date) {
    // If a date filter is set, show only that date (if exists)
    displayDates = displayDates.filter(date => date === filters.date);
  } else {
    // Otherwise, show dates from today onward
    displayDates = displayDates.filter(date => new Date(date) >= new Date(today));
  }
  displayDates.sort();

  return (
    <div className="timetable-container">
      {/* Ribbon header */}
      <div className="timetable-header-bg-only">UAMS - TIME TABLE DASHBOARD</div>
      {/* Filters */}
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
            <option key={c.cname} value={c.cname}>{c.cname}</option>
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

        <button onClick={() => navigate('/academic-coordinator-dashboard')}>
          Academic Coordinator Dashboard
        </button>

        <button onClick={() => navigate('/view-my-own-timetable')}>
          View My Own Time Table
        </button>
      </div>

      {/* Display Timetables Grouped by Date */}
      {displayDates.length === 0 ? (
        <p>No timetables found.</p>
      ) : (
        displayDates.map((date) => (
          <div key={date} className="timetable-date">
            <h3>{date}</h3>
            <div className="timetable-blocks">
              {grouped[date].map((t) => (
                <div
                  className="timetable-block"
                  key={t.classtimetableid}
                  style={{ background: getRandomLightColor() }}
                >
                  <div><strong>Faculty -</strong> {t.fname}</div>
                  <div><strong>Degree -</strong> {t.dname}</div>
                  <div><strong>Subject -  </strong> {t.cname}</div>
                  <div><strong>Year -</strong> {t.year}</div>
                  <div><strong>Semester -</strong> {t.semester}</div>
                  <div>
                    <strong>Time -</strong> {formatTime(t.starttime)} - {formatTime(t.endtime)}
                  </div>
                  <div><strong>Lecturer -</strong> {t.lecturer}</div>
                  <div><strong>location - </strong> {t.venue}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TimetableDisplay;