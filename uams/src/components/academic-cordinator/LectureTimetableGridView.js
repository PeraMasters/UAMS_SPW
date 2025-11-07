import React, { useState, useMemo } from 'react';

export default function LectureTimetableGridView({ timetables = [], onRowClick }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date | cname | faculty

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    return (timetables || [])
      .filter((t) => {
        if (!q) return true;
        return (
          String(t.cname || '').toLowerCase().includes(q) ||
          String(t.fname || '').toLowerCase().includes(q) ||
          String(t.dname || '').toLowerCase().includes(q) ||
          String(t.lecturer || '').toLowerCase().includes(q) ||
          String(t.venue || '').toLowerCase().includes(q) ||
          String(t.date || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'cname') return (a.cname || '').localeCompare(b.cname || '');
        if (sortBy === 'faculty') return (a.fname || '').localeCompare(b.fname || '');
        // default sort by date then starttime
        if (a.date === b.date) return (a.starttime || '').localeCompare(b.starttime || '');
        return (a.date || '').localeCompare(b.date || '');
      });
  }, [timetables, query, sortBy]);

  if (!timetables || timetables.length === 0) {
    return <p>No timetables available.</p>;
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          aria-label="search-timetable"
          placeholder="Search subject, faculty, venue or date"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: 8 }}>
          <option value="date">Sort: Date</option>
          <option value="cname">Sort: Subject</option>
          <option value="faculty">Sort: Faculty</option>
        </select>
      </div>

      <div
        className="lt-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
          gap: 12,
        }}
      >
        {filtered.map((t) => (
          <div
            key={t.classtimetableid || `${t.cid}-${t.date}-${t.starttime}`}
            onClick={() => onRowClick && onRowClick(t)}
            style={{
              cursor: onRowClick ? 'pointer' : 'default',
              padding: 12,
              borderRadius: 8,
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{t.date}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t.cname}</div>
            <div style={{ fontSize: 13, color: '#333', marginBottom: 6 }}>{t.dname} — Year {t.year} / Sem {t.semester}</div>
            <div style={{ fontSize: 13, color: '#333' }}>
              <strong>Time:</strong> {t.starttime ? t.starttime.slice(0,5) : ''} - {t.endtime ? t.endtime.slice(0,5) : ''}
            </div>
            <div style={{ fontSize: 13, color: '#333' }}>
              <strong>Lecturer:</strong> {t.lecturer || '-'}
            </div>
            <div style={{ fontSize: 13, color: '#333' }}>
              <strong>Venue:</strong> {t.venue || '-'}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>
              Faculty: {t.fname || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}