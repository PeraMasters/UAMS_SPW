import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentExamPage = () => {
  const navigate = useNavigate();

  /** -------------------- STATE FOR ADD STUDENT FORM -------------------- **/
  const [formData, setFormData] = useState({
    category: 'Mid',
    examDate: '',
    startTime: '',
    endTime: '',
    courseId: '',
    degreeId: '',
    venueId: '',
    status: 'Proper',
  });
  const [records, setRecords] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const courseOptions = ['IT1010', 'IT1021', 'IT2022', 'IT2150'];
  const degreeOptions = ['IT', 'SE', 'ENEE'];
  const venueOptions = ['B_01', 'E_03', 'H_01', 'H_02'];

  /** -------------------- FORM HANDLERS -------------------- **/
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      const updated = [...records];
      updated[editIndex] = formData;
      setRecords(updated);
      setIsEditing(false);
      setEditIndex(null);
    } else {
      setRecords((prev) => [...prev, formData]);
    }
    setFormData({
      category: 'Mid',
      examDate: '',
      startTime: '',
      endTime: '',
      courseId: '',
      degreeId: '',
      venueId: '',
      status: 'Proper',
    });
  };

  const handleEdit = (index) => {
    setFormData(records[index]);
    setIsEditing(true);
    setEditIndex(index);
  };

  const handleDelete = (index) => {
    const updated = [...records];
    updated.splice(index, 1);
    setRecords(updated);
  };

  /** -------------------- STATE FOR EXAM FILTERS -------------------- **/
  const [filters, setFilters] = useState({
    degreeId: '',
    batchId: '',
    examCategory: '',
    cid: '',
  });

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
      studentId: 'IT25087765',
      batchId: '2022',
      status: 'Proper',
      venueId: 'B_01',
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
      studentId: 'IT25069940',
      batchId: '2023',
      status: 'Repeat',
      venueId: 'E_03',
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
      studentId: 'IT20069942',
      batchId: '2023',
      status: 'Proper',
      venueId: 'H_01',
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
      studentId: 'EN20069941',
      batchId: '2024',
      status: 'Repeat',
      venueId: 'H_02',
    },
  ];

  /** -------------------- FILTER HANDLER -------------------- **/
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const getStatusColor = (status) => {
    if (status.toLowerCase() === 'proper') return '#10b981';
    if (status.toLowerCase() === 'repeat') return '#ef4444';
    return '#6b7280';
  };

  const filteredExams = exams.filter((exam) =>
    Object.entries(filters).every(
      ([key, value]) => !value || exam[key]?.toLowerCase().includes(value.toLowerCase())
    )
  );

  /** -------------------- RENDER -------------------- **/
  return (
    <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      {/* TOP NAVIGATION */}
      <div style={styles.navbar}>
        <span style={styles.title}>UAMS</span>
        <button style={styles.navButton} onClick={() => navigate('/exam-dashboard')}>
          Exam Dashboard
        </button>
      </div>

      {/* ADD STUDENT TO EXAM FORM */}
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center' }}>Add Student to Exam</h2>
        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <label>Category:</label>
          <div style={styles.radioGroup}>
            <label>
              <input type="radio" name="category" value="Mid" checked={formData.category === 'Mid'} onChange={handleChange} /> Mid
            </label>
            <label>
              <input type="radio" name="category" value="Final" checked={formData.category === 'Final'} onChange={handleChange} /> Final
            </label>
          </div>

          <label>Exam Date:</label>
          <input type="date" name="examDate" value={formData.examDate} onChange={handleChange} required />

          <label>Start Time:</label>
          <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required />

          <label>End Time:</label>
          <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required />

          <label>Course ID:</label>
          <select name="courseId" value={formData.courseId} onChange={handleChange} required>
            <option value="">Select Course</option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          <label>Degree ID:</label>
          <select name="degreeId" value={formData.degreeId} onChange={handleChange} required>
            <option value="">Select Degree</option>
            {degreeOptions.map((degree) => (
              <option key={degree} value={degree}>{degree}</option>
            ))}
          </select>

          <label>Venue ID:</label>
          <select name="venueId" value={formData.venueId} onChange={handleChange} required>
            <option value="">Select Venue</option>
            {venueOptions.map((venue) => (
              <option key={venue} value={venue}>{venue}</option>
            ))}
          </select>

          <label>Status:</label>
          <div style={styles.radioGroup}>
            <label>
              <input type="radio" name="status" value="Proper" checked={formData.status === 'Proper'} onChange={handleChange} /> Proper
            </label>
            <label>
              <input type="radio" name="status" value="Repeat" checked={formData.status === 'Repeat'} onChange={handleChange} /> Repeat
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '20px' }}>
            <button type="submit" style={styles.button}>{isEditing ? 'Update' : 'Submit'}</button>
          </div>
        </form>

        {/* Submitted Records Table */}
        <h3 style={{ marginTop: '40px', textAlign: 'center' }}>Submitted Exams</h3>
        <div style={{ overflowX: 'auto' }}>
          {records.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Course ID</th>
                  <th>Degree ID</th>
                  <th>Venue ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, index) => (
                  <tr key={index}>
                    <td>{rec.category}</td>
                    <td>{rec.examDate}</td>
                    <td>{rec.startTime}</td>
                    <td>{rec.endTime}</td>
                    <td>{rec.courseId}</td>
                    <td>{rec.degreeId}</td>
                    <td>{rec.venueId}</td>
                    <td>{rec.status}</td>
                    <td>
                      <button style={styles.actionBtn} onClick={() => handleEdit(index)}>Edit</button>
                      <button style={{ ...styles.actionBtn, backgroundColor: '#dc3545' }} onClick={() => handleDelete(index)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center' }}>No records yet.</p>
          )}
        </div>
      </div>

      {/* FILTER EXAMS SECTION */}
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center' }}>Filter Exams</h2>
        <div style={styles.filterControls}>
          <select name="degreeId" value={filters.degreeId} onChange={handleFilterChange} style={styles.filterInput}>
            <option value="">Degree</option>
            <option value="SE">SE</option>
            <option value="IT">IT</option>
            <option value="ENEE">ENEE</option>
          </select>
          <select name="batchId" value={filters.batchId} onChange={handleFilterChange} style={styles.filterInput}>
            <option value="">Batch</option>
            <option value="2022">2022</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
          </select>
          <select name="examCategory" value={filters.examCategory} onChange={handleFilterChange} style={styles.filterInput}>
            <option value="">Category</option>
            <option value="Mid">Mid</option>
            <option value="Final">Final</option>
          </select>
          <select name="cid" value={filters.cid} onChange={handleFilterChange} style={styles.filterInput}>
            <option value="">Course ID</option>
            <option value="IT1010">IT1010</option>
            <option value="IT2011">IT2011</option>
            <option value="IT2022">IT2022</option>
            <option value="IT2150">IT2150</option>
          </select>
        </div>

        <h3 style={{ marginTop: '20px', textAlign: 'center' }}>Exam Details</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Exam ID</th>
                <th>Category</th>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Course ID</th>
                <th>Degree ID</th>
                <th>Venue ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center' }}>No exam records found.</td>
                </tr>
              ) : (
                filteredExams.map((exam, index) => (
                  <tr key={index}>
                    <td>{exam.examId}</td>
                    <td>{exam.examCategory}</td>
                    <td>{exam.date}</td>
                    <td>{exam.startTime}</td>
                    <td>{exam.endTime}</td>
                    <td>{exam.cid}</td>
                    <td>{exam.degreeId}</td>
                    <td>{exam.venueId}</td>
                    <td>
                      <span style={{
                        backgroundColor: getStatusColor(exam.status),
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.85rem'
                      }}>
                        {exam.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/** -------------------- STYLES -------------------- **/
const styles = {
  navbar: {
    backgroundColor: '#ecc82b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
  },
  title: {
    fontWeight: 'bold',
    fontSize: '24px',
    color: '#000',
  },
  navButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: 'white',
    border: '1px solid #1f1f1f',
    color: '#1f1f1f',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  container: {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '12px',
    backgroundColor: '#f9f9f9',
    fontFamily: 'Arial, sans-serif',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '150px 1fr',
    gap: '10px 20px',
    alignItems: 'center',
  },
  radioGroup: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  },
  button: {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    backgroundColor: 'white',
  },
  actionBtn: {
    padding: '5px 10px',
    margin: '0 5px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#28a745',
    color: 'white',
    cursor: 'pointer',
  },
  filterControls: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  filterInput: {
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid #ccc',
  },
};

export default StudentExamPage;





