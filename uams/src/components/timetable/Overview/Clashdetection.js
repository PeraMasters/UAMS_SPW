// Lightweight clash utilities used only by the Schedule modal.
// Queries both classtimetable and examtimetable to detect overlaps.

// Ensure we import from within src/ (CRA disallows paths outside src)
import supabase from "../../../lib/supabaseClient";

export const pad2 = (n) => String(n).padStart(2, "0");
export const hhmm = (t) => (t ? t.slice(0, 5) : "—");

const overlaps = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && aEnd > bStart;

function formatLabel(e) {
  const type = e.type || "Event";
  return `${type} ${e.cid || ""} ${hhmm(e.starttime)}–${hhmm(e.endtime)}`;
}

// Fetch all events for date across both tables (kept minimal but effective)
async function fetchDayEvents(date, filters = {}) {
  const [cl, ex] = await Promise.all([
    supabase
      .from("classtimetable")
      .select("cid,lid,vid,date,starttime,endtime")
      .eq("date", date),
    supabase
      .from("examtimetable")
      .select('cid,lid,vid,date,starttime,endtime,"Exam_Type",examcategory')
      .eq("date", date),
  ]);

  const classes = (cl.data || []).map((r) => ({ ...r, type: "Lecture" }));
  const exams = (ex.data || []).map((r) => ({ ...r, type: "Exam" }));
  let all = [...classes, ...exams];

  // Optional filter hints (vid/lid)
  if (filters.vid) all = all.filter((e) => String(e.vid) === String(filters.vid));
  if (filters.lid) all = all.filter((e) => String(e.lid) === String(filters.lid));

  return all;
}

/** Check if the given room is free at the date/time window. */
export async function checkRoomClash({ date, start, end, vid }) {
  const events = await fetchDayEvents(date, { vid });
  const clashes = events.filter((e) => overlaps(start, end, e.starttime, e.endtime));
  return clashes.map((e) => ({ vid, label: formatLabel(e) }));
}

/** Check if the given lecturer is free at the date/time window. */
export async function checkLecturerClash({ date, start, end, lid }) {
  const events = await fetchDayEvents(date, { lid });
  const clashes = events.filter((e) => overlaps(start, end, e.starttime, e.endtime));
  return clashes.map((e) => ({ lid, label: formatLabel(e) }));
}

/** Find a few rooms that have no events in that time window. */
export async function findAlternativeRooms({ date, start, end, excludeVid }) {
  const { data: allRooms, error } = await supabase
    .from("location")
    .select("vid,venue,status");
  if (error) return [];

  const candidates = allRooms.filter((r) => r.status !== "Maintenance");
  const free = [];
  for (const r of candidates) {
    if (excludeVid && String(r.vid) === String(excludeVid)) continue;
    const rClash = await checkRoomClash({ date, start, end, vid: r.vid });
    if (rClash.length === 0) free.push(r);
    if (free.length >= 5) break;
  }
  return free;
}

/** Suggest the next 1-hour slot that appears free for both room + lecturer (if provided). */
export async function suggestNextSlot({ date, start, end, vid, lid }) {
  // try next 4 hours in 30-min steps
  const stepMins = 30;
  const attempts = 8;
  let s = start;
  let e = end;
  for (let i = 0; i < attempts; i++) {
    s = addMinutes(s, stepMins);
    e = addMinutes(e, stepMins);

    if (vid) {
      const rc = await checkRoomClash({ date, start: s, end: e, vid });
      if (rc.length) continue;
    }
    if (lid) {
      const lc = await checkLecturerClash({ date, start: s, end: e, lid });
      if (lc.length) continue;
    }
    return { start: s, end: e };
  }
  return null;
}

// local helper
function addMinutes(hhmmStr, mins) {
  const [h, m] = hhmmStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h);
  d.setMinutes(m + mins);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
