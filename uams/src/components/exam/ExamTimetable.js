import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NavbarWithCalendar() {
  const navigate = useNavigate();

  const goToExamDashboard = () => {
    navigate("/exam-dashboard");
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Today's date
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Get number of days in month
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get which day of week month starts on (0 = Sun)
  const getStartDay = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  // Change month
  const changeMonth = (offset) => {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Click handler for date
  const handleDateClick = (day) => {
    alert(`You clicked on ${monthNames[currentMonth]} ${day}, ${currentYear}`);
  };

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Get calendar data
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const startDay = getStartDay(currentMonth, currentYear);

  // Calendar grid: add empty slots for start day
  const calendarCells = [];
  let emptySlots = startDay === 0 ? 6 : startDay - 1; // Adjust for Monday start
  for (let i = 0; i < emptySlots; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Navbar */}
      <div
        style={{
          backgroundColor: "#eac728",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "20px" }}>UAMS</div>
        <button
          onClick={goToExamDashboard}
          style={{
            backgroundColor: "#fff",
            border: "none",
            borderRadius: "5px",
            padding: "8px 14px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
            boxShadow: "0 0 4px rgba(0,0,0,0.2)",
          }}
        >
          Exam Dashboard
        </button>
      </div>

      {/* Calendar */}
      <div
        style={{
          maxWidth: "900px",
          margin: "30px auto",
          padding: "25px",
          border: "1px solid #ddd",
          borderRadius: "10px",
          backgroundColor: "#fff",
          fontSize: "18px",
        }}
      >
        {/* Header with navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <button
            onClick={() => changeMonth(-1)}
            style={{
              background: "none",
              border: "none",
              color: "red",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ◀ {monthNames[(currentMonth + 11) % 12]}
          </button>
          <h2 style={{ margin: 0 }}>
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            style={{
              background: "none",
              border: "none",
              color: "red",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            {monthNames[(currentMonth + 1) % 12]} ▶
          </button>
        </div>

        {/* Days of week */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            textAlign: "center",
            fontWeight: "bold",
            borderBottom: "1px solid #ddd",
            paddingBottom: "8px",
          }}
        >
          {daysOfWeek.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Dates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            textAlign: "center",
            marginTop: "8px",
            rowGap: "15px",
          }}
        >
          {calendarCells.map((day, index) =>
            day ? (
              <div
                key={index}
                style={{
                  ...dateCellStyle,
                  backgroundColor:
                    day === todayDate &&
                    currentMonth === todayMonth &&
                    currentYear === todayYear
                      ? "darkred"
                      : "transparent",
                  color:
                    day === todayDate &&
                    currentMonth === todayMonth &&
                    currentYear === todayYear
                      ? "#fff"
                      : "#000",
                  fontWeight:
                    day === todayDate &&
                    currentMonth === todayMonth &&
                    currentYear === todayYear
                      ? "bold"
                      : "normal",
                  position: "relative",
                }}
                onClick={() => handleDateClick(day)}
              >
                {day}
                {day === todayDate &&
                  currentMonth === todayMonth &&
                  currentYear === todayYear && (
                    <div
                      style={{
                        position: "absolute",
                        top: "110%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "12px",
                        color: "darkorange",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Today
                    </div>
                  )}
              </div>
            ) : (
              <div key={index}></div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Date cell style
const dateCellStyle = {
  padding: "14px",
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: "18px",
  transition: "background 0.2s",
  userSelect: "none",
};







