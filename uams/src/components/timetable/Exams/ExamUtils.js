// Tiny helpers for Exams

export function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function validTimeRange(start, end) {
  return toMinutes(end) > toMinutes(start);
}

export function normalizeExam(e = {}) {
  return {
    id: e.id ?? crypto.randomUUID?.() ?? String(Date.now()),
    cid: e.cid?.trim() ?? "",
    title: e.title?.trim() ?? "",
    exam_type: e.exam_type ?? "Midterm",
    exam_category: e.exam_category ?? "Theory",
    date: e.date ?? "",
    start_time: e.start_time ?? "09:00",
    end_time: e.end_time ?? "11:00",
    venue_name: e.venue_name ?? "",
    lecturer_name: e.lecturer_name ?? "",
    status: e.status ?? "Scheduled",
  };
}
