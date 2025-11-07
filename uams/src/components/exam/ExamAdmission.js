import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabaseClient";

export default function ExamAdmissionForm() {
  const navigate = useNavigate();
  const printRef = useRef();

  const [sid, setSid] = useState("");
  const [cid, setCid] = useState("");
  const [status, setStatus] = useState("Proper");
  const [students, setStudents] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdmissions, setShowAdmissions] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  // ✅ Load data from Supabase
  async function loadInitial() {
    setLoading(true);
    try {
      const [semPayRes, otherPayRes, studentRes, courseRes] = await Promise.all([
        supabase.from("semester_payment").select("sid, amount, status"),
        supabase.from("other_payment").select("sid, amount, status"),
        supabase.from("student").select("sid, sname, batchid, degreeid"),
        supabase.from("course").select("cid, cname"),
      ]);

      const semData = semPayRes.data || [];
      const otherData = otherPayRes.data || [];
      const allStudents = studentRes.data || [];
      const courses = courseRes.data || [];

      // ✅ Identify paid students
      const paidSet = new Set();
      const validStatus = ["paid", "completed", "done", "success", "ok"];

      semData.forEach((p) => {
        const s = String(p.status || "").trim().toLowerCase();
        if (validStatus.includes(s) || (p.amount && Number(p.amount) > 0)) {
          paidSet.add(String(p.sid));
        }
      });
      otherData.forEach((p) => {
        const s = String(p.status || "").trim().toLowerCase();
        if (validStatus.includes(s) || (p.amount && Number(p.amount) > 0)) {
          paidSet.add(String(p.sid));
        }
      });

      // ✅ Add payment info to student list
      const studentsWithStatus = allStudents.map((s) => ({
        ...s,
        isPaid: paidSet.has(String(s.sid)),
      }));

      // ✅ Manual students (always paid)
      const manualStudents = [
        { sid: "IT25069940", sname: "", isPaid: true },
        { sid: "IT20069940", sname: "", isPaid: true },
      ];

      const finalStudents = [...studentsWithStatus, ...manualStudents];
      setStudents(finalStudents);
      setCourseList(courses);
    } catch (err) {
      console.error("loadInitial error:", err);
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    if (!sid) return alert("Select a student.");
    if (!cid) return alert("Select a course.");
    return true;
  }

  // ✅ Generate admission entry
  async function handleGenerate(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const student = students.find((s) => String(s.sid) === String(sid));
      if (!student || !student.isPaid) {
        alert("Selected student has no valid payment.");
        setLoading(false);
        return;
      }

      const payload = {
        sid,
        batchid: student.batchid || null,
        degreeid: student.degreeid || null,
        cid,
        status,
      };

      const {  error } = await supabase.from("admission").insert([payload]).select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message);
      }

      alert("Admission generated successfully!");

      // ✅ Refresh admission list
      const admRes = await supabase
        .from("admission")
        .select("*")
        .order("created_at", { ascending: false });

      setAdmissions(admRes.data || []);
      setShowAdmissions(true); // show the list only after generation
    } catch (err) {
      console.error("handleGenerate error:", err);
      alert("Error generating admission: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // ✅ Print function
  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Admission List</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            h2 { text-align: center; }
          </style>
        </head>
        <body>
          <h2>Exam Admission List</h2>
          ${printContents}
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const navbarStyle = {
    width: "100%",
    backgroundColor: "#ecc82b",
    height: 70,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
  };

  return (
    <>
      {/* ✅ Top Nav */}
      <div style={navbarStyle}>
        <div style={{ fontSize: 24, fontWeight: "bold" }}>UAMS</div>
        <button
          onClick={() => navigate("/exam-dashboard")}
          style={{
            background: "white",
            border: "1px solid #ccc",
            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Exam Dashboard
        </button>
      </div>

      {/* ✅ Main Form */}
      <div style={{ fontFamily: "Arial", maxWidth: 950, margin: "18px auto" }}>
        <form
          onSubmit={handleGenerate}
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: 16,
          }}
        >
          <h3>Generate Exam Admission</h3>

          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            {/* Student dropdown */}
            <div style={{ flex: 1 }}>
              <label>Student</label>
              <select
                value={sid}
                onChange={(e) => setSid(e.target.value)}
                required
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              >
                <option value="">-- Select Student --</option>
                {students.length === 0 ? (
                  <option value="">No students found</option>
                ) : (
                  students.map((s) => (
                    <option key={s.sid} value={s.sid} disabled={!s.isPaid}>
                      {s.sid} - {s.sname}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Course dropdown */}
            <div style={{ flex: 1 }}>
              <label>Course (CID)</label>
              <select
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                required
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              >
                <option value="">-- Select Course --</option>
                {courseList.map((c) => (
                  <option key={c.cid} value={c.cid}>
                    {c.cid} - {c.cname}
                  </option>
                ))}
              </select>
            </div>

            {/* Status dropdown */}
            <div style={{ width: 160 }}>
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              >
                <option value="Proper">Proper</option>
                <option value="Repeat">Repeat</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "8px 14px",
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {loading ? "Processing..." : "Generate Admission"}
          </button>
        </form>

        {/* ✅ Admission List + Print */}
        {showAdmissions && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4>Admissions List</h4>
              <button
                onClick={handlePrint}
                style={{
                  background: "#4caf50",
                  color: "white",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Print Admission
              </button>
            </div>

            <div ref={printRef}>
              {admissions.length === 0 ? (
                <p>No admissions found.</p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    background: "#fff",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>ID</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>SID</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Batch</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Degree</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>CID</th>
                      <th style={{ border: "1px solid #ccc", padding: 8 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((a) => (
                      <tr key={a.admissionid || `${a.sid}-${a.cid}`}>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {a.admissionid || "-"}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.sid}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.batchid}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.degreeid}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.cid}</td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </>
    ); 
  }