import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Mock dropdown data
const students = ["IT25069940", "IT20069940"];
const years = ["2024", "2025"];
const semesters = ["1", "2"];
const courseIds = ["IT1010", "IT1014", "IT1015"];

// Mock past admissions data (from your screenshots)
const pastAdmissionsData = [
  // Other payment
  { sid: "IT25069940", year: "2025", semester: "1", studentStatus: "Repeat", paymentType: "Prorata", date: "2025-08-01", cid: "IT1010" },
  { sid: "IT20069940", year: "2025", semester: "1", studentStatus: "Repeat", paymentType: "Repeat Module", date: "2025-08-06", cid: "IT1014" },
  { sid: "IT20069940", year: "2025", semester: "1", studentStatus: "Repeat", paymentType: "Repeat Module", date: "2025-08-06", cid: "IT1015" },
  { sid: "IT20069940", year: "2025", semester: "1", studentStatus: "Repeat", paymentType: "Repeat Module", date: "2025-08-08", cid: "IT1010" },
  // Semester payment
  { sid: "IT25069940", year: "2025", semester: "1", studentStatus: "Proper", paymentType: "Semester Payment", date: "2025-08-06", cid: "" },
  { sid: "IT20069940", year: "2025", semester: "1", studentStatus: "Proper", paymentType: "Semester Payment", date: "2025-08-08", cid: "" },
];

