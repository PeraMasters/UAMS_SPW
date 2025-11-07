// src/components/timetable/Reports/Reportdashboard.js
import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../lib/supabaseClient";

import DashStats from "./DashStats";
import RoomUtiPanel from "./RoomUtiPanel";
import ScheduleIssuePanel from "./ScheduleIssuePanel";
import UpcmDeadline from "./UpcmDeadline";

// ====== Config you can tweak ======
const WINDOW_DAYS_UTIL = 7;       // Utilization window (days ahead)
const WINDOW_DAYS_ISSUES = 14;    // Clash detection window (days ahead)
const WINDOW_DAYS_DEADLINES = 30; // Upcoming deadlines window (days ahead)
const WORK_HOURS_PER_DAY = 10;    // For utilization denominator (e.g., 08:00–18:00)
const TZ = "Asia/Colombo";

// ====== Small helpers ======
const toISO = (d) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

const todayISO = () => toISO(new Date());

const addDaysISO = (baseISO, n) => {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return toISO(dt);
};

const minutesBetween = (hhmmStart, hhmmEnd) => {
  if (!hhmmStart || !hhmmEnd) return 0;
  const [sh, sm] = hhmmStart.split(":").map(Number);
  const [eh, em] = hhmmEnd.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

const hhmm = (t) => (t ? t.slice(0, 5) : "—");

// ====== MAIN ======
export default function Reportdashboard() {
  // Top KPIs
  const [stats, setStats] = useState({
    lectures: 0,
    exams: 0,
    clashes: 0,
    rooms: 0,
  });

  // Panels
  const [utilization, setUtilization] = useState([]); // [{ building, pct }]
  const [issues, setIssues] = useState([]);           // [{ label, date }]
  const [deadlines, setDeadlines] = useState([]);     // [{ label, date }]

  const utilDenominator = useMemo(
    () => WORK_HOURS_PER_DAY * 60 * WINDOW_DAYS_UTIL,
    []
  );

  useEffect(() => {
    const load = async () => {
      const today = todayISO();

      /* =========================
       * 1) KPIs (counts)
       * ========================= */
      const toUtil = addDaysISO(today, WINDOW_DAYS_UTIL - 1);

      const [lecturesCountRes, examsCountRes, roomsCountRes] = await Promise.all([
        supabase
          .from("classtimetable")
          .select("classtimetableid", { count: "exact", head: true })
          .gte("date", today)
          .lte("date", toUtil),
        supabase
          .from("examtimetable")
          .select("examtimetableid", { count: "exact", head: true })
          .gte("date", today)
          .lte("date", toUtil),
        supabase
          .from("location")
          .select("vid", { count: "exact", head: true }),
      ]);

      const lectures = lecturesCountRes.count || 0;
      const exams = examsCountRes.count || 0;
      const rooms = roomsCountRes.count || 0;
      // clashes computed below
      setStats((s) => ({ ...s, lectures, exams, rooms }));

      /* =========================
       * 2) Utilization (per venue)
       * ========================= */
      const [roomsRes, classRes, examRes] = await Promise.all([
        supabase.from("location").select("vid, venue"),
        supabase
          .from("classtimetable")
          .select("vid, date, starttime, endtime")
          .gte("date", today)
          .lte("date", toUtil),
        supabase
          .from("examtimetable")
          .select("vid, date, starttime, endtime")
          .gte("date", today)
          .lte("date", toUtil),
      ]);
      if (roomsRes.error) throw roomsRes.error;
      if (classRes.error) throw classRes.error;
      if (examRes.error) throw examRes.error;

      const venues = roomsRes.data || [];
      const classEvents = (classRes.data || []).filter((e) => e.vid);
      const examEvents = (examRes.data || []).filter((e) => e.vid);

      const bookedByVid = new Map(); // vid -> minutes
      const addBooked = (vid, mins) =>
        bookedByVid.set(vid, (bookedByVid.get(vid) || 0) + mins);

      classEvents.forEach((ev) =>
        addBooked(String(ev.vid), minutesBetween(ev.starttime, ev.endtime))
      );
      examEvents.forEach((ev) =>
        addBooked(String(ev.vid), minutesBetween(ev.starttime, ev.endtime))
      );

      const utilRows = venues.map((v) => {
        const booked = bookedByVid.get(String(v.vid)) || 0;
        const pctRaw =
          utilDenominator > 0 ? (booked / utilDenominator) * 100 : 0;
        const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));
        return { building: v.venue || `VID ${v.vid}`, pct };
      });
      utilRows.sort((a, b) => b.pct - a.pct);
      setUtilization(utilRows);

      /* =========================
       * 3) Schedule Issues (clashes)
       *    - Room overlaps (same vid, same date)
       *    - Lecturer overlaps (same lid, same date)
       * ========================= */
      const toIssues = addDaysISO(today, WINDOW_DAYS_ISSUES - 1);

      // Pull richer fields for clash messages
      const [classClashRes, examClashRes] = await Promise.all([
        supabase
          .from("classtimetable")
          .select("cid, lid, vid, date, starttime, endtime")
          .gte("date", today)
          .lte("date", toIssues),
        supabase
          .from("examtimetable")
          .select('cid, lid, vid, date, starttime, endtime, "Exam_Type", examcategory')
          .gte("date", today)
          .lte("date", toIssues),
      ]);
      if (classClashRes.error) throw classClashRes.error;
      if (examClashRes.error) throw examClashRes.error;

      // unified minimal event structure
      const unified = [
        ...((classClashRes.data || []).map((r) => ({
          type: "Lecture",
          cid: r.cid,
          lid: r.lid,
          vid: r.vid,
          date: r.date,
          start: r.starttime,
          end: r.endtime,
          extra: null,
        })) || []),
        ...((examClashRes.data || []).map((r) => ({
          type: "Exam",
          cid: r.cid,
          lid: r.lid,
          vid: r.vid,
          date: r.date,
          start: r.starttime,
          end: r.endtime,
          extra: `${r.Exam_Type || ""}${r.examcategory ? `/${r.examcategory}` : ""}`,
        })) || []),
      ].filter((e) => e.vid || e.lid); // keep rows with at least one key for grouping

      // helper to detect overlaps inside a list (same key & date)
      const detectOverlaps = (events) => {
        const sorted = [...events].sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          if (a.start !== b.start) return a.start < b.start ? -1 : 1;
          return a.end < b.end ? -1 : 1;
        });
        const clashes = [];
        for (let i = 0; i < sorted.length; i++) {
          for (let j = i + 1; j < sorted.length; j++) {
            const A = sorted[i];
            const B = sorted[j];
            if (A.date !== B.date) break; // next date
            // once B starts after A ends, remaining Js won't overlap
            if (!overlaps(A.start, A.end, B.start, B.end)) {
              if (B.start >= A.end) break;
              continue;
            }
            clashes.push([A, B]);
          }
        }
        return clashes;
      };

      // group by (date, vid) => room clashes
      const byRoom = new Map(); // key "date|vid" -> events[]
      unified.forEach((e) => {
        if (!e.vid) return;
        const key = `${e.date}|${e.vid}`;
        if (!byRoom.has(key)) byRoom.set(key, []);
        byRoom.get(key).push(e);
      });

      // group by (date, lid) => lecturer clashes
      const byLect = new Map(); // key "date|lid" -> events[]
      unified.forEach((e) => {
        if (!e.lid) return;
        const key = `${e.date}|${e.lid}`;
        if (!byLect.has(key)) byLect.set(key, []);
        byLect.get(key).push(e);
      });

      const issuesList = [];

      // Room clashes
      for (const [key, list] of byRoom.entries()) {
        const pairs = detectOverlaps(list);
        if (pairs.length === 0) continue;
        const [date, vid] = key.split("|");
        pairs.forEach(([A, B]) => {
          issuesList.push({
            date,
            label: `Room clash (VID ${vid}): ${A.type} ${A.cid} (${hhmm(
              A.start
            )}-${hhmm(A.end)}) ↔ ${B.type} ${B.cid} (${hhmm(B.start)}-${hhmm(
              B.end
            )})`,
          });
        });
      }

      // Lecturer clashes
      for (const [key, list] of byLect.entries()) {
        const pairs = detectOverlaps(list);
        if (pairs.length === 0) continue;
        const [date, lid] = key.split("|");
        pairs.forEach(([A, B]) => {
          issuesList.push({
            date,
            label: `Lecturer clash (LID ${lid}): ${A.type} ${A.cid} (${hhmm(
              A.start
            )}-${hhmm(A.end)}) ↔ ${B.type} ${B.cid} (${hhmm(B.start)}-${hhmm(
              B.end
            )})`,
          });
        });
      }

      // Sort issues by date (soonest first)
      issuesList.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      setIssues(issuesList);
      // also update clashes KPI
      setStats((s) => ({ ...s, clashes: issuesList.length }));

      /* =========================
       * 4) Upcoming Deadlines (exams next N days)
       * ========================= */
      const toDead = addDaysISO(today, WINDOW_DAYS_DEADLINES);
      const upExams = await supabase
        .from("examtimetable")
        .select("date, cid, starttime, endtime, examcategory, \"Exam_Type\"")
        .gte("date", today)
        .lte("date", toDead)
        .order("date", { ascending: true });

      if (upExams.error) throw upExams.error;
      const courseIds = Array.from(new Set((upExams.data || []).map((e) => e.cid).filter(Boolean)));

      // Build course name map for nicer labels
      let courseMap = new Map();
      if (courseIds.length > 0) {
        const { data: courses, error: cErr } = await supabase
          .from("course")
          .select("cid, cname");
        if (cErr) throw cErr;
        (courses || []).forEach((c) => courseMap.set(c.cid, c.cname || c.cid));
      }

      const deadlinesItems = (upExams.data || []).map((e) => {
        const cname = courseMap.get(e.cid) || e.cid || "";
        const tag = [e["Exam_Type"], e.examcategory].filter(Boolean).join("/");
        const time = `${hhmm(e.starttime)}-${hhmm(e.endtime)}`;
        const label =
          tag ? `Exam – ${e.cid} ${cname ? "· " + cname : ""} (${tag}, ${time})`
              : `Exam – ${e.cid} ${cname ? "· " + cname : ""} (${time})`;
        return { label, date: e.date };
      });

      setDeadlines(deadlinesItems);
    };

    load().catch((err) => {
      console.error("Reports load failed:", err);
    });
  }, [utilDenominator]);

  return (
    <>
      <DashStats stats={stats} />
      <div className="tt-row"
       style={{display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent:"space-between", alignItems:"stretch"}}>

      <div className="tt-row">
        <div className="tt-field" style={{ minWidth: 0 }}>
          <RoomUtiPanel data={utilization} />
          <ScheduleIssuePanel items={issues} />
        </div>
        <div className="tt-field" style={{ minWidth: 0 }}>
          <UpcmDeadline items={deadlines} />
        </div>
      </div>
    </div>
    </>
  );
}
