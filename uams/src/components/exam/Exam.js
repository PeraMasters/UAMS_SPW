import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabaseClient";

const StudentExamPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    studentId: "",
    status: "Proper",
    examDate: "",
    startTime: "",
    endTime: "",
    venueId: "",
  });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courseOptions, setCourseOptions] = useState([]);
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [venueOptions, setVenueOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [showAddedList, setShowAddedList] = useState(false); // 👈 for showing list below button

  const [filters, setFilters] = useState({
    degreeId: "",
    examCategory: "",
    cid: "",
  });

  // Load initial data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [coursesRes, degreesRes, venuesRes, examsRes] = await Promise.all([
          supabase.from("course").select("cid,cname"),
          supabase.from("degree").select("degreeid,dname"),
          supabase.from("location").select("vid,venue"),
          supabase.from("student_exam").select("*"),
        ]);
        setCourseOptions(coursesRes.data || []);
        setDegreeOptions(degreesRes.data || []);
        setVenueOptions(venuesRes.data || []);
        setRecords(examsRes.data || []);
      } catch (err) {
        console.error("Initial load error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load students by selected filters
  const loadStudentsByFilters = useCallback(async (f) => {
    setLoading(true);
    try {
      const degreeId = String(f.degreeId || "").trim();
      let studentQuery = supabase.from("student").select("sid,sname,batchid,degreeid").limit(5000);
      if (degreeId) studentQuery = studentQuery.eq("degreeid", degreeId);

      const [studentsRes] = await Promise.all([studentQuery]);
      const students = (studentsRes && studentsRes.data) || [];

      const studentMap = new Map();
      for (const s of students) {
        if (!s) continue;
        const key = String(s.sid);
        studentMap.set(key, {
          sid: s.sid,
          sname: s.sname || "",
          batchid: s.batchid || "",
          degreeid: s.degreeid || "",
        });
      }

      // ✅ Always include these two SIDs
      const manualSids = ["IT20069940", "IT25069940"];
      manualSids.forEach((sid) => {
        if (!studentMap.has(sid)) {
          studentMap.set(sid, { sid, sname: "", batchid: "", degreeid: degreeId });
        }
      });

      const merged = Array.from(studentMap.values()).sort((a, b) => a.sid.localeCompare(b.sid));
      setStudentOptions(merged);
    } catch (err) {
      console.error("loadStudentsByFilters error", err);
      setStudentOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger when degree, category, or course changes
  useEffect(() => {
    const { degreeId, examCategory, cid } = filters;
    if (degreeId && examCategory && cid) {
      loadStudentsByFilters(filters);
    }
  }, [filters, loadStudentsByFilters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ["studentId", "venueId", "examDate", "startTime", "endTime"];
    for (const k of required) {
      if (!String(formData[k] || "").trim()) {
        alert("Please complete all required fields.");
        return false;
      }
    }
    if (!filters.cid || !filters.degreeId) {
      alert("Please select Course ID and Degree first.");
      return false;
    }
    const s = new Date(`${formData.examDate}T${formData.startTime}:00`);
    const e = new Date(`${formData.examDate}T${formData.endTime}:00`);
    if (!(s < e)) {
      alert("Start time must be before end time.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = {
      sid: formData.studentId,
      examCategory: filters.examCategory,
      date: formData.examDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      cid: filters.cid,
      degreeId: filters.degreeId,
      venueId: formData.venueId,
      status: formData.status,
      updated_at: new Date().toISOString(),
    };
    try {
      await supabase.from("student_exam").insert([payload]);
      alert("Student added to exam."); // 👈 after OK button pressed, below table appears
      const { data: refreshed } = await supabase.from("student_exam").select("*");
      setRecords(refreshed || []);
      setShowAddedList(true); // 👈 show list below submit button
      setFormData({
        studentId: "",
        status: "Proper",
        examDate: "",
        startTime: "",
        endTime: "",
        venueId: "",
      });
    } catch (err) {
      alert("Error saving record: " + (err.message || JSON.stringify(err)));
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (filters.degreeId && String(rec.degreeId || "") !== String(filters.degreeId)) return false;
    if (filters.cid && String(rec.cid || "") !== String(filters.cid)) return false;
    if (filters.examCategory && String(rec.examCategory || "").toLowerCase() !== String(filters.examCategory || "").toLowerCase()) return false;
    return true;
  });

  return (
    <div style={{ backgroundColor: "#f9f9f9", minHeight: "100vh" }}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <span style={styles.title}>UAMS</span>
        <button style={styles.navButton} onClick={() => navigate("/exam-dashboard")}>
          Exam Dashboard
        </button>
      </div>

      {/* Main container */}
      <div style={styles.container}>
        <h2 style={{ textAlign: "center" }}>Add Students Into Exam</h2>

        {/* Filters */}
        <div style={styles.filterControls}>
          <select name="degreeId" value={filters.degreeId} onChange={handleFilterChange} style={styles.filterInput}>
            <option value="">Degree</option>
            {degreeOptions.map((degree) => (
              <option key={degree.degreeid} value={degree.degreeid}>
                {degree.degreeid} {degree.dname ? `- ${degree.dname}` : ""}
              </option>
            ))}
          </select>

          <select name="examCategory" value={filters.examCategory} onChange={handleFilterChange} style={styles.filterInput}>
            <option value="">Category</option>
            <option value="Mid">Mid</option>
            <option value="Final">Final</option>
            <option value="Practical">Practical</option>
          </select>

          <select name="cid" value={filters.cid} onChange={handleFilterChange} style={styles.filterInput}>
            <option value="">Course ID</option>
            {courseOptions.map((c) => (
              <option key={c.cid} value={c.cid}>
                {c.cid} {c.cname ? `- ${c.cname}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <label>Student:</label>
          <select name="studentId" value={formData.studentId} onChange={handleChange} required>
            <option value="">{loading ? "Loading students..." : "Select Student"}</option>
            {studentOptions.map((s) => (
              <option key={s.sid} value={s.sid}>
                {s.sid} {s.sname ? `- ${s.sname}` : ""} {s.batchid ? `(${s.batchid})` : ""}
              </option>
            ))}
          </select>

          <label>Status:</label>
          <div style={styles.radioGroup}>
            <label>
              <input type="radio" name="status" value="Proper" checked={formData.status === "Proper"} onChange={handleChange} /> Proper
            </label>
            <label>
              <input type="radio" name="status" value="Repeat" checked={formData.status === "Repeat"} onChange={handleChange} /> Repeat
            </label>
          </div>

          <label>Exam Date:</label>
          <input type="date" name="examDate" value={formData.examDate} onChange={handleChange} required />

          <label>Start Time:</label>
          <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required />

          <label>End Time:</label>
          <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required />

          <label>Venue ID:</label>
          <select name="venueId" value={formData.venueId} onChange={handleChange} required>
            <option value="">Select Venue</option>
            {venueOptions.map((venue) => (
              <option key={venue.vid} value={venue.vid}>
                {venue.vid} {venue.venue ? `- ${venue.venue}` : ""}
              </option>
            ))}
          </select>

          {/* Submit button */}
          <div style={{ gridColumn: "1 / -1", textAlign: "center", marginTop: "20px" }}>
            <button type="submit" style={styles.button}>Submit</button>
          </div>
        </form>

        {/* ✅ Added Student List right below Submit Button */}
        {showAddedList && (
          <div style={{ marginTop: "30px" }}>
            <h3 style={{ textAlign: "center" }}>Already Added Students</h3>
            {filteredRecords.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Course ID</th>
                    <th>Degree ID</th>
                    <th>Venue ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>{rec.sid}</td>
                      <td>{rec.status}</td>
                      <td>{rec.date}</td>
                      <td>{rec.startTime}</td>
                      <td>{rec.endTime}</td>
                      <td>{rec.cid}</td>
                      <td>{rec.degreeId}</td>
                      <td>{rec.venueId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: "center" }}>No students added yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  navbar: {
    backgroundColor: "#ecc82b",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  title: { fontWeight: "bold", fontSize: "24px", color: "#000" },
  navButton: {
    padding: "8px 16px",
    borderRadius: "6px",
    backgroundColor: "white",
    border: "1px solid #1f1f1f",
    color: "#1f1f1f",
    fontWeight: "bold",
    cursor: "pointer",
  },
  container: {
    maxWidth: "1000px",
    margin: "24px auto",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "12px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "150px 1fr",
    gap: "10px 20px",
    alignItems: "center",
  },
  radioGroup: { display: "flex", gap: "15px", alignItems: "center" },
  button: {
    padding: "10px 15px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#007bff",
    color: "white",
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
    backgroundColor: "white",
  },
  filterControls: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
    justifyContent: "center",
    alignItems: "center",
  },
  filterInput: { padding: "6px", borderRadius: "6px", border: "1px solid #ccc" },
};

export default StudentExamPage; 