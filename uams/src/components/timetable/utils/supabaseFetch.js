// src/components/timetable/utils/supabaseFetch.js
import supabase from '../../../lib/supabaseClient';

/* =========================================================================
 * Small utilities
 * ========================================================================= */
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;
function todayISO_AsiaColombo() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
}

/* =========================================================================
 * MASTER DATA (used elsewhere too)
 * ========================================================================= */
export async function getFaculties() {
  const { data, error } = await supabase.from('faculty').select('facultyid, fname');
  if (error) throw error;
  return data || [];
}

export async function getDegreesByFaculty(facultyid) {
  if (!facultyid) return [];
  const { data, error } = await supabase
    .from('degree')
    .select('degreeid, dname, facultyid')
    .eq('facultyid', facultyid);
  if (error) throw error;
  return data || [];
}

export async function getCoursesByDegree(degreeid) {
  if (!degreeid) return [];
  const { data, error } = await supabase
    .from('course')
    .select('cid, cname, degreeid')
    .eq('degreeid', degreeid);
  if (error) throw error;
  return data || [];
}

export async function getCoursesByDegrees(degreeIds = []) {
  if (!Array.isArray(degreeIds) || degreeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('course')
    .select('cid, cname, degreeid')
    .in('degreeid', degreeIds);
  if (error) throw error;
  return data || [];
}

/* =========================================================================
 * FULL TIMETABLE VIEW HELPERS (lectures + exams)
 * ========================================================================= */
export async function getFullTimetableView({ fromDate, toDate } = {}) {
  let query = supabase
    .from('full_timetable_view')
    .select('id, type, cid, cname, title, date, starttime, endtime, vid, venue');

  if (fromDate) query = query.gte('date', fromDate);
  if (toDate) query = query.lte('date', toDate);

  const { data, error } = await query
    .order('date', { ascending: true })
    .order('starttime', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchWeeklyEvents({ fromDate, toDate }) {
  const rows = await getFullTimetableView({ fromDate, toDate });
  return (rows || []).map((r) => ({
    id: r.id || `${r.date}-${r.starttime}-${r.vid}`,
    type: r.type || (r.title ? 'exam' : 'lecture'),
    cid: r.cid || '',
    title: r.cname || r.title || '',
    date: r.date,
    start_time: r.starttime,
    end_time: r.endtime,
    venue_name: r.venue || r.vid || '',
  }));
}

/* =========================================================================
 * CLASH CHECK (lectures + exams)
 * ========================================================================= */
export async function getClassTimetable({ fromDate, toDate } = {}) {
  let query = supabase
    .from('classtimetable')
    .select('classtimetableid, cid, lid, vid, date, starttime, endtime');

  if (fromDate) query = query.gte('date', fromDate);
  if (toDate) query = query.lte('date', toDate);

  const { data, error } = await query
    .order('date', { ascending: true })
    .order('starttime', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getExamTimetable({ fromDate, toDate } = {}) {
  let query = supabase
    .from('examtimetable')
    .select('examtimetableid, cid, lid, vid, date, starttime, endtime, examcategory, "Exam_Type", "Status"');

  if (fromDate) query = query.gte('date', fromDate);
  if (toDate) query = query.lte('date', toDate);

  const { data, error } = await query
    .order('date', { ascending: true })
    .order('starttime', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function findClashes({ date, starttime, endtime, lid, vid }) {
  const [classes, exams] = await Promise.all([
    getClassTimetable({ fromDate: date, toDate: date }),
    getExamTimetable({ fromDate: date, toDate: date }),
  ]);

  const sameDay = [...classes, ...exams].filter((ev) => ev.date === date);

  return sameDay.filter((ev) => {
    const timeOverlap = overlaps(starttime, endtime, ev.starttime, ev.endtime);
    const sameRoom = vid && ev.vid && String(vid) === String(ev.vid);
    const sameLecturer = lid && ev.lid && String(lid) === String(ev.lid);
    return timeOverlap && (sameRoom || sameLecturer);
  });
}

/* =========================================================================
 * EXAMS — LOOKUP MAPS (to show names instead of IDs)
 * ========================================================================= */
async function fetchCoursesMap() {
  const map = new Map();
  const { data } = await supabase.from('course').select('cid, cname, name, title');
  (data || []).forEach((c) => {
    const name = c.cname || c.name || c.title || '';
    if (c.cid) map.set(c.cid, name);
  });
  return map;
}

async function fetchLecturersMap() {
  const map = new Map();
  const { data } = await supabase.from('lecturer').select('lid, lname, name, fullname');
  (data || []).forEach((l) => {
    const name = l.fullname || l.lname || l.name || '';
    if (l.lid) map.set(l.lid, name);
  });
  return map;
}

async function fetchRoomsMap() {
  const map = new Map();
  let res = await supabase.from('location').select('vid, venue');
  let data = res.data;
  if (res.error) {
    const res2 = await supabase.from('venue').select('vid, vname, name');
    data = res2.data;
  }
  (data || []).forEach((r) => {
    const name = r.vname || r.name || '';
    if (r.vid) map.set(r.vid, name);
  });
  return map;
}

/* =========================================================================
 * EXAMS — TABLE FETCH (extended filters) + CRUD + STATUS UPDATE
 * ========================================================================= */
export async function fetchExams({ exam_type, exam_category, status } = {}) {
  let query = supabase
    .from('examtimetable')
    .select(
      'examtimetableid, cid, lid, vid, date, starttime, endtime, examcategory, "Exam_Type", "Status"'
    )
    .order('date', { ascending: true })
    .order('starttime', { ascending: true });

  if (exam_type && exam_type !== 'All') query = query.eq('Exam_Type', exam_type);
  if (exam_category && exam_category !== 'All') query = query.eq('examcategory', exam_category);
  if (status && status !== 'All') query = query.eq('Status', status);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];

  const [coursesMap, lecturersMap, roomsMap] = await Promise.all([
    fetchCoursesMap(),
    fetchLecturersMap(),
    fetchRoomsMap(),
  ]);

  return rows.map((r) => ({
    id: r.examtimetableid,
    cid: r.cid || '',
    course_name: coursesMap.get(r.cid) || '',
    exam_type: r['Exam_Type'] || '',
    exam_category: r.examcategory || '',
    date: r.date || '',
    start_time: r.starttime || '',
    end_time: r.endtime || '',
    venue_name: roomsMap.get(r.vid) || String(r.vid || ''),
    lecturer_name: lecturersMap.get(r.lid) || String(r.lid || ''),
    status: r['Status'] || 'Scheduled',
  }));
}

export async function createExam(data) {
  const payload = {
    cid: data.cid,
    lid: data.lecturer_id ?? data.lid ?? null,
    vid: data.venue_id ?? data.vid ?? null,
    date: data.date,
    starttime: data.start_time,
    endtime: data.end_time,
    examcategory: data.exam_category,
    Exam_Type: data.exam_type,
    Status: data.status || 'Scheduled',
  };
  const { data: inserted, error } = await supabase
    .from('examtimetable')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function updateExam(data) {
  const id = data.id || data.examtimetableid;
  if (!id) throw new Error('updateExam requires an id');

  const updates = {
    cid: data.cid,
    lid: data.lecturer_id ?? data.lid ?? null,
    vid: data.venue_id ?? data.vid ?? null,
    date: data.date,
    starttime: data.start_time,
    endtime: data.end_time,
    examcategory: data.exam_category,
    Exam_Type: data.exam_type,
    Status: data.status,
  };

  const { data: updated, error } = await supabase
    .from('examtimetable')
    .update(updates)
    .eq('examtimetableid', id)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

export async function deleteExam(id) {
  const { error } = await supabase.from('examtimetable').delete().eq('examtimetableid', id);
  if (error) throw error;
  return true;
}

/* =========================================================================
 * EXAMS — GLOBAL KPI COUNTERS (UNFILTERED SNAPSHOT)
 * ========================================================================= */
export async function countTotalExams() {
  const { count, error } = await supabase
    .from('examtimetable')
    .select('examtimetableid', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export async function countUpcomingExams() {
  const today = todayISO_AsiaColombo();
  const { count, error } = await supabase
    .from('examtimetable')
    .select('examtimetableid', { count: 'exact', head: true })
    .gt('date', today)
    .neq('Status', 'Cancelled');
  if (error) throw error;
  return count || 0;
}

export async function countCompletedExams() {
  const { count, error } = await supabase
    .from('examtimetable')
    .select('examtimetableid', { count: 'exact', head: true })
    .eq('Status', 'Completed');
  if (error) throw error;
  return count || 0;
}

export async function countPostponedExams() {
  const { count, error } = await supabase
    .from('examtimetable')
    .select('examtimetableid', { count: 'exact', head: true })
    .eq('Status', 'Postponed');
  if (error) throw error;
  return count || 0;
}

/* =========================================================================
 * EXAMS — STATUS UPDATE (Action dropdown)
 * ========================================================================= */
export async function updateExamStatus(examId, newStatus) {
  const { data, error } = await supabase
    .from('examtimetable')
    .update({ Status: newStatus })
    .eq('examtimetableid', examId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* =========================================================================
 * LEGACY ALIASES (keep older screens working)
 * ========================================================================= */
export async function checkClashes(params) { return await findClashes(params); }

export async function createClassTimetable(data) {
  const { data: inserted, error } = await supabase
    .from('classtimetable')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function createExamTimetable(data) {
  const { data: inserted, error } = await supabase
    .from('examtimetable')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function fetchRooms() {
  const { data, error } = await supabase
    .from('location')
    .select('vid, venue, capacity, status');
  if (error) throw error;
  return data || [];
}

export async function updateExamTimetable(id, updates) {
  const { data, error } = await supabase
    .from('examtimetable')
    .update(updates)
    .eq('examtimetableid', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExamTimetable(id) {
  const { error } = await supabase
    .from('examtimetable')
    .delete()
    .eq('examtimetableid', id);
  if (error) throw error;
  return true;
}
