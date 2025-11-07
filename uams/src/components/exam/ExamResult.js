import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from '../../lib/supabaseClient';

// Mock dropdown data
const students = ["IT25069940", "IT25087765"];
const years = ["2024", "2025"];
const semesters = ["1", "2"];
const courseIds = ["IT1010", "IT1011", "IT1012"];

// Mock data from examresult table
const examResultsTable = [
  { marks: 86, grade: "B", sid: "IT25069940", cid: "IT1010", degreeid: "IT" },
  { marks: 76, grade: "C", sid: "IT25087765", cid: "IT1011", degreeid: "IT" },
  { marks: 77, grade: "A", sid: "IT25069940", cid: "IT1012", degreeid: "IT" },
];

export default function ExamForm() {
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
  const [results, setResults] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  // State for showing student results
  const [showStudentResults, setShowStudentResults] = useState(false);

  // Update payment options when student status changes
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
    const newRecord = {
      sid,
      year,
      semester,
      studentStatus,
      paymentType,
      date,
      cid,
      attachment,
    };
    if (isEditing) {
      const updated = [...results];
      updated[editIndex] = newRecord;
      setResults(updated);
    } else {
      setResults([...results, newRecord]);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    const record = results[index];
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
    const filtered = results.filter((_, i) => i !== index);
    setResults(filtered);
    resetForm();
  };

  const studentFilteredResults = examResultsTable.filter((r) => r.sid === sid);

  const fieldRow = { display: "flex", alignItems: "center", marginBottom: "10px" };
  const labelStyle = { flex: "0 0 150px", fontWeight: "bold" };
  const inputStyle = { flex: "1" };
  const tableCellStyle = { border: "1px solid #ccc", padding: "5px" };
  const tableHeaderStyle = {
    border: "1px solid #ccc",
    padding: "5px",
    backgroundColor: "#e3f2fd",
    fontWeight: "bold",
  };
  const tableButtonStyle = {
    padding: "5px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "white",
    fontSize: "14px",
  };

  return (
    <div style={{ fontFamily: "Arial" }}>
      {/* Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ecc82b",
          padding: "20px 40px",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "18px" }}>UAMS</div>
        <button
          style={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            padding: "5px 10px",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
          onClick={() => navigate("/exam-dashboard")}
        >
          Exam Dashboard
        </button>
      </div>

      <div style={{ maxWidth: "950px", margin: "20px auto" }}>
        {/* Result Button */}
        <div style={{ marginBottom: "15px", textAlign: "right" }}>
          <button
            style={{
              backgroundColor: "#2196F3",
              color: "white",
              padding: "8px 12px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={() => {
              if (!sid) {
                alert("Please select a Student ID first.");
                return;
              }
              setShowStudentResults(!showStudentResults);
            }}
          >
            Result
          </button>
        </div>

        {/* Show results for selected SID */}
        {showStudentResults && (
          <div
            style={{
              border: "2px solid #ccc",
              borderRadius: "10px",
              padding: "15px",
              background: "#fdfdfd",
              marginBottom: "20px",
            }}
          >
            <h3>Exam Results for {sid}</h3>
            {studentFilteredResults.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>SID</th>
                    <th style={tableHeaderStyle}>Course ID</th>
                    <th style={tableHeaderStyle}>Marks</th>
                    <th style={tableHeaderStyle}>Grade</th>
                    <th style={tableHeaderStyle}>Degree ID</th>
                  </tr>
                </thead>
                <tbody>
                  {studentFilteredResults.map((res, i) => (
                    <tr key={i}>
                      <td style={tableCellStyle}>{res.sid}</td>
                      <td style={tableCellStyle}>{res.cid}</td>
                      <td style={tableCellStyle}>{res.marks}</td>
                      <td style={tableCellStyle}>{res.grade}</td>
                      <td style={tableCellStyle}>{res.degreeid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No results found for this student.</p>
            )}
          </div>
        )}

        {/* Exam Publish Result Form */}
        <div
          style={{
            border: "2px solid #ccc",
            borderRadius: "10px",
            padding: "20px",
            backgroundColor: "#fdfdfd",
          }}
        >
          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
            {isEditing ? "Edit Results" : "Exam Results Form"}
          </h2>
          <form onSubmit={handleSubmit}>
            {/* Student Details */}
            <fieldset
              style={{
                border: "1px solid #aaa",
                padding: "15px",
                marginBottom: "20px",
                borderRadius: "5px",
              }}
            >
              <legend style={{ fontWeight: "bold" }}>Student Details</legend>
              <div style={fieldRow}>
                <label style={labelStyle}>Student ID:</label>
                <select
                  style={inputStyle}
                  value={sid}
                  onChange={(e) => setSid(e.target.value)}
                  required
                >
                  <option value="">-- Select SID --</option>
                  {students.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Year:</label>
                <select
                  style={inputStyle}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                >
                  <option value="">-- Select Year --</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Semester:</label>
                <select
                  style={inputStyle}
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  required
                >
                  <option value="">-- Select Semester --</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Status:</label>
                <div style={inputStyle}>
                  <label>
                    <input
                      type="radio"
                      name="status"
                      value="Proper"
                      checked={studentStatus === "Proper"}
                      onChange={(e) => setStudentStatus(e.target.value)}
                      required
                    />{" "}
                    Proper
                  </label>
                  <label style={{ marginLeft: "20px" }}>
                    <input
                      type="radio"
                      name="status"
                      value="Repeat"
                      checked={studentStatus === "Repeat"}
                      onChange={(e) => setStudentStatus(e.target.value)}
                    />{" "}
                    Repeat
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Payment Details */}
            <fieldset
              style={{
                border: "1px solid #aaa",
                padding: "15px",
                marginBottom: "20px",
                borderRadius: "5px",
              }}
            >
              <legend style={{ fontWeight: "bold" }}>Payment Details</legend>
              {studentStatus && (
                <div style={fieldRow}>
                  <label style={labelStyle}>Payment Type:</label>
                  <select
                    style={inputStyle}
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    required
                  >
                    <option value="">-- Select Payment Type --</option>
                    {paymentOptions.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={fieldRow}>
                <label style={labelStyle}>Date:</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Course ID (CID):</label>
                <select
                  style={inputStyle}
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  required
                >
                  <option value="">-- Select CID --</option>
                  {courseIds.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            {/* Attachment */}
            <fieldset
              style={{
                border: "1px solid #aaa",
                padding: "15px",
                marginBottom: "20px",
                borderRadius: "5px",
              }}
            >
              <legend style={{ fontWeight: "bold" }}>Attachment</legend>
              <div style={fieldRow}>
                <label style={labelStyle}>Upload File:</label>
                <input
                  style={inputStyle}
                  type="file"
                  onChange={handleAttachmentChange}
                />
              </div>
              {attachment && (
                <div style={{ marginLeft: "150px" }}>
                  <p>{attachment.name}</p>
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment)}
                  >
                    Download
                  </button>
                </div>
              )}
            </fieldset>

            {/* Buttons */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <button
                type="submit"
                style={{
                  backgroundColor: "skyblue",
                  color: "white",
                  padding: "10px 15px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                  marginRight: "10px",
                }}
              >
                {isEditing ? "Update Result" : "Publish Result"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    backgroundColor: "#f44336",
                    color: "white",
                    padding: "10px 15px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Results Table */}
          {results.length > 0 && (
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
                {results.map((adm, index) => (
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
                        <button onClick={() => handleDownload(adm.attachment)}>
                          Download
                        </button>
                      ) : (
                        "No file"
                      )}
                    </td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => handleEdit(index)}
                        style={{
                          ...tableButtonStyle,
                          backgroundColor: "#2196F3",
                          marginRight: "5px",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        style={{
                          ...tableButtonStyle,
                          backgroundColor: "#f44336",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
