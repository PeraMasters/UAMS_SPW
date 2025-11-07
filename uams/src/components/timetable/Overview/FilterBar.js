import React, { useMemo } from 'react';
import './overview.css';

/**
 * Props:
 * faculties:    [{facultyid, fname}]
 * departments:  [{degreeid, dname, facultyid}]
 * courses:      [{cid, cname, degreeid}]
 * draft:        { faculty, department, course, view }
 * onDraftChange(patch)
 * onApply()
 */
export default function FiltersBar({
  faculties = [],
  departments = [],
  courses = [],
  draft,
  onDraftChange,
  onApply
}) {
  const set = (patch) => onDraftChange({ ...draft, ...patch });

  // degrees under selected faculty
  const deptOpts = useMemo(
    () => !draft.faculty ? [] : departments.filter(d => Number(d.facultyid) === Number(draft.faculty)),
    [departments, draft.faculty]
  );

  // courses under selected degree
  const courseOpts = useMemo(
    () => !draft.department ? [] : courses.filter(c => c.degreeid === draft.department),
    [courses, draft.department]
  );

  return (
    <div className="filters-card">
      <div className="calendar-head">
        <div className="title">🔎 <span>Filters &amp; Search</span></div>
      </div>

      <div className="filters-grid">
        {/* Faculty */}
        <div>
          <label>Faculty</label>
          <select
            value={draft.faculty || ''}
            onChange={(e) => set({ faculty: e.target.value || null, department: null, course: null })}
          >
            <option value="">All Faculties</option>
            {faculties.map(f => (
              <option key={f.facultyid} value={f.facultyid}>{f.fname}</option>
            ))}
          </select>
        </div>

        {/* Degree */}
        <div>
          <label>Degree</label>
          <select
            value={draft.degree || ''}
            onChange={(e) => set({ degree: e.target.value || null, course: null })}
            disabled={!draft.faculty}
          >
            <option value="">{draft.faculty ? 'All Departments' : 'Select a faculty first'}</option>
            {deptOpts.map(d => (
              <option key={d.degreeid} value={d.degreeid}>{d.dname}</option>
            ))}
          </select>
        </div>

        {/* Course = dropdown filtered by Department */}
        <div>
          <label>Course</label>
          <select
            value={draft.course || ''}
            onChange={(e)=> set({ course: e.target.value || null })}
            disabled={!draft.degree}
          >
            <option value="">{draft.degree ? 'All Courses' : 'Select a degree first'}</option>
            {courseOpts.map(c => (
              <option key={c.cid} value={c.cid}>{c.cid} — {c.cname}</option>
            ))}
          </select>
        </div>

        {/* View filter */}
        <div>
          <label>View Filter</label>
          <select
            value={draft.view || ''}
            onChange={(e)=> set({ view: e.target.value || '' })}
          >
            <option value="">All</option>
            <option value="class">Lecture</option>
            <option value="exam">Exam</option>
          </select>
        </div>

        {/* Apply button */}
        <div className="filter-actions">
          <label style={{visibility:'hidden'}}>apply</label>
          <button className="primary w-full" onClick={onApply}>View</button>
        </div>
      </div>
    </div>
  );
}
