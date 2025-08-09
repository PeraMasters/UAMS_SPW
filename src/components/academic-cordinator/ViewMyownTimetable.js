import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabaseClient";
import "./LectureTimeTable.css"; // Reuse the same styles
import "./OwnTimetable.css"; //

export default function ViewMyOwnTimetable() {
  const [timetable, setTimetable] = useState([]);
  const [filteredTimetable, setFilteredTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [filters, setFilters] = useState({
    date: "",
    cname: "",
    degree_name: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    const lid = userSession?.username;

    if (!lid) {
      setError("Please log in to view your timetable.");
      setLoading(false);
      return;
    }

    const fetchMyTimetable = async () => {
      try {
        // Fetch all locations
        const { data: locations, error: locError } = await supabase
          .from("location")
          .select("vid, venue");
        if (locError) throw locError;

        // Fetch all courses
        const { data: courses, error: courseError } = await supabase
          .from("course")
          .select("cid, cname, year, semester, degreeid");
        if (courseError) throw courseError;

        // Fetch all degrees
        const { data: degrees, error: degreeError } = await supabase
          .from("degree")
          .select("degreeid, dname");
        if (degreeError) throw degreeError;

        // Fetch all lecturers
        const { data: lecturers, error: lecturerError } = await supabase
          .from("lecturer")
          .select("lid, f_name, l_name");
        if (lecturerError) throw lecturerError;

        // Fetch timetable for this lecturer
        const { data: timetableData, error: timetableError } = await supabase
          .from("classtimetable")
          .select("*")
          .eq("lid", lid);

        if (timetableError) throw timetableError;

        // Merge data
        const merged = (timetableData || []).map((row) => {
          const location = locations.find(loc => loc.vid === row.vid);
          const course = courses.find(c => c.cid === row.cid) || {};
          const degree = degrees.find(d => d.degreeid === course.degreeid) || {};
          const lecturer = lecturers.find(l => l.lid === row.lid) || {};
          return {
            ...row,
            venue: location ? location.venue : "",
            cname: course.cname || "",
            year: course.year || "",
            semester: course.semester || "",
            degree_name: degree.dname || "",
            lecturer_fname: lecturer.f_name || "",
            lecturer_lname: lecturer.l_name || "",
          };
        });

        setTimetable(merged);
        if (merged.length > 0) {
          setLecturerName(`${merged[0].lecturer_fname} ${merged[0].lecturer_lname}`);
        }
      } catch (err) {
        setError("Failed to fetch timetable.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyTimetable();
  }, []);

  // Filtering logic
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    let filtered = timetable;

    // Filter by course name
    if (filters.cname) {
      filtered = filtered.filter(row => row.cname === filters.cname);
    }
    // Filter by degree name
    if (filters.degree_name) {
      filtered = filtered.filter(row => row.degree_name === filters.degree_name);
    }
    // Filter by date
    if (filters.date) {
      filtered = filtered.filter(row => row.date === filters.date);
    } else {
      // Only show today and future if no date filter
      filtered = filtered.filter(row => row.date >= today);
    }

    // Sort by date and start time
    filtered = filtered.sort((a, b) => {
      if (a.date === b.date) {
        return a.starttime.localeCompare(b.starttime);
      }
      return a.date.localeCompare(b.date);
    });

    setFilteredTimetable(filtered);
  }, [timetable, filters]);

  // Get unique course names and degree names for filter dropdowns
  const courseNames = [...new Set(timetable.map(row => row.cname))];
  const degreeNames = [...new Set(timetable.map(row => row.degree_name))];

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Group filteredTimetable by date
  const grouped = filteredTimetable.reduce((acc, t) => {
    acc[t.date] = acc[t.date] || [];
    acc[t.date].push(t);
    return acc;
  }, {});

  const displayDates = Object.keys(grouped).sort();

  // Helper to format time as HH:MM
  function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  }

  if (loading) return <p>Loading your timetable...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
  <div className="timetable-container">
    <div className="timetable-header-row">
      <div className="timetable-header-bg-only" style={{ flex: 1 }}>
          {lecturerName
            ? <>TIME TABLE OF <span className="cc-lecturer-name">{lecturerName}</span> </>
            : "Own Time Table"}
        </div>
         <div className="timetable-header-actions">
          <button className="timetable-header-btn" onClick={() => navigate('/academic-coordinator-dashboard')}>Academic Coordinator Dashboard</button>
          <button className="timetable-header-btn" onClick={() => navigate('/lecture-time-table')}>Lecture Timetable</button>
     </div>
      </div>

      {/* Filters */}
      <div className="timetable-filters">
        <input
          type="date"
          name="date"
          value={filters.date}
          onChange={handleFilterChange}
        />
        <select name="cname" value={filters.cname} onChange={handleFilterChange}>
          <option value="">All Courses</option>
          {courseNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select name="degree_name" value={filters.degree_name} onChange={handleFilterChange}>
          <option value="">All Degrees</option>
          {degreeNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {filters.date && (
          <button onClick={() => setFilters({ ...filters, date: "" })}>Clear Date Filter</button>
        )}
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
                  style={{ background: "#f6d365" }}
                >
                  <div><strong>Course-</strong> {t.cname}</div>
                  <div><strong>Degree-</strong> {t.degree_name}</div>
                  <div><strong>Year-</strong> {t.year}</div>
                  <div><strong>Semester-</strong> {t.semester}</div>
                  <div>
                    <strong>Time-</strong> {formatTime(t.starttime)} - {formatTime(t.endtime)}
                  </div>
                  <div>
                    <strong>Lecturer-</strong>{" "}
                    <span className="cc-lecturer-name">{`${t.lecturer_fname} ${t.lecturer_lname}`}</span>
                  </div>
                  <div><strong>Venue:</strong> {t.venue}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}