import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import supabase from "../../lib/supabaseClient";
import "react-big-calendar/lib/css/react-big-calendar.css";


const localizer = momentLocalizer(moment);
const EXAM_COLOR = "#90CAF9";

const safeToDate = (date, time) => {
  if (!date || !time) return null;
  const t = time.length === 5 ? `${time}:00` : time;
  const d = new Date(`${date}T${t}`);
  return isNaN(d.getTime()) ? null : d;
};

export default function ExamTimetable({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);

  async function fetchExams() {
    setLoading(true);
    try {
      // select all columns (avoids referencing non-existent column names)
      const res = await supabase.from("examtimetable").select("*").order("date", { ascending: true }).order("starttime", { ascending: true });

      if (res.error) {
        // log but do not surface DB column errors to the UI
        console.error("examtimetable fetch error:", res.error);
        setEvents([]);
        return;
      }

      const data = res.data || [];
      const examEvents = data
        .map((r) => {
          const id = r.examtimetableid ?? r.id ?? null;
          const start = safeToDate(r.date, r.starttime);
          const end = safeToDate(r.date, r.endtime);
          if (!id || !start || !end) return null;
          const title = r.cid ? `Exam: ${r.cid}` : `Exam${r.examcategory ? ` (${r.examcategory})` : ""}`;
          return {
            id,
            title,
            start,
            end,
            resource: { ...r, pkName: r.examtimetableid ? "examtimetableid" : id ? "id" : undefined },
            type: "exam",
            table: "examtimetable",
          };
        })
        .filter(Boolean);

      setEvents(examEvents);
    } catch (err) {
      console.error("fetchExams unexpected error", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const eventPropGetter = useMemo(
    () => (event) => ({
      style: { backgroundColor: EXAM_COLOR, border: "none", color: "#000", opacity: 0.95 },
    }),
    []
  );

  // inline navbar (yellow)
  const navbarStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: 64,
    backgroundColor: "#E6BB0C",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    boxSizing: "border-box",
    zIndex: 1000,
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  };
  const titleStyle = { color: "#2f2f2f", fontSize: 26, fontWeight: 800 };
  const navButtonStyle = {
    background: "white",
    border: "1px solid rgba(0,0,0,0.12)",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <>
      <div style={navbarStyle} role="navigation" aria-label="Top navigation">
        <div style={titleStyle}>UAMS</div>
        <div>
          <button
            style={navButtonStyle}
            onClick={() => navigate("/exam-dashboard")}
            aria-label="Go to exam dashboard"
          >
            Exam Dashboard
          </button>
        </div>
      </div>

      {/* main content - ensure it sits below the fixed navbar */}
      <div className="calendar-container" style={{ paddingTop: 90 }}>
        <div className="calendar-header">
          <h3>
            Exam Timetable {loading ? "(loading...)" : ""}
            <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>• Exam = blue</span>
          </h3>
          {/* error messages are intentionally not rendered to avoid exposing DB column errors */}
          {!loading && events.length === 0 && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>No exam events found.</div>}
        </div>

        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          onNavigate={(d) => setCurrentDate(d)}
          view={view}
          onView={(v) => setView(v)}
          views={[Views.WEEK, Views.MONTH]}
          style={{ height: 560 }}
          eventPropGetter={eventPropGetter}
        />

        <div style={{ marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Exam list</h4>
          {events.length === 0 ? (
            <p style={{ margin: 0 }}>No exams to show.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>ID</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Course</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Date</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Start</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>End</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Venue</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Category</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={String(e.id)}>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{e.id}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{e.resource?.cid || ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{moment(e.start).format("YYYY-MM-DD")}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{moment(e.start).format("HH:mm")}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{moment(e.end).format("HH:mm")}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{e.resource?.vid || ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{e.resource?.examcategory || ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>{e.resource?.Status ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}