import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';

// Sample exam data
const exams = [
  {
    examId: '1',
    examCategory: 'Mid',
    date: '2025-02-11',
    startTime: '09:00:00',
    endTime: '11:00:00',
    cid: 'IT1010',
    admissionId: 'Ad001',
    degreeId: 'SE',
    batchId: '2022',
  },
  {
    examId: '2',
    examCategory: 'Final',
    date: '2025-02-18',
    startTime: '13:00:00',
    endTime: '15:00:00',
    cid: 'IT2011',
    admissionId: 'Ad001',
    degreeId: 'IT',
    batchId: '2023',
  },
  {
    examId: '3',
    examCategory: 'Final',
    date: '2025-02-13',
    startTime: '13:00:00',
    endTime: '15:00:00',
    cid: 'IT2022',
    admissionId: 'Ad002',
    degreeId: 'SE',
    batchId: '2023',
  },
  {
    examId: '4',
    examCategory: 'Mid',
    date: '2025-02-15',
    startTime: '09:00:00',
    endTime: '16:00:00',
    cid: 'IT2150',
    admissionId: 'Ad001',
    degreeId: 'ENEE',
    batchId: '2024',
  }
];

// Sample students data
const students = [
  { sid: 'IT25087765', name: 'Nethmi Perera', batchId: '2022', degreeId: 'SE', status: 'Proper', cid: 'IT1010' },
  { sid: 'IT25069940', name: 'Maheshi Jayasinghe', batchId: '2023', degreeId: 'IT', status: 'Repeat', cid: 'IT2011' },
  { sid: 'IT20069942', name: 'Kasuni Silva', batchId: '2023', degreeId: 'SE', status: 'Proper', cid: 'IT2022' },
  { sid: 'EN20069941', name: 'Dinithi Fernando', batchId: '2024', degreeId: 'ENEE', status: 'Repeat', cid: 'IT2150' }
];

// Simulate repeat student requests (in real app, this would come from backend)
const repeatRequests = [
  { sid: 'IT25069940', examId: '1' }, // Maheshi requests to repeat examId 1
  { sid: 'EN20069941', examId: '2' }  // Dinithi requests to repeat examId 2
];

const ExamAttendance = () => {
  const navigate = useNavigate();

  const [selectedExam, setSelectedExam] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [attendance, setAttendance] = useState({});

  // Get selected exam object
  const selectedExamObj = exams.find(e => e.examId === selectedExam);
  const batchId = selectedExamObj?.batchId;
  const courseId = selectedExamObj?.cid;

  // Proper batch students for selected exam
  const batchStudents = students.filter(
    s => s.batchId === batchId && s.status === 'Proper' && s.cid === courseId
  );

  // Repeat students who requested for this exam
  const requestedRepeatStudents = repeatRequests
    .filter(r => r.examId === selectedExam)
    .map(r => students.find(s => s.sid === r.sid))
    .filter(Boolean);

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      {/* Navigation */}
      <div style={navStyles.navbar}>
        <span style={navStyles.title}>UAMS</span>
        <button style={navStyles.button} onClick={() => navigate('/exam-dashboard')}>
          Exam Dashboard
        </button>
      </div>

      <div style={styles.container}>
        <h2 style={styles.heading}>Exam Attendance</h2>
        <div style={styles.filterControls}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Select Exam:</label>
          <select
            value={selectedExam}
            onChange={e => {
              setSelectedExam(e.target.value);
              setShowBatch(false);
              setShowRepeat(false);
              setAttendance({});
            }}
            style={styles.filterInput}
          >
            <option value="">-- Select --</option>
            {exams.map(ex => (
              <option key={ex.examId} value={ex.examId}>
                {ex.cid} | {ex.examId} | {ex.examCategory} | {ex.date}
              </option>
            ))}
          </select>
          {selectedExam && (
            <>
              <button style={styles.button} onClick={() => setShowBatch(true)}>
                Pick Proper Batch
              </button>
              <button style={styles.button} onClick={() => setShowRepeat(true)}>
                Get Repeat Requests
              </button>
            </>
          )}
        </div>

        {/* Proper Batch Attendance */}
        {showBatch && (
          <>
            <h3 style={styles.subHeading}>Proper Batch Attendance (Batch {batchId}, Course {courseId})</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Student ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {batchStudents.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={styles.noDataCell}>No proper students found for this batch and course.</td>
                  </tr>
                ) : (
                  batchStudents.map(s => (
                    <tr key={s.sid}>
                      <td style={styles.td}>{s.sid}</td>
                      <td style={styles.td}>{s.name}</td>
                      <td style={styles.td}>
                        <select
                          value={attendance[s.sid] || ''}
                          onChange={e => setAttendance({ ...attendance, [s.sid]: e.target.value })}
                          style={styles.filterInput}
                        >
                          <option value="">Mark</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {/* Repeat Students Attendance (requested) */}
        {showRepeat && (
          <>
            <h3 style={styles.subHeading}>Repeat Students (Requested for this Exam)</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Student ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {requestedRepeatStudents.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={styles.noDataCell}>No repeat requests found for this exam.</td>
                  </tr>
                ) : (
                  requestedRepeatStudents.map(s => (
                    <tr key={s.sid}>
                      <td style={styles.td}>{s.sid}</td>
                      <td style={styles.td}>{s.name}</td>
                      <td style={styles.td}>
                        <select
                          value={attendance[s.sid] || ''}
                          onChange={e => setAttendance({ ...attendance, [s.sid]: e.target.value })}
                          style={styles.filterInput}
                        >
                          <option value="">Mark</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

const navStyles = {
  navbar: {
    backgroundColor: '#ecc634',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 40px',
    marginBottom: '0px',
  },
  title: {
    fontWeight: '700',
    fontSize: '2rem',
    color: '#2d2d2d',
    letterSpacing: '2px',
  },
  button: {
    background: '#fff',
    color: '#2d2d2d',
    border: '1px solid #2d2d2d',
    borderRadius: '6px',
    padding: '8px 24px',
    fontSize: '1.2rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginLeft: '10px'
  },
};

const styles = {
  container: {
    padding: '30px 50px',
  },
  heading: {
    fontSize: '24px',
    marginBottom: '20px',
    fontWeight: 'bold'
  },
  subHeading: {
    margin: '20px 0 10px',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  filterControls: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '20px',
    alignItems: 'center'
  },
  filterInput: {
    padding: '8px',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
  },
  button: {
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 18px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginTop: '20px'
  },
  th: {
    backgroundColor: '#0284c7',
    color: '#fff',
    padding: '12px 10px',
    textAlign: 'left',
    borderBottom: '1px solid #ddd',
  },
  td: {
    padding: '10px 12px',
    textAlign: 'left',
    borderBottom: '1px solid #eee',
  },
  noDataCell: {
    textAlign: 'center',
    padding: '20px',
    color: '#888',
    fontStyle: 'italic',
  },
};

export default ExamAttendance;