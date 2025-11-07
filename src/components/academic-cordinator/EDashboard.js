import React from "react";
import { useNavigate } from "react-router-dom";
import "./EDashboard.css";

export default function EDashboard() {
  const navigate = useNavigate();

  return (
    <div className="edashboard-wrap">
      <h2 className="edash-title">Exam Dashboard</h2>

      <div className="edash-buttons">
        <button
          className="edash-btn primary"
          onClick={() => navigate("/exam-attendence")}
        >
          Mark Exam Attendance
        </button>

        <button
          className="edash-btn"
          onClick={() => navigate("/exam-attendence/download")}
        >
          Download Exam Attendance
        </button>

        <button
          className="edash-btn"
          onClick={() => navigate("/exam-attendence/upload")}
        >
          Upload Exam Attendance
        </button>

        <button
          className="edash-btn"
          onClick={() => navigate("/exam-attendence/confirm")}
        >
          Confirm Exam Attendance
        </button>
      </div>
    </div>
  );
}
