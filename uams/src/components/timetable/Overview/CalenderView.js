import React, { useMemo, Fragment } from 'react';
import './overview.css';

/* helpers */
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

export default function CalendarView({
  mode = 'week',              // 'week' | 'month'
  cursor = new Date(),        // JS Date that the view is centered on
  events = [],                // [{ date:'YYYY-MM-DD', starttime:'HH:MM:SS', endtime:'HH:MM:SS', cid, vid, type:'class'|'exam' }]
  onPrev, onToday, onNext,    // navigation handlers
  onAdd,                      // ({date:'YYYY-MM-DD', start:'HH:MM', end:'HH:MM'})
  onEventClick                // optional: (event) => void
}) {

  /* ===================== MONTHY DATA ===================== */
  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    const isoOffset = (first.getDay() + 6) % 7;   // Monday = 0
    start.setDate(first.getDate() - isoOffset);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const monthTitle = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const key = ev.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return map;
  }, [events]);

  /* ===================== WEEKLY DATA ===================== */
  const weekDays = useMemo(() => {
    const d = new Date(cursor);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : (dow - 1))); // back to Monday
    const out = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      out.push(x);
    }
    return out;
  }, [cursor]);

  // Hour slots: 08:00 -> 18:00
  const hours = useMemo(() => {
    const arr = [];
    for (let h = 8; h < 18; h++) {
      arr.push({ start: `${pad(h)}:00`, end: `${pad(h+1)}:00` });
    }
    return arr;
  }, []);

  return (
    <div className="calendar-card">
      {/* Header (title + nav) */}
      <div className="calendar-head">
        <div className="title">
          {mode === 'month'
            ? `📆 ${monthTitle}`
            : '📅 Weekly Timetable'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onPrev}>{'<'}</button>
          <button onClick={onToday}>Today</button>
          <button onClick={onNext}>{'>'}</button>
        </div>
      </div>

      {/* ======== MONTH VIEW ======== */}
      {mode === 'month' ? (
        <div className="month-grid">
          {monthDays.map((d, idx) => {
            const k = dateStr(d);
            const list = eventsByDate.get(k) || [];
            return (
              <div key={idx} className="month-cell">
                <div className="day">{d.getDate()}</div>

                <div className="add-slot" onClick={() => onAdd({ date: k, start: '09:00', end: '10:00' })}>
                  + 
                </div>

                {list.map((ev, i) => (
                  <div key={i} className={`event-chip ${ev.type === 'exam' ? 'exam' : ''}`} onClick={() => onEventClick && onEventClick(ev)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onEventClick && onEventClick(ev); }}>
                    <div style={{ fontWeight: 600 }}>{ev.cid}</div>
                    <div style={{ fontSize: 11, color: '#667085' }}>
                      {ev.starttime?.slice(0, 5)}–{ev.endtime?.slice(0, 5)} — Room {ev.vid}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* ======== WEEK VIEW (REAL CALENDAR GRID) ======== */
        <div className="week-grid">
          {/* header row: corner + Mon..Sun */}
          <div className="hdr">Time</div>
          {weekDays.map((d, i) => (
            <div key={`hdr-${i}`} className="hdr">
              {d.toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
          ))}

          {/* hour rows */}
          {hours.map((h, ri) => (
            <Fragment key={`row-${ri}`}>
              {/* time column cell */}
              <div className="time">{h.start}–{h.end}</div>

              {/* 7 day cells for this hour */}
              {weekDays.map((d, ci) => {
                const dateKey = dateStr(d);
                const list = (eventsByDate.get(dateKey) || [])
                  .filter(ev => ev.starttime?.slice(0, 5) === h.start);

                return (
                  <div key={`cell-${ri}-${ci}`} className="cell">
                    <div
                      className="plus"
                      onClick={() => onAdd({ date: dateKey, start: h.start, end: h.end })}
                    >
                      + 
                    </div>

                    {list.map((ev, i) => (
                      <div key={i} className={`pill ${ev.type === 'exam' ? 'exam' : ''}`} onClick={() => onEventClick && onEventClick(ev)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onEventClick && onEventClick(ev); }}>
                        <div style={{ fontWeight: 600 }}>{ev.cid}</div>
                        <div style={{ fontSize: 11, color: '#667085' }}>Room {ev.vid}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
