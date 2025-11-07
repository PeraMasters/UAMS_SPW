import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavBar from "../DashboardNavBar";
import supabase from "../../lib/supabaseClient";
import "./examattendenceview.css";

export default function ExamAttendenceView() {
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [rowsForDate, setRowsForDate] = useState([]); // raw rows for selected date
  const [cids, setCids] = useState([]); // unique cids for date
  const [cid, setCid] = useState("");
  const [rowsForCid, setRowsForCid] = useState([]); // rows for date+cid (only with null status)

  // map of cid -> course name (cname)
  const [courseMap, setCourseMap] = useState({});

  // Suggested/available values (unique)
  const [startTimes, setStartTimes] = useState([]);
  const [endTimes, setEndTimes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);

  // selected values
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState("");
  const [examType, setExamType] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // when date changes -> load rows for that date and derive unique cids
  useEffect(() => {
    setError("");
    setCid("");
    setRowsForCid([]);
    setStartTimes([]);
    setEndTimes([]);
    setCategories([]);
    setTypes([]);
    setStartTime("");
    setEndTime("");
    setCategory("");
    setExamType("");

    if (!date) {
      setRowsForDate([]);
      setCids([]);
      return;
    }

    const loadForDate = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("examtimetable")
          .select("*")
          .eq("date", date);

        if (error) throw error;
        const rows = data || [];
        setRowsForDate(rows);
        const uniqueCids = [...new Set(rows.map(r => r.cid).filter(Boolean))];
        setCids(uniqueCids);

        // fetch course names for the cids we found
        if (uniqueCids.length) {
          try {
            const { data: courses, error: courseErr } = await supabase
              .from("course")
              .select("cid,cname")
              .in("cid", uniqueCids);
            if (courseErr) throw courseErr;
            const map = {};
            (courses || []).forEach(c => {
              // ensure keys are strings to match row.cid usage
              map[String(c.cid)] = c.cname || "";
            });
            setCourseMap(map);
          } catch (cErr) {
            console.warn("Failed to fetch course names for cids:", cErr);
            setCourseMap({});
          }
        } else {
          setCourseMap({});
        }
      } catch (err) {
        setError("Failed to load exams for selected date.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadForDate();
  }, [date]);

  // when cid selected -> derive suggestions and auto-fill if single record
  useEffect(() => {
    // reset UI state
    setError("");
    setRowsForCid([]);
    setStartTimes([]);
    setEndTimes([]);
    setCategories([]);
    setTypes([]);
    setStartTime("");
    setEndTime("");
    setCategory("");
    setExamType("");

    if (!date || !cid) return;

    const rows = rowsForDate.filter(r => String(r.cid) === String(cid));

    // only keep rows where status is null/empty/undefined
    const availableRows = rows.filter(r => {
      const s = r.status;
      if (s === null || s === undefined) return true;
      if (typeof s === "string" && s.trim() === "") return true;
      // otherwise status present -> exclude
      return false;
    });

    // if there are rows but none available (all have status set), show message and stop
    if (rows.length > 0 && availableRows.length === 0) {
      setRowsForCid([]);
      setError("Exam already completed or posponed");
      return;
    }

    // proceed with available rows
    setRowsForCid(availableRows);

    const uniq = (arr) => [...new Set(arr.filter(Boolean))];

    setStartTimes(uniq(availableRows.map(r => r.starttime)));
    setEndTimes(uniq(availableRows.map(r => r.endtime)));
    setCategories(uniq(availableRows.map(r => r.examcategory)));
    setTypes(uniq(availableRows.map(r => r.Exam_Type))); // column name as given

    if (availableRows.length >= 1) {
      const r = availableRows[0];
      setStartTime(r.starttime || "");
      setEndTime(r.endtime || "");
      setCategory(r.examcategory || "");
      setExamType(r.Exam_Type || "");
    }
  }, [cid, rowsForDate, date]);

  const handleDateChange = (e) => setDate(e.target.value);
  const handleCidChange = (e) => setCid(e.target.value);

  // navigate to mark attendance page for a specific exam entry
  const handleMarkAttendanceForRow = (row) => {
    // pass exam info to confirm page via query params
    const pk = row.examtimetable ?? row.id ?? "";
    const params = new URLSearchParams({
      pk,
      date: row.date || date || "",
      cid: row.cid || "",
      starttime: row.starttime || "",
      endtime: row.endtime || "",
      examcategory: row.examcategory || "",
      Exam_Type: row.Exam_Type || ""
    }).toString();
    navigate(`/confirmattendence?${params}`);
  };

  // add this helper inside the component
  async function saveExamAttendance(payload) {
    console.log("SAVE_EXAM_ATTEMPT:", payload);
    try {
      // try upsert (avoid duplicate key errors) — change onConflict keys to match your table unique constraint
      const { data, error } = await supabase
        .from("examattendance")
        .upsert([payload], { onConflict: ["studentid", "examid", "date"] })
        .select();

      console.log("SAVE_EXAM_RESPONSE:", { data, error });
      if (error) {
        // log full error object and rethrow
        console.error("SAVE_EXAM_ERROR:", error);
        throw error;
      }
      return data;
    } catch (err) {
      // log full exception
      console.error("SAVE_EXAM_EXCEPTION:", err);
      // rethrow so callers can show UI error
      throw err;
    }
  }

  // Example use in your existing save handler:
  async function handleSave(row) {
    const payload = {
      studentid: row.studentid,
      examid: row.examid,
      status: true,
      date: date, // use your component date state
      // add any other required columns here
    };

    try {
      await saveExamAttendance(payload);
      console.log("Saved successfully for", payload.studentid);
      // update local UI state as needed
    } catch (err) {
      // show brief user message (keep full details in console)
      alert("Failed saving to examattendance. See console/Network for details.");
    }
  }

  // temporary: expose the handler so it's considered "used" until you wire it to a button in the UI.
  // Remove this line once you add onClick={() => handleSave(row)} to your save/confirm button.
  // eslint-disable-next-line no-undef
  if (typeof window !== "undefined") window.handleSave = handleSave;

  return (
    <div>
      <DashboardNavBar />
      <div className="exam-page-wrapper">
        <h2 style={{ marginBottom: 8 }}>Select Exam</h2>

        <div className="controls">
          <div className="field field-date">
            <label>Date</label>
            <input type="date" value={date} onChange={handleDateChange} />
          </div>

          <div className="field">
            <label>Course</label>
            <select value={cid} onChange={handleCidChange}>
              <option value="">Select date first</option>
              {cids.map(c => (
                <option key={c} value={c}>
                  {courseMap[String(c)] ? `${courseMap[String(c)]} (${c})` : c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Start Time</label>
            <select value={startTime} onChange={e => setStartTime(e.target.value)}>
              <option value="">--</option>
              {startTimes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="field">
            <label>End Time</label>
            <select value={endTime} onChange={e => setEndTime(e.target.value)}>
              <option value="">--</option>
              {endTimes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Exam Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">--</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)}>
              <option value="">--</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          {!loading && rowsForCid.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ marginBottom: 8 }}>Matching Exam Entries</h4>
              <table className="exam-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Course</th>
                    <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Start</th>
                    <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>End</th>
                    <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Category</th>
                    <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Type</th>
                    <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsForCid.map((r, idx) => (
                    <tr key={r.examtimetable ?? idx}>
                      <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>
                        {courseMap[String(r.cid)] ? `${courseMap[String(r.cid)]} (${r.cid})` : r.cid}
                      </td>
                      <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>{r.starttime}</td>
                      <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>{r.endtime}</td>
                      <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>{r.examcategory}</td>
                      <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>{r.Exam_Type}</td>
                      <td style={{ padding: 6, borderBottom: "1px solid #f0f0f0" }}>
                        <button onClick={() => handleMarkAttendanceForRow(r)} className="mark-btn">
                          Mark Attendance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rowsForCid.length === 0 && cid && !error && (
            <p style={{ marginTop: 12 }}>No exam entries found for selected date + cid.</p>
          )}
        </div>
      </div>
    </div>
  );
}
