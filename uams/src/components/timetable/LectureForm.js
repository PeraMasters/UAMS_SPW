// src/components/timetable/LectureForm.js
import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";
import { checkClash } from "../../utils/ClashDetection";
import "./TimetableDashboard.css";

/**
 * Merged + updated LectureForm
 * - Cascading dropdowns: faculty -> degree -> year -> semester -> course
 * - Inserts into `classtimetable` (date, starttime, endtime, lid, vid, cid)
 * - Calls onDataAdded(insertedRow) so the calendar below refreshes
 * - Validates and runs clash detection before insert
 */
function LectureForm({ onDataAdded }) {
  const [faculty, setFaculty] = useState([]);
  const [degree, setDegree] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    faculty: "",   // facultyid
    degree: "",    // degreeid
    year: "",
    semester: "",
    cid: "",       // course id (varchar like IT1010)
    date: "",
    start_time: "",
    end_time: "",
    venue: "",     // vid (varchar like H_01)
    lecturer: "",  // lid (int like 2407)
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Initial loads
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchInitial = async () => {
      const [{ data: fac }, { data: lec }, { data: ven }] = await Promise.all([
        supabase.from("faculty").select("*"),
        supabase.from("lecturer").select("*"),
        supabase.from("location").select("*"),
      ]);
      setFaculty(fac || []);
      setLecturers(lec || []);
      setVenues(ven || []);
    };
    fetchInitial();
  }, []);

  // Load degrees for selected faculty
  useEffect(() => {
    const loadDegrees = async () => {
      if (!formData.faculty) {
        setDegree([]);
        return;
      }
      const { data } = await supabase
        .from("degree")
        .select("*")
        .eq("facultyid", formData.faculty);
      setDegree(data || []);
      // reset downstream selections
      setAcademicYears([]); setSemesters([]); setCourses([]);
      setFormData((p) => ({ ...p, degree: "", year: "", semester: "", cid: "" }));
    };
    loadDegrees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.faculty]);

  // Load academic years + semesters for selected degree
  useEffect(() => {
    const loadYearSem = async () => {
      if (!formData.degree) {
        setAcademicYears([]); setSemesters([]);
        return;
      }
      const { data } = await supabase
        .from("course")
        .select("year, semester")
        .eq("degreeid", formData.degree);

      if (data?.length) {
        const years = [...new Set(data.map((c) => c.year))].sort((a, b) => a - b);
        const sems  = [...new Set(data.map((c) => c.semester))].sort((a, b) => a - b);
        setAcademicYears(years);
        setSemesters(sems);
      } else {
        setAcademicYears([]); setSemesters([]);
      }
      setCourses([]);
      setFormData((p) => ({ ...p, year: "", semester: "", cid: "" }));
    };
    loadYearSem();
  }, [formData.degree]);

  // Load courses for degree + year + semester
  useEffect(() => {
    const loadCourses = async () => {
      const { degree, year, semester } = formData;
      if (!degree || !year || !semester) {
        setCourses([]);
        return;
      }
      const { data } = await supabase
        .from("course")
        .select("*")
        .eq("degreeid", degree)
        .eq("year", parseInt(year))
        .eq("semester", parseInt(semester));
      setCourses(data || []);
      setFormData((p) => ({
        ...p,
        cid: data?.some((c) => String(c.cid) === String(p.cid)) ? p.cid : "",
      }));
    };
    loadCourses();
  }, [formData.degree, formData.year, formData.semester]);

  // ────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    // If year/semester changes, reset course
    if (name === "year" || name === "semester") {
      setFormData((p) => ({ ...p, [name]: value, cid: "" }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const validate = () => {
    const required = [
      "faculty", "degree", "year", "semester", "cid",
      "date", "start_time", "end_time", "venue", "lecturer",
    ];
    const missing = required.filter((k) => !String(formData[k] || "").trim());
    if (missing.length) {
      alert("Please complete all fields before adding the lecture.");
      return false;
    }
    const start = new Date(`${formData.date}T${formData.start_time}:00`);
    const end   = new Date(`${formData.date}T${formData.end_time}:00`);
    if (!(start < end)) {
      alert("Start time must be before End time.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Clash detection reads from classtimetable/examtimetable
      const clashes = await checkClash({
        date: formData.date,
        starttime: formData.start_time, // DB uses starttime / endtime
        endtime: formData.end_time,
        vid: formData.venue,
        lid: formData.lecturer,
        cid: formData.cid,
      });

      if (Array.isArray(clashes) && clashes.length) {
        const kinds = [...new Set(clashes.map((c) => c.type))].join(", ");
        alert(`⚠ Clash detected (${kinds}). Please choose another time or room/lecturer.`);
        setSubmitting(false);
        return;
      }

      // Insert into classtimetable
      const { data: inserted, error } = await supabase
        .from("classtimetable")
        .insert([{
          date: formData.date,
          starttime: formData.start_time,
          endtime: formData.end_time,
          lid: formData.lecturer,
          vid: formData.venue,
          cid: formData.cid,
        }])
        .select()
        .single();

      if (error) {
        alert("❌ Error adding lecture: " + error.message);
        setSubmitting(false);
        return;
      }

      alert("✅ Lecture scheduled successfully.");

      // Reset form
      setFormData({
        faculty: "",
        degree: "",
        year: "",
        semester: "",
        cid: "",
        date: "",
        start_time: "",
        end_time: "",
        venue: "",
        lecturer: "",
      });

      // Trigger calendar refresh in dashboard
      if (onDataAdded) onDataAdded(inserted);

    } catch (err) {
      console.error(err);
      alert("❌ Unexpected error scheduling lecture.");
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-form">
      <h3 className="dashboard-subtitle">Lecture Timetable</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          {/* Column 1 */}
          <div className="form-column">
            <div className="form-group">
              <label>Faculty:</label>
              <select name="faculty" value={formData.faculty} onChange={handleChange}>
                <option value="">Select Faculty</option>
                {faculty.map((f) => (
                  <option key={f.facultyid} value={f.facultyid}>{f.fname}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Degree:</label>
              <select
                name="degree"
                value={formData.degree}
                onChange={handleChange}
                disabled={!formData.faculty}
              >
                <option value="">Select Degree</option>
                {degree.map((d) => (
                  <option key={d.degreeid} value={d.degreeid}>{d.dname}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Course Code:</label>
              <select
                name="cid"
                value={formData.cid}
                onChange={handleChange}
                disabled={!formData.semester || !formData.year}
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.cid} value={c.cid}>{c.cid} - {c.cname}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Column 2 */}
          <div className="form-column">
            <div className="form-group">
              <label>Academic Year:</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                disabled={!formData.degree}
              >
                <option value="">Select Year</option>
                {academicYears.map((y, idx) => (
                  <option key={idx} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Semester:</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                disabled={!formData.year}
              >
                <option value="">Select Semester</option>
                {semesters.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date:</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Column 3 */}
          <div className="form-column">
            <div className="form-group">
              <label>Start Time:</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>End Time:</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Venue:</label>
              <select
                name="venue"
                value={formData.venue}
                onChange={handleChange}
              >
                <option value="">Select Venue</option>
                {venues.map((v) => (
                  <option key={v.vid} value={v.vid}>{v.venue}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Lecturer:</label>
              <select
                name="lecturer"
                value={formData.lecturer}
                onChange={handleChange}
              >
                <option value="">Select Lecturer</option>
                {lecturers.map((l) => (
                  <option key={l.lid} value={l.lid}>
                    {l.lid} - {l.f_name} {l.l_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Lecture"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LectureForm;