export default function ExamAdmissionForm() {
  const navigate = useNavigate();

  const [sid, setSid] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [studentStatus, setStudentStatus] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [date, setDate] = useState("");
  const [cid, setCid] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [showMyView, setShowMyView] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    if (studentStatus === "Proper") {
      setPaymentOptions(["Semester Payment"]);
    } else if (studentStatus === "Repeat") {
      setPaymentOptions(["Repeat Module", "Prorata"]);
    } else {
      setPaymentOptions([]);
    }
  }, [studentStatus]);

  const handleAttachmentChange = (e) => {
    setAttachment(e.target.files[0] || null);
  };

  const handleDownload = (file) => {
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
    }
  };

  const resetForm = () => {
    setSid("");
    setYear("");
    setSemester("");
    setStudentStatus("");
    setPaymentType("");
    setDate("");
    setCid("");
    setAttachment(null);
    setIsEditing(false);
    setEditIndex(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newRecord = { sid, year, semester, studentStatus, paymentType, date, cid, attachment };
    if (isEditing) {
      const updated = [...admissions];
      updated[editIndex] = newRecord;
      setAdmissions(updated);
    } else {
      setAdmissions([...admissions, newRecord]);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    const record = admissions[index];
    setSid(record.sid);
    setYear(record.year);
    setSemester(record.semester);
    setStudentStatus(record.studentStatus);
    setPaymentType(record.paymentType);
    setDate(record.date);
    setCid(record.cid);
    setAttachment(record.attachment);
    setIsEditing(true);
    setEditIndex(index);
  };

  const handleDelete = (index) => {
    const filtered = admissions.filter((_, i) => i !== index);
    setAdmissions(filtered);
    resetForm();
  };

  const filteredAdmissions = [
    ...admissions,
    ...pastAdmissionsData
  ].filter((adm) => {
    if (!filterDate) return true;
    return new Date(adm.date) <= new Date(filterDate);
  });

  const fieldRow = { display: "flex", alignItems: "center", marginBottom: "10px" };
  const labelStyle = { flex: "0 0 150px", fontWeight: "bold" };
  const inputStyle = { flex: "1" };
  const tableCellStyle = { border: "1px solid #ccc", padding: "5px" };
  const tableHeaderStyle = { border: "1px solid #ccc", padding: "5px", backgroundColor: "#e3f2fd", fontWeight: "bold" };
  const tableButtonStyle = { padding: "5px 10px", border: "none", borderRadius: "4px", cursor: "pointer", color: "white", fontSize: "14px" };

  return (
    <div style={{ fontFamily: "Arial" }}>
      {/* Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ecc82b", padding: "20px 40px" }}>
        <div style={{ fontWeight: "bold", fontSize: "18px" }}>UAMS</div>
        <button
          style={{ backgroundColor: "white", border: "1px solid #ccc", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          onClick={() => navigate("/exam-dashboard")}
        >
          Exam Dashboard
        </button>
      </div>

      <div style={{ maxWidth: "950px", margin: "20px auto" }}>
        {/* Toggle My View */}
        <div style={{ textAlign: "right", marginBottom: "10px" }}>
          <button
            style={{ backgroundColor: "#4CAF50", color: "white", padding: "8px 12px", border: "none", borderRadius: "5px", cursor: "pointer" }}
            onClick={() => setShowMyView(!showMyView)}
          >
            {showMyView ? "Back to Form" : "My View"}
          </button>
        </div>

        {/* My View Section */}
        {showMyView ? (
          <div style={{ border: "2px solid #ccc", borderRadius: "10px", padding: "15px", background: "#fdfdfd" }}>
            <h3>Past Exam Admissions</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "bold", marginRight: "10px" }}>Date:</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>SID</th>
                  <th style={tableHeaderStyle}>Year</th>
                  <th style={tableHeaderStyle}>Semester</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Payment Type</th>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>CID</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissions.map((adm, i) => (
                  <tr key={i}>
                    <td style={tableCellStyle}>{adm.sid}</td>
                    <td style={tableCellStyle}>{adm.year}</td>
                    <td style={tableCellStyle}>{adm.semester}</td>
                    <td style={tableCellStyle}>{adm.studentStatus}</td>
                    <td style={tableCellStyle}>{adm.paymentType}</td>
                    <td style={tableCellStyle}>{adm.date}</td>
                    <td style={tableCellStyle}>{adm.cid || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Exam Admission Form
          <div style={{ border: "2px solid #ccc", borderRadius: "10px", padding: "20px", backgroundColor: "#fdfdfd" }}>
            <h2 style={{ textAlign: "center", marginBottom: "20px" }}>{isEditing ? "Edit Admission" : "Exam Admission Form"}</h2>
            <form onSubmit={handleSubmit}>
              {/* Student Details */}
              <fieldset style={{ border: "1px solid #aaa", padding: "15px", marginBottom: "20px", borderRadius: "5px" }}>
                <legend style={{ fontWeight: "bold" }}>Student Details</legend>
                <div style={fieldRow}>
                  <label style={labelStyle}>Student ID:</label>
                  <select style={inputStyle} value={sid} onChange={(e) => setSid(e.target.value)} required>
                    <option value="">-- Select SID --</option>
                    {students.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div style={fieldRow}>
                  <label style={labelStyle}>Year:</label>
                  <select style={inputStyle} value={year} onChange={(e) => setYear(e.target.value)} required>
                    <option value="">-- Select Year --</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div style={fieldRow}>
                  <label style={labelStyle}>Semester:</label>
                  <select style={inputStyle} value={semester} onChange={(e) => setSemester(e.target.value)} required>
                    <option value="">-- Select Semester --</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
                <div style={fieldRow}>
                  <label style={labelStyle}>Status:</label>
                  <div style={inputStyle}>
                    <label>
                      <input type="radio" name="status" value="Proper" checked={studentStatus === "Proper"} onChange={(e) => setStudentStatus(e.target.value)} required /> Proper
                    </label>
                    <label style={{ marginLeft: "20px" }}>
                      <input type="radio" name="status" value="Repeat" checked={studentStatus === "Repeat"} onChange={(e) => setStudentStatus(e.target.value)} /> Repeat
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* Payment Details */}
              <fieldset style={{ border: "1px solid #aaa", padding: "15px", marginBottom: "20px", borderRadius: "5px" }}>
                <legend style={{ fontWeight: "bold" }}>Payment Details</legend>
                {studentStatus && (
                  <div style={fieldRow}>
                    <label style={labelStyle}>Payment Type:</label>
                    <select style={inputStyle} value={paymentType} onChange={(e) => setPaymentType(e.target.value)} required>
                      <option value="">-- Select Payment Type --</option>
                      {paymentOptions.map((pt) => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={fieldRow}>
                  <label style={labelStyle}>Date:</label>
                  <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div style={fieldRow}>
                  <label style={labelStyle}>Course ID (CID):</label>
                  <select style={inputStyle} value={cid} onChange={(e) => setCid(e.target.value)} required>
                    <option value="">-- Select CID --</option>
                    {courseIds.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </fieldset>

              {/* Attachment */}
              <fieldset style={{ border: "1px solid #aaa", padding: "15px", marginBottom: "20px", borderRadius: "5px" }}>
                <legend style={{ fontWeight: "bold" }}>Attachment</legend>
                <div style={fieldRow}>
                  <label style={labelStyle}>Upload File:</label>
                  <input style={inputStyle} type="file" onChange={handleAttachmentChange} />
                </div>
                {attachment && (
                  <div style={{ marginLeft: "150px" }}>
                    <p>{attachment.name}</p>
                    <button type="button" onClick={() => handleDownload(attachment)}>Download</button>
                  </div>
                )}
              </fieldset>

              {/* Buttons */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <button type="submit" style={{ backgroundColor: "skyblue", color: "white", padding: "10px 15px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", marginRight: "10px" }}>
                  {isEditing ? "Update Admission" : "Generate Admission"}
                </button>
                {isEditing && (
                  <button type="button" onClick={resetForm} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 15px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Admissions Table */}
            {admissions.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>SID</th>
                    <th style={tableHeaderStyle}>Year</th>
                    <th style={tableHeaderStyle}>Semester</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Payment Type</th>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>CID</th>
                    <th style={tableHeaderStyle}>Attachment</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((adm, index) => (
                    <tr key={index}>
                      <td style={tableCellStyle}>{adm.sid}</td>
                      <td style={tableCellStyle}>{adm.year}</td>
                      <td style={tableCellStyle}>{adm.semester}</td>
                      <td style={tableCellStyle}>{adm.studentStatus}</td>
                      <td style={tableCellStyle}>{adm.paymentType}</td>
                      <td style={tableCellStyle}>{adm.date}</td>
                      <td style={tableCellStyle}>{adm.cid}</td>
                      <td style={tableCellStyle}>
                        {adm.attachment ? (
                          <button onClick={() => handleDownload(adm.attachment)}>Download</button>
                        ) : "No file"}
                      </td>
                      <td style={tableCellStyle}>
                        <button onClick={() => handleEdit(index)} style={{ ...tableButtonStyle, backgroundColor: "#2196F3", marginRight: "5px" }}>Edit</button>
                        <button onClick={() => handleDelete(index)} style={{ ...tableButtonStyle, backgroundColor: "#f44336" }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}