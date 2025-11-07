import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import './Studentdetails.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function StudentDetails() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [admissionYears, setAdmissionYears] = useState([]);
  const [filters, setFilters] = useState({
    facultyid: '',
    degreeid: '',
    admission_year: '',
    course_year: '',
    course_semester: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Fetch faculties on mount
  useEffect(() => {
    supabase.from('faculty').select('facultyid, fname').then(({ data }) => setFaculties(data || []));
  }, []);

  // Fetch degrees when faculty changes
  useEffect(() => {
    if (filters.facultyid) {
      supabase.from('degree').select('degreeid, dname').eq('facultyid', filters.facultyid)
        .then(({ data }) => setDegrees(data || []));
    } else {
      setDegrees([]);
    }
    setFilters(f => ({ ...f, degreeid: '', admission_year: '' }));
    setAdmissionYears([]);
  }, [filters.facultyid]);

  // Fetch admission years when degree changes
  useEffect(() => {
    if (filters.degreeid) {
      supabase.from('student').select('admission_year').eq('degreeid', filters.degreeid)
        .then(({ data }) => {
          const years = [...new Set((data || []).map(s => s.admission_year))];
          setAdmissionYears(years);
        });
    } else {
      setAdmissionYears([]);
    }
    setFilters(f => ({ ...f, admission_year: '' }));
  }, [filters.degreeid]);

  // Fetch students for filter (with course year/semester logic)
  useEffect(() => {
    const fetchStudents = async () => {
      let sids = null;

      // If course year or semester is selected, filter through course and student_course
      if (filters.course_year || filters.course_semester) {
        // 1. Find cids in course table
        let courseQuery = supabase.from('course').select('cid');
        if (filters.course_year) courseQuery = courseQuery.eq('year', filters.course_year);
        if (filters.course_semester) courseQuery = courseQuery.eq('semester', filters.course_semester);
        const { data: courseData, error: courseError } = await courseQuery;
        if (courseError) {
          console.error("Supabase error (course):", courseError.message);
          setStudents([]);
          setSearchResults([]);
          return;
        }
        const cids = (courseData || []).map(c => c.cid);
        if (cids.length === 0) {
          setStudents([]);
          setSearchResults([]);
          return;
        }

        // 2. Find sids in student_course table
        const { data: scData, error: scError } = await supabase
          .from('student_course')
          .select('sid')
          .in('cid', cids);
        if (scError) {
          console.error("Supabase error (student_course):", scError.message);
          setStudents([]);
          setSearchResults([]);
          return;
        }
        sids = (scData || []).map(sc => sc.sid);
        if (sids.length === 0) {
          setStudents([]);
          setSearchResults([]);
          return;
        }
      }

      // 3. Fetch students with those sids 
      let query = supabase.from('student')
        .select('sid, f_name, l_name, nic, phone_no, email, status, facultyid, degreeid, admission_year');
      if (filters.facultyid) query = query.eq('facultyid', filters.facultyid);
      if (filters.degreeid) query = query.eq('degreeid', filters.degreeid);
      if (filters.admission_year) query = query.eq('admission_year', filters.admission_year);
      if (sids) query = query.in('sid', sids);

      const { data, error } = await query;
      if (error) {
        console.error("Supabase error (student):", error.message);
      }
      setStudents(data || []);
      setSearchResults([]);
    };

    fetchStudents();
    // eslint-disable-next-line
  }, [filters]);

  // Search function (runs only on button click)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let { data, error } = await supabase
      .from('student')
      .select('sid, f_name, l_name, nic, phone_no, email, status, facultyid, degreeid, admission_year');
    if (error) {
      console.error("Supabase error:", error.message);
      setSearchResults([]);
      return;
    }
    const s = searchQuery.toLowerCase();
    const filtered = (data || []).filter(st =>
      (st.sid && st.sid.toLowerCase().includes(s)) ||
      (st.nic && st.nic.toLowerCase().includes(s)) ||
      (st.phone_no && st.phone_no.toLowerCase().includes(s)) ||
      (st.email && st.email.toLowerCase().includes(s))
    );
    setSearchResults(filtered);
  };

  // Clear function
  const handleClear = () => {
    setFilters({ facultyid: '', degreeid: '', admission_year: '', course_year: '', course_semester: '' });
    setSearchQuery('');
    setSearchResults([]);
  };

  // Export functions remain unchanged...
  const handleExport = (type) => {
    const exportData = (searchResults.length > 0 ? searchResults : students);
    if (type === 'Excel') {
      const ws = XLSX.utils.json_to_sheet(exportData.map(s => ({
        'Student ID': s.sid,
        'First Name': s.f_name,
        'Last Name': s.l_name,
        'Email': s.email,
        'NIC': s.nic,
        'Phone Number': s.phone_no,
        'Status': s.status
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "students.xlsx");
    } else if (type === 'PDF') {
      const doc = new jsPDF();
      doc.text("Student Details", 14, 16);
      autoTable(doc, {
        head: [['Student ID', 'First Name', 'Last Name', 'Email', 'NIC', 'Phone Number', 'Status']],
        body: exportData.map(s => [
          s.sid, s.f_name, s.l_name, s.email, s.nic, s.phone_no, s.status
        ]),
        startY: 22,
      });
      doc.save("students.pdf");
    }
  };

  return (
    <div className="student-details-container">
      <header className="student-details-header">
        <div>
          <h2>UAMS</h2>
          <p>STUDENTS DETAILS UNIT</p>
        </div>
        <button onClick={() => navigate('/academic-coordinator-dashboard')}>
          Academic Coordinator Dashboard
        </button>
      </header>

      {/* FILTER SECTION */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '18px 0' }}>
        <select value={filters.facultyid} onChange={e => setFilters(f => ({ ...f, facultyid: e.target.value }))}>
          <option value="">Select Faculty</option>
          {faculties.map(f => <option key={f.facultyid} value={f.facultyid}>{f.fname}</option>)}
        </select>
        <select value={filters.degreeid} onChange={e => setFilters(f => ({ ...f, degreeid: e.target.value }))} disabled={!filters.facultyid}>
          <option value="">Select Degree</option>
          {degrees.map(d => <option key={d.degreeid} value={d.degreeid}>{d.dname}</option>)}
        </select>
        <select value={filters.admission_year} onChange={e => setFilters(f => ({ ...f, admission_year: e.target.value }))} disabled={!filters.degreeid}>
          <option value="">Select Admission Year</option>
          {admissionYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.course_year} onChange={e => setFilters(f => ({ ...f, course_year: e.target.value }))}>
          <option value="">Select Course Year</option>
          {[1,2,3,4].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.course_semester} onChange={e => setFilters(f => ({ ...f, course_semester: e.target.value }))}>
          <option value="">Select Course Semester</option>
          {[1,2].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* SEARCH SECTION */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <input
          type="text"
          placeholder="Search by SID, NIC, Phone, Email"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <button onClick={handleSearch} style={{ background: '#ffc014', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 18px', fontWeight: 500, cursor: 'pointer' }}>
          Search
        </button>
        <button onClick={handleClear} style={{ background: '#e5e5e5', color: '#222', border: 'none', borderRadius: 5, padding: '7px 18px', fontWeight: 500, cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      <div className="student-details-export">
        <button onClick={() => handleExport('Excel')}>Excel</button>
        <button onClick={() => handleExport('PDF')}>PDF</button>
      </div>

      <table className="student-details-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>NIC</th>
            <th>Phone Number</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(searchResults.length > 0 ? searchResults : students).length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>No records found</td>
            </tr>
          ) : (
            (searchResults.length > 0 ? searchResults : students).map((student) => (
              <tr key={student.sid}>
                <td>{student.sid}</td>
                <td>{student.f_name}</td>
                <td>{student.l_name}</td>
                <td>{student.email}</td>
                <td>{student.nic}</td>
                <td>{student.phone_no}</td>
                <td>
                  <span style={{
                    padding: '5px 10px',
                    borderRadius: '20px',
                    backgroundColor: student.status === 'Active' ? '#ffc014' : '#e57373',
                    color: '#fff'
                  }}>
                    {student.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default StudentDetails;
