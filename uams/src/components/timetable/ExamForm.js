import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";
import { checkClash } from "../../utils/ClashDetection";
import "./TimetableDashboard.css";

const EXAM_TYPES = ["Proper", "Repeat"];           // mapped to column: Status
const EXAM_CATEGORIES = ["Mid", "Final", "Practical", "Assignment"]; // column: examcategory

function ExamForm({ onDataAdded }) {
  const [faculty, setFaculty] = useState([]);
  const [degree, setDegree] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [venues, setVenues] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    faculty: "", degree: "", year: "", semester: "", cid: "",
    date: "", start_time: "", end_time: "", venue: "", lecturer: "",
    exam_type: "Proper", exam_category: "Mid",
  });

  useEffect(() => {
    const fetchInitial = async () => {
      const [{ data: fac }, { data: lec }, { data: ven }] = await Promise.all([
        supabase.from("faculty").select("*"),
        supabase.from("lecturer").select("*"),
        supabase.from("location").select("*"),
      ]);
      setFaculty(fac || []); setLecturers(lec || []); setVenues(ven || []);
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    const fetchDegree = async () => {
      if (!formData.faculty) { setDegree([]); return; }
      const { data } = await supabase.from("degree").select("*").eq("facultyid", formData.faculty);
      setDegree(data || []);
      setAcademicYears([]); setSemesters([]); setCourses([]);
      setFormData((p)=>({ ...p, degree:"", year:"", semester:"", cid:""}));
    };
    fetchDegree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.faculty]);

  useEffect(() => {
    const fetchYearsSems = async () => {
      if (!formData.degree) { setAcademicYears([]); setSemesters([]); return; }
      const { data } = await supabase.from("course").select("year, semester").eq("degreeid", formData.degree);
      if (data?.length) {
        setAcademicYears([...new Set(data.map(c=>c.year))].sort((a,b)=>a-b));
        setSemesters([...new Set(data.map(c=>c.semester))].sort((a,b)=>a-b));
      } else { setAcademicYears([]); setSemesters([]); }
      setCourses([]); setFormData((p)=>({ ...p, year:"", semester:"", cid:""}));
    };
    fetchYearsSems();
  }, [formData.degree]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { degree, year, semester } = formData;
      if (!degree || !year || !semester) { setCourses([]); return; }
      const { data } = await supabase
        .from("course").select("*")
        .eq("degreeid", degree).eq("year", parseInt(year)).eq("semester", parseInt(semester));
      setCourses(data || []);
      setFormData((p)=>({ ...p, cid: data?.some(c=>String(c.cid)===String(p.cid)) ? p.cid : "" }));
    };
    fetchCourses();
  }, [formData.degree, formData.year, formData.semester]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "year" || name === "semester") return setFormData((p)=>({ ...p, [name]:value, cid:""}));
    setFormData((p)=>({ ...p, [name]:value }));
  };

  const validate = () => {
    const req = ["faculty","degree","year","semester","cid","date","start_time","end_time","venue","lecturer","exam_type","exam_category"];
    const missing = req.filter((k)=>!String(formData[k]||"").trim());
    if (missing.length) return alert("Please complete all fields."), false;
    const s = new Date(`${formData.date}T${formData.start_time}:00`);
    const e = new Date(`${formData.date}T${formData.end_time}:00`);
    if (!(s<e)) return alert("Start time must be before End time."), false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const clashes = await checkClash({
        date: formData.date,
        starttime: formData.start_time,
        endtime: formData.end_time,
        vid: formData.venue,
        lid: formData.lecturer,
        cid: formData.cid,
      }, "exam");

      if (clashes.length) {
        const kinds = [...new Set(clashes.map((c)=>c.type))].join(", ");
        return alert(`⚠ Clash detected (${kinds}). Choose another time/room/lecturer.`);
      }

      setSubmitting(true);

      const { data: inserted, error } = await supabase
        .from("examtimetable")
        .insert([{
          cid: formData.cid,
          date: formData.date,
          starttime: formData.start_time,
          endtime: formData.end_time,
          vid: formData.venue,
          lid: formData.lecturer,
          Status: formData.exam_type,
          examcategory: formData.exam_category,
        }])
        .select()
        .single();

      if (error) { alert("❌ Error: "+error.message); setSubmitting(false); return; }

      // optional relation table (ignore if not present)
      try {
        await supabase.from("course_examinationtimetable").insert([{
          cid: formData.cid,
          examtimetableid: inserted.examtimetableid ?? inserted.id,
          faculty: formData.faculty,
          dname: formData.degree,
        }]);
      } catch (_ignored) {}

      alert("✅ Exam scheduled.");

      setFormData({
        faculty:"", degree:"", year:"", semester:"", cid:"",
        date:"", start_time:"", end_time:"", venue:"", lecturer:"",
        exam_type:"Proper", exam_category:"Mid",
      });

      onDataAdded && onDataAdded(inserted);
    } catch (err) {
      console.error(err); alert("❌ Unexpected error.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="dashboard-form">
      <h3 className="dashboard-subtitle">Exam Timetable</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-column">
            <div className="form-group">
              <label>Faculty:</label>
              <select name="faculty" value={formData.faculty} onChange={handleChange}>
                <option value="">Select Faculty</option>
                {faculty.map((f)=><option key={f.facultyid} value={f.facultyid}>{f.fname}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Degree:</label>
              <select name="degree" value={formData.degree} onChange={handleChange} disabled={!formData.faculty}>
                <option value="">Select Degree</option>
                {degree.map((d)=><option key={d.degreeid} value={d.degreeid}>{d.dname}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Course:</label>
              <select name="cid" value={formData.cid} onChange={handleChange} disabled={!formData.semester || !formData.year}>
                <option value="">Select Course</option>
                {courses.map((c)=><option key={c.cid} value={c.cid}>{c.cid} - {c.cname}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Exam Type:</label>
              <select name="exam_type" value={formData.exam_type} onChange={handleChange}>
                {EXAM_TYPES.map((t)=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-column">
            <div className="form-group">
              <label>Academic Year:</label>
              <select name="year" value={formData.year} onChange={handleChange} disabled={!formData.degree}>
                <option value="">Select Year</option>
                {academicYears.map((y,i)=><option key={i} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Semester:</label>
              <select name="semester" value={formData.semester} onChange={handleChange} disabled={!formData.year}>
                <option value="">Select Semester</option>
                {semesters.map((s,i)=><option key={i} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date:</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label>Exam Category:</label>
              <select name="exam_category" value={formData.exam_category} onChange={handleChange}>
                {EXAM_CATEGORIES.map((c)=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-column">
            <div className="form-group">
              <label>Start Time:</label>
              <input type="time" name="start_time" value={formData.start_time} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label>End Time:</label>
              <input type="time" name="end_time" value={formData.end_time} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label>Venue:</label>
              <select name="venue" value={formData.venue} onChange={handleChange}>
                <option value="">Select Venue</option>
                {venues.map((v)=><option key={v.vid} value={v.vid}>{v.venue}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Lecturer:</label>
              <select name="lecturer" value={formData.lecturer} onChange={handleChange}>
                <option value="">Select Lecturer</option>
                {lecturers.map((l)=><option key={l.lid} value={l.lid}>{l.lid} - {l.f_name} {l.l_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Exam"}</button>
        </div>
      </form>
    </div>
  );
}
export default ExamForm;
