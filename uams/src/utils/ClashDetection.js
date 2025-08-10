import supabase from "../lib/supabaseClient";

/**
 * checkClash(payload, type?, exclude?)
 * payload = { date, starttime, endtime, vid, lid, cid }
 * type    = "lecture" | "exam"  (only used for labeling)
 * exclude = { table: "classtimetable"|"examtimetable", id: <pk> } // skip self when editing
 *
 * Returns: Array<{ table, id, type: "venue"|"lecturer"|"course", row }>
 */
export async function checkClash(payload, type = "lecture", exclude = null) {
  const { date, starttime, endtime, vid, lid, cid } = payload || {};
  if (!date || !starttime || !endtime) return [];

  const tables = [
    { name: "classtimetable", pk: "classtimetableid" },
    { name: "examtimetable", pk: "examtimetableid" }, // will fallback to "id" if needed
  ];

  const results = [];
  for (const t of tables) {
    // robust PK: try preferred, fallback to id
    let selectCols = `${t.pk}, date, starttime, endtime, vid, lid, cid`;
    let q = await supabase.from(t.name).select(selectCols).eq("date", date);
    if (q.error?.message?.includes("does not exist")) {
      selectCols = `id, date, starttime, endtime, vid, lid, cid`;
      q = await supabase.from(t.name).select(selectCols).eq("date", date);
    }
    if (q.error) continue;

    for (const row of q.data || []) {
      const rowPk = row[t.pk] ?? row.id;
      if (exclude && exclude.table === t.name && String(exclude.id) === String(rowPk)) continue;

      if (overlaps(starttime, endtime, row.starttime, row.endtime)) {
        if (vid && row.vid && String(vid) === String(row.vid))
          results.push({ table: t.name, id: rowPk, type: "venue", row });
        if (lid && row.lid && String(lid) === String(row.lid))
          results.push({ table: t.name, id: rowPk, type: "lecturer", row });
        if (cid && row.cid && String(cid) === String(row.cid))
          results.push({ table: t.name, id: rowPk, type: "course", row });
      }
    }
  }
  // unique by table+id+type
  const key = (x) => `${x.table}:${x.id}:${x.type}`;
  const uniq = Object.values(
    (results || []).reduce((acc, x) => {
      acc[key(x)] = x;
      return acc;
    }, {})
  );
  return uniq;
}

function overlaps(s1, e1, s2, e2) {
  const toMin = (t) => {
    const [h, m, s] = (t || "00:00:00").split(":").map(Number);
    return h * 60 + m + (s ? s / 60 : 0);
    // we treat seconds loosely; minute precision is fine for UI
  };
  const a1 = toMin(s1), a2 = toMin(e1);
  const b1 = toMin(s2), b2 = toMin(e2);
  if (isNaN(a1) || isNaN(a2) || isNaN(b1) || isNaN(b2)) return false;
  return Math.max(a1, b1) < Math.min(a2, b2); // true if times intersect
}
