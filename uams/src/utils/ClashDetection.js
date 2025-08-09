import supabase from "../lib/supabaseClient";

// returns true if (aStart,aEnd) overlaps (bStart,bEnd)
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd; // strict overlap
}

function buildDate(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export async function checkClash({
  date,
  start_time,
  end_time,
  venue,
  lecturer,
  exclude = { table: null, id: null }, // when editing existing row
}) {
  const start = buildDate(date, start_time);
  const end = buildDate(date, end_time);

  // Fetch same-day entries from both tables
  const [lecRes, exRes] = await Promise.all([
    supabase.from("classtimetable").select("id, date, start_time, end_time, venue, lecturer").eq("date", date),
    supabase.from("examtimetable").select("id, date, start_time, end_time, venue, lecturer").eq("date", date),
  ]);

  const rows = [];
  if (lecRes.data) rows.push(...lecRes.data.map(r => ({ ...r, table: "classtimetable" })));
  if (exRes.data) rows.push(...exRes.data.map(r => ({ ...r, table: "examtimetable" })));

  const problems = [];
  for (const r of rows) {
    if (exclude.table && exclude.id && r.table === exclude.table && r.id === exclude.id) continue;
    const rStart = buildDate(r.date, r.start_time);
    const rEnd = buildDate(r.date, r.end_time);
    if (!overlaps(start, end, rStart, rEnd)) continue;

    if (venue && r.venue === venue) {
      problems.push({ type: "VENUE", with: r });
    }
    if (lecturer && r.lecturer === lecturer) {
      problems.push({ type: "LECTURER", with: r });
    }
  }

  return problems; // empty array means no clashes
}
