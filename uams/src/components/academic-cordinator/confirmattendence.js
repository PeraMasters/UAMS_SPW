import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../../lib/supabaseClient";
import "./confirmattendence.css";

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function ConfirmAttendence() {
   const query = useQuery();
   const pk = query.get("pk");
   const cidParam = query.get("cid");

  const [loading, setLoading] = useState(false);
  const [examMeta, setExamMeta] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // keyed by sid
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pk, cidParam]);

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      let examRow = null;
      if (pk) {
        const exRes = await supabase
          .from("examtimetable")
          .select("*")
          .eq("examtimetableid", pk)   // use real PK column name
          .limit(1)
          .maybeSingle();
        if (exRes && exRes.error) throw exRes.error;
        examRow = exRes?.data ?? null;
      }

      const cid = cidParam || (examRow && (examRow.cid || examRow.CID)) || null;
      if (!cid) {
        setMessage("CID missing. Cannot load admissions.");
        setStudents([]);
        setExamMeta(null);
        setLoading(false);
        return;
      }

      // Fetch admissions tied to this exact timetable slot when pk present
      let admissions = [];
      if (pk) {
        // 1) try direct link via examtimetableid (preferred if populated)
        const admRes = await supabase
          .from("examadmission")
          .select("admissionid,sid,status,batchid,degreeid,examtimetableid")
          .eq("examtimetableid", pk)
          .eq("cid", cid)
          .limit(2000);

        if (admRes.error) throw admRes.error;

        if (admRes.data && admRes.data.length > 0) {
          admissions = admRes.data;
        } else {
          // 2) fallback: map examtimetable.lid -> examadmission.batchid
          const slotLid = String(examRow?.lid ?? "");
          const admRes2 = await supabase
            .from("examadmission")
            .select("admissionid,sid,status,batchid,degreeid")
            .eq("cid", cid)
            .eq("batchid", slotLid)
            .limit(2000);

          if (admRes2.error) throw admRes2.error;
          admissions = admRes2.data || [];
        }
      } else {
        // fallback: previous behaviour (filter by cid/status/batch)
        const admissionFilter = { cid, status: 2 };
        const batchParam = new URLSearchParams(window.location.search).get("batch");
        if (batchParam) admissionFilter.batchid = batchParam;
        const admRes = await supabase
          .from("examadmission")
          .select("admissionid,sid,status,batchid,degreeid")
          .match(admissionFilter);
        if (admRes.error) throw admRes.error;
        admissions = admRes.data || [];
      }

      if (admissions.length === 0) {
        setMessage("No admissions found for this exam slot (filtered).");
        setStudents([]);
        setExamMeta(prev => ({ ...(prev || {}), cid, examRow }));
        setLoading(false);
        return;
      }

      // Build unique SIDs to fetch student names
      const sids = Array.from(new Set(admissions.map(a => String(a.sid).trim()).filter(Boolean)));

      // Fetch student details
      const studentMap = {};
      if (sids.length) {
        try {
          const stuRes = await supabase
            .from("student")
            .select("sid,f_name,l_name")
            .in("sid", sids)
            .limit(1000);
          if (!stuRes.error && stuRes.data && stuRes.data.length) {
            stuRes.data.forEach(st => {
              const key = st.sid ?? st.id;
              const name = `${st.f_name || ""} ${st.l_name || ""}`.trim() || st.name || "-";
              if (key) studentMap[String(key)] = name;
            });
          }
        } catch (e) {
          console.warn("student fetch failed:", e);
        }
      }

      // Load existing attendance for this timetable slot (precise)
      const attendanceMap = {};
      if (pk) {
        const attRes = await supabase
          .from("examattendance")
          .select("sid,attendence,date,examtimetableid,start_time,end_time,examid")
          .eq("examtimetableid", pk);
        if (!attRes.error && attRes.data) {
          attRes.data.forEach(a => { attendanceMap[String(a.sid)] = !!a.attendence; });
        }
      } else {
        const dateVal = examRow?.date ?? null;
        if (dateVal) {
          const attRes2 = await supabase
            .from("examattendance")
            .select("sid,attendence,date,examid")
            .eq("date", dateVal)
            .eq("cid", cid);
          if (!attRes2.error && attRes2.data) {
            attRes2.data.forEach(a => { attendanceMap[String(a.sid)] = !!a.attendence; });
          }
        }
      }

      // Build students list for UI (only those admissions matching the slot)
      const studentsList = admissions.map(a => ({
        admissionid: a.admissionid,
        sid: a.sid,
        name: studentMap[a.sid] || "-",
        status: a.status ?? "",
        batchid: a.batchid,
        degreeid: a.degreeid,
        attendance: attendanceMap[String(a.sid)] ?? false
      }));

      // Initialize attendance UI state from attendanceMap (or false)
      const attState = {};
      studentsList.forEach(s => { attState[s.sid] = !!s.attendance; });

      setStudents(studentsList);
      setAttendance(attState);
      setExamMeta({ cid, examRow });
    } catch (err) {
      console.error(err);
      setMessage("Failed loading admissions/students. Check DB schema and column names.");
      setStudents([]);
      setExamMeta(null);
    } finally {
      setLoading(false);
    }
  }

  // replace saveAttendanceToExamAttendance to write into examattendance (include examtimetableid/date/time)
  const saveAttendanceToExamAttendance = async (sid, present) => {
    const row = students.find(s => String(s.sid) === String(sid));
    if (!row) throw new Error("Row not found for sid " + sid);
    const cidVal = examMeta?.cid;
    const examRow = examMeta?.examRow ?? examMeta?.examRow ?? examMeta?.examRow;
    const timetableId = examMeta?.examRow?.examtimetableid ?? (pk ? Number(pk) : null);

    if (!sid || !cidVal) throw new Error("Missing sid or cid");

    const payload = {
      sid: String(sid),
      cid: String(cidVal),
      examtimetableid: timetableId,
      date: examRow?.date ?? new Date().toISOString().slice(0,10),
      start_time: examRow?.starttime ?? null,
      end_time: examRow?.endtime ?? null,
      status: examRow?.Status ?? examRow?.status ?? null,
      attendence: !!present
    };

    console.log("saveAttendance payload -> examattendance:", payload);

    // Upsert by (sid, examtimetableid) - requires unique index in DB
    const { data, error } = await supabase
      .from("examattendance")
      .upsert([payload], { onConflict: ["sid", "examtimetableid"] })
      .select();

    if (error) {
      console.error("saveAttendanceToExamAttendance error:", error, payload);
      throw error;
    }

    return data;
  };

  const toggleAttendance = async (sid) => {
    setMessage("");
    let newState;
    setAttendance(prev => {
      newState = !prev[sid];
      return { ...prev, [sid]: newState };
    });

    try {
      await saveAttendanceToExamAttendance(sid, newState);
      setMessage("Attendance saved to examattendance.");
    } catch (err) {
      console.error("Failed saving to examattendance for", sid, err);
      setAttendance(prev => ({ ...prev, [sid]: !newState }));
      setMessage("Failed to save attendance. See console for details.");
    }
  };

  async function confirmAllAttendance() {
    if (!examMeta) return;
    setSaving(true);
    setMessage("");
    try {
      const failed = [];
      let successCount = 0;

      for (const s of students) {
        const present = !!attendance[s.sid];
        try {
          await saveAttendanceToExamAttendance(s.sid, present);
          successCount++;
        } catch (err) {
          failed.push({ row: s, error: err });
        }
      }

      if (failed.length) {
        console.error("Some rows failed to save to examattendance:", failed);
        setMessage(`Saved ${successCount}, failed ${failed.length}. See console for details.`);
      } else {
        setStudents(prev => prev.map(s => ({
          ...s,
          status: attendance[s.sid] ? "present" : "absent",
          attendence: !!attendance[s.sid]
        })));
        setMessage("Attendance saved to examattendance.");
      }
    } catch (err) {
      console.error("confirmAllAttendance unexpected error:", err);
      setMessage("Failed to save attendance. See console for details.");
    } finally {
      setSaving(false);
    }
  }

  // derived counts for the UI summary
  const eligibleCount = students.length;
  const presentCount = students.filter(s => !!attendance[s.sid]).length;
  const absentCount = eligibleCount - presentCount;

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div className="confirm-wrapper">
      <h2 className="page-title">Confirm Attendance</h2>

      {message && (
        <div className={`message ${message.includes("Failed") || message.toLowerCase().includes("failed") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <div className="summary">
        <strong>CID:</strong> {examMeta?.cid || "-"} &nbsp;|&nbsp;
        <strong>Eligible students:</strong> {eligibleCount} &nbsp;|&nbsp;
        <strong>Present:</strong> {presentCount} &nbsp;|&nbsp;
        <strong>Absent:</strong> {absentCount}
      </div>

      <table className="students-table">
         <thead>
           <tr>
             <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>#</th>
             <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Student ID</th>
             <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Name</th>
             <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Status</th>
             <th className="center" style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #ddd" }}>Present</th>
           </tr>
         </thead>
         <tbody>
           {students.map((s, idx) => (
            <tr key={s.sid || idx}>
              <td>{idx + 1}</td>
              <td>{s.sid}</td>
              <td>{s.name || "-"}</td>
              <td>{s.status || "-"}</td>
              <td className="center">
                <input type="checkbox" checked={!!attendance[s.sid]} onChange={() => toggleAttendance(s.sid)} />
              </td>
            </tr>
           ))}
         </tbody>
       </table>
 
      <div className="actions">
        <button
          onClick={confirmAllAttendance}
          disabled={saving}
          className={`btn ${saving ? "btn-disabled" : "btn-primary"}`}
        >
          {saving ? "Saving..." : "Confirm Attendance"}
        </button>
      </div>
    </div>
   );
 }
