import React, { useState } from "react";
import LectureForm from "./LectureForm";
import ExamForm from "./ExamForm";
import OthersTab from "./OtherTab";

import CalendarView from "./CalendarView"; // ✅ use your actual file
import "./TimetableDashboard.css";

function TimetableDashboard() {
  const [activeTab, setActiveTab] = useState("lecture");
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Calendar refresh trigger
  const [refresh, setRefresh] = useState(false);
  const bumpRefresh = () => setRefresh((r) => !r);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "lecture":
        return <LectureForm onDataAdded={bumpRefresh} />;
      case "exam":
        return <ExamForm onDataAdded={bumpRefresh} />;
      case "others":
        return <OthersTab />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      {/* NAVBAR */}
      <div className="navbar">
        <h1 className="navbar-title">UAMS</h1>
        <button
          className={`navbar-button ${isButtonHovered ? "hovered" : ""}`}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          onClick={handleLogout}
        >
          <span className="button-text">Sign Out</span>
        </button>
      </div>

      {/* TABS */}
      <div className="tab-container">
        <div
          className={`tab-button ${activeTab === "lecture" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("lecture")}
        >
          Lecture Timetable
        </div>
        <div
          className={`tab-button ${activeTab === "exam" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("exam")}
        >
          Exam Timetable
        </div>
        <div
          className={`tab-button ${activeTab === "others" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("others")}
        >
          Others
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="tab-content">{renderTabContent()}</div>

      {/* CALENDAR below forms */}
      {(activeTab === "lecture" || activeTab === "exam") && (
        <div className="calendar-block">
          <CalendarView refreshKey={refresh} onChanged={bumpRefresh} />
        </div>
      )}
    </div>
  );
}

export default TimetableDashboard;
