import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../lib/supabaseClient";
import "./AcademicConfirmAttendence.css";

export default function AcademicConfirmAttendence() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [confirmed, setConfirmed] = useState({});
  const [filters, setFilters] = useState({
    date: "",
    cname: "",
    degree_name: "",
    date_start: "",
    date_end: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Resolve username from dashboard localStorage or supabase auth
        let username = null;
        try {
          const raw = localStorage.getItem('userSession');
          if (raw) username = JSON.parse(raw)?.username ?? null;
        } catch (e) { /* ignore parse errors */ }

        if (!username) {
          try {
            const authRes = supabase.auth?.getUser ? await supabase.auth.getUser() : { data: { user: supabase.auth?.user?.() } };
            const user = authRes?.data?.user ?? authRes?.user ?? null;
            username = user?.user_metadata?.user_name ?? user?.email ?? user?.id ?? null;
          } catch (e) { /* ignore */ }
        }

        if (!username) {
          if (mounted) {
            setError('Please log in to view your timetable.');
            setLoading(false);
          }
          return;
        }

        // Try to map username -> login.id
        let loginId = null;
        try {
          const { data: loginRow, error: loginErr } = await supabase
            .from('login')
            .select('id,user_name')
            .eq('user_name', username)
            .limit(1)
            .maybeSingle();
          if (!loginErr && loginRow?.id != null) loginId = loginRow.id;
        } catch (e) { /* ignore */ }

        // candidate lid values in order
        const tryVals = [];
        if (loginId != null) tryVals.push(loginId);
        const maybeNum = Number(username);
        if (!Number.isNaN(maybeNum)) tryVals.push(maybeNum);
        tryVals.push(String(username));

        // Query the view until we get rows
        let viewRows = [];
        let lastErr = null;
        for (const val of tryVals) {
          const { data, error } = await supabase
            .from('view_my_own_timetable')
            .select('*')
            .eq('lid', val)
            .order('date', { ascending: true })
            .order('starttime', { ascending: true });
          lastErr = error;
          if (error) console.debug('view query error for lid', val, error);
          if (data && data.length) {
            viewRows = data;
            break;
          }
        }

        if (!viewRows || viewRows.length === 0) {
          // no rows found for any candidate lid
          if (mounted) {
            setTimetable([]);
            setError(lastErr ? 'Failed to load timetable (see console).' : 'No timetable entries found for your account.');
            setLoading(false);
          }
          return;
        }

        // Map vid -> venue
        const vidList = Array.from(new Set(viewRows.map(r => r.vid).filter(v => v != null)));
        let locations = [];
        if (vidList.length) {
          const { data: locData, error: locErr } = await supabase
            .from('location')
            .select('vid,venue')
            .in('vid', vidList);
          if (locErr) console.debug('location lookup error', locErr);
          locations = locData || [];
        }

        const merged = viewRows.map(row => {
          const loc = locations.find(l => String(l.vid) === String(row.vid));
          return {
            ...row,
            venue: loc ? loc.venue : '',
          };
        });

        if (mounted) {
          setTimetable(merged);
          if (merged.length > 0) {
            setLecturerName(`${merged[0].lecturer_fname || ''} ${merged[0].lecturer_lname || ''}`.trim());
          }

          // initialize confirmed from lectureattendance table
          try {
            const ids = merged.map(r => r.classtimetableid).filter(Boolean);
            if (ids.length) {
              const { data: attendanceRows, error: attErr } = await supabase
                .from('lectureattendance')
                .select('classtimetableid,cid,status,date')
                .in('classtimetableid', ids);
              if (attErr) {
                console.warn('Failed to fetch existing lectureattendance:', attErr);
              } else if (attendanceRows && attendanceRows.length) {
                const confirmedMap = {};
                merged.forEach(r => {
                  const matched = attendanceRows.find(a =>
                    String(a.classtimetableid) === String(r.classtimetableid)
                    && String(a.cid) === String(r.cid)
                    && !!a.status
                  );
                  if (matched) confirmedMap[String(r.classtimetableid)] = true;
                });
                setConfirmed(confirmedMap);
              }
            }
          } catch (e) {
            console.warn('Error initializing confirmed map:', e);
          }
        }
      } catch (err) {
        console.error('fetchMyTimetable error', err);
        if (mounted) {
          setError('Failed to fetch timetable.');
          setTimetable([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // helper parse to minutes (returns minutes as number)
  const parseToMinutes = (t) => {
    if (!t) return 0;
    const parts = t.split(":").map(p => Number(p));
    const hh = parts[0] || 0;
    const mm = parts[1] || 0;
    const ss = parts[2] || 0;
    return hh * 60 + mm + ss / 60;
  };

  // Filtering logic
  const today = new Date().toISOString().slice(0, 10);
  const filteredTimetable = timetable
    .filter(row => !filters.cname || row.cname === filters.cname)
    .filter(row => !filters.degree_name || row.degree_name === filters.degree_name)
    .filter(row => filters.date ? row.date === filters.date : row.date >= today)
    .filter(row => {
      // date range filter: if neither provided, keep; if provided, check inclusion
      if (!filters.date_start && !filters.date_end) return true;
      const start = filters.date_start || "0000-01-01";
      const end = filters.date_end || "9999-12-31";
      return row.date >= start && row.date <= end;
    })
    .sort((a, b) => a.date === b.date ? a.starttime.localeCompare(b.starttime) : a.date.localeCompare(b.date));

  // Group by date
  const grouped = filteredTimetable.reduce((acc, t) => {
    acc[t.date] = acc[t.date] || [];
    acc[t.date].push(t);
    return acc;
  }, {});
  const displayDates = Object.keys(grouped).sort();

  // For summary (recomputed automatically when filteredTimetable or confirmed change)
  const { totalLectures, allocatedHours, completedLectures, completedHours } = useMemo(() => {
    const total = filteredTimetable.length;
    const allocated = filteredTimetable.reduce((sum, r) => {
      if (r.starttime && r.endtime) {
        const lectureStart = parseToMinutes(r.starttime);
        const lectureEnd = parseToMinutes(r.endtime);
        const mins = Math.max(0, lectureEnd - lectureStart);
        return sum + mins / 60;
      }
      return sum;
    }, 0);
    const completedCount = filteredTimetable.filter(r => !!confirmed[String(r.classtimetableid)]).length;
    const completedH = filteredTimetable.reduce((sum, r) => {
      if (!!confirmed[String(r.classtimetableid)] && r.starttime && r.endtime) {
        const lectureStart = parseToMinutes(r.starttime);
        const lectureEnd = parseToMinutes(r.endtime);
        const mins = Math.max(0, lectureEnd - lectureStart);
        return sum + mins / 60;
      }
      return sum;
    }, 0);
    return { totalLectures: total, allocatedHours: allocated, completedLectures: completedCount, completedHours: completedH };
  }, [filteredTimetable, confirmed]);

  function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  }

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // refresh confirmed map for given classtimetable ids
  const refreshConfirmedForIds = async (ids = []) => {
    if (!ids.length) return;
    try {
      const { data: attendanceRows, error: attErr } = await supabase
        .from("lectureattendance")
        .select("classtimetableid,cid,status,date")
        .in("classtimetableid", ids);

      if (attErr) {
        console.warn("refreshConfirmedForIds error:", attErr);
        return;
      }

      setConfirmed(prev => {
        const next = { ...prev };
        (timetable || []).forEach(r => {
          if (!ids.includes(r.classtimetableid)) return;
          const matched = attendanceRows.find(a =>
            String(a.classtimetableid) === String(r.classtimetableid)
            && String(a.cid) === String(r.cid)
            && !!a.status
          );
          if (matched) next[String(r.classtimetableid)] = true;
        });
        return next;
      });
    } catch (e) {
      console.warn("refreshConfirmedForIds unexpected:", e);
    }
  };

  const handleConfirm = async (classtimetableid) => {
    // optimistic UI
    setConfirmed(prev => ({ ...prev, [String(classtimetableid)]: true }));
    setError("");

    const row = timetable.find(r => r.classtimetableid === classtimetableid);
    const dateVal = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const timeVal = new Date().toTimeString().slice(0, 8); // HH:MM:SS

    const payload = {
      classtimetableid: Number(classtimetableid),
      cid: row?.cid != null ? String(row.cid) : null,
      time: timeVal,
      status: true,
      date: dateVal
    };

    console.log("handleConfirm payload:", payload);

    try {
      const { data, error } = await supabase
        .from("lectureattendance")
        .upsert([payload], { onConflict: ["classtimetableid", "cid"] })
        .select();

      console.log("upsert result:", { data, error });

      if (error) {
        const insRes = await supabase.from("lectureattendance").insert(payload).select();
        console.log("insert fallback:", insRes);
        if (insRes.error) {
          const updRes = await supabase
            .from("lectureattendance")
            .update({ status: true, time: timeVal, date: dateVal })
            .match({ classtimetableid: payload.classtimetableid, cid: payload.cid })
            .select();
          console.log("update fallback:", updRes);
          if (updRes.error) {
            console.error("Failed to persist lectureattendance:", updRes.error);
            setConfirmed(prev => ({ ...prev, [String(classtimetableid)]: false }));
            setError("Failed to save lecture attendance. See console for details.");
            return;
          }
        }
      }

      await refreshConfirmedForIds([payload.classtimetableid]);
      console.log("Attendance saved for classtimetableid:", classtimetableid);
    } catch (err) {
      console.error("Unexpected error saving lecture attendance:", err);
      setConfirmed(prev => ({ ...prev, [String(classtimetableid)]: false }));
      setError("Failed to save lecture attendance. See console for details.");
    }
  };

  if (loading) return <p>Loading your timetable...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="timetable-container">
      <div className="timetable-header-row">
        <div className="timetable-header-bg-only" style={{ flex: 1 }}>
          {lecturerName ? (
            <>
              CONFIRM ATTENDANCE FOR <span className="cc-lecturer-name">{lecturerName}</span>
            </>
          ) : (
            "Confirm Attendance"
          )}
        </div>
        <div className="timetable-header-actions">
          <button
            className="timetable-header-btn"
            onClick={() => navigate("/academic-coordinator-dashboard")}
          >
            Academic Coordinator Dashboard
          </button>
        </div>
      </div>

      <div className="lecture-summary">
        <span>Allocated Lectures: <strong>{totalLectures}</strong></span>
        <span>Allocated Hours: <strong>{allocatedHours.toFixed(2)}</strong></span>
        <span>Completed Lectures: <strong>{completedLectures}</strong></span>
        <span>Completed Hours: <strong>{completedHours.toFixed(2)}</strong></span>
      </div>

      <div className="timetable-filters">
        <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
        <select name="cname" value={filters.cname} onChange={handleFilterChange}>
          <option value="">All Courses</option>
          {[...new Set(timetable.map(row => row.cname))].map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select name="degree_name" value={filters.degree_name} onChange={handleFilterChange}>
          <option value="">All Degrees</option>
          {[...new Set(timetable.map(row => row.degree_name))].map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Time range filter */}
        <label style={{ marginLeft: 8 }}>
          From <input type="date" name="date_start" value={filters.date_start} onChange={handleFilterChange} />
        </label>
        <label style={{ marginLeft: 8 }}>
          To <input type="date" name="date_end" value={filters.date_end} onChange={handleFilterChange} />
        </label>
        {(filters.date_start || filters.date_end) && (
          <button onClick={() => setFilters({ ...filters, date_start: "", date_end: "" })} style={{ marginLeft: 8 }}>
            Clear Date Range
          </button>
        )}

        {filters.date && (
          <button onClick={() => setFilters({ ...filters, date: "" })}>Clear Date Filter</button>
        )}
      </div>

      {displayDates.length === 0 ? (
        <p>No timetables found.</p>
      ) :
        displayDates.map(dateKey => (
          <div key={dateKey} className="timetable-date">
            <h3>{dateKey}</h3>
            <div className="timetable-blocks">
              {grouped[dateKey].map(t => (
                <div
                  key={t.classtimetableid}
                  className={`timetable-block ${confirmed[String(t.classtimetableid)] ? "completed-block" : "pending-block"}`}
                >
                  <div><strong>Course:</strong> {t.cname}</div>
                  <div><strong>Degree:</strong> {t.degree_name}</div>
                  <div><strong>Year:</strong> {t.year}</div>
                  <div><strong>Semester:</strong> {t.semester}</div>
                  <div>
                    <strong>Time:</strong> {formatTime(t.starttime)} - {formatTime(t.endtime)}
                  </div>
                  <div>
                    <strong>Lecturer:</strong>{" "}
                    <span className="cc-lecturer-name">{`${t.lecturer_fname} ${t.lecturer_lname}`}</span>
                  </div>
                  <div><strong>Venue:</strong> {t.venue}</div>
                  <div style={{ marginTop: 10 }}>
                    <button
                      className={confirmed[String(t.classtimetableid)] ? "confirm-btn completed" : "confirm-btn"}
                      onClick={() => handleConfirm(t.classtimetableid)}
                      disabled={!!confirmed[String(t.classtimetableid)]}
                    >
                      {confirmed[String(t.classtimetableid)] ? "Confirmed" : "Confirm"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      } 
    </div>
  );
}
