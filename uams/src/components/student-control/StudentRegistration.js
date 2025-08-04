import React, { useState, useEffect } from 'react';
import DashboardNavBar from '../DashboardNavBar';
import StudentRegistrationForm from './StudentRegistrationForm';
import StudentUpdateForm from './StudentUpdateForm';
import supabase from '../../lib/supabaseClient';

const StudentRegistration = () => {
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Store all students
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    facultyid: '',
    degreeid: '',
    batch: ''
  });
  
  // Filter options
  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [allDegrees, setAllDegrees] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchFaculties();
    fetchDegrees();
  }, []);

  // Filter degrees when faculty filter changes
  useEffect(() => {
    if (filters.facultyid) {
      const filtered = allDegrees.filter(degree => degree.facultyid == filters.facultyid);
      setDegrees(filtered);
      // Clear degree filter if current degree doesn't belong to selected faculty
      if (filters.degreeid) {
        const currentDegreeValid = filtered.some(degree => degree.degreeid === filters.degreeid);
        if (!currentDegreeValid) {
          setFilters(prev => ({ ...prev, degreeid: '' }));
        }
      }
    } else {
      setDegrees([]);
      setFilters(prev => ({ ...prev, degreeid: '' }));
    }
  }, [filters.facultyid, allDegrees]);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, allStudents]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student')
        .select(`
          sid,
          f_name,
          l_name,
          nic,
          phone_no,
          dob,
          gender,
          email,
          address,
          parent_name,
          parent_contact_no,
          batch,
          facultyid,
          degreeid,
          faculty:facultyid(fname),
          degree:degreeid(dname)
        `)
        .order('sid');

      if (error) {
        console.error('Error fetching students:', error);
      } else {
        const studentsData = data || [];
        setAllStudents(studentsData);
        setStudents(studentsData);
        
        // Extract unique batches for filter
        const uniqueBatches = [...new Set(studentsData.map(student => student.batch))].sort();
        setBatches(uniqueBatches);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculties = async () => {
    try {
      const { data, error } = await supabase
        .from('faculty')
        .select('facultyid, fname')
        .order('fname');

      if (error) {
        console.error('Error fetching faculties:', error);
      } else {
        setFaculties(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchDegrees = async () => {
    try {
      const { data, error } = await supabase
        .from('degree')
        .select('degreeid, dname, facultyid')
        .order('dname');

      if (error) {
        console.error('Error fetching degrees:', error);
      } else {
        setAllDegrees(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...allStudents];

    // Filter by faculty
    if (filters.facultyid) {
      filtered = filtered.filter(student => student.facultyid == filters.facultyid);
    }

    // Filter by degree
    if (filters.degreeid) {
      filtered = filtered.filter(student => student.degreeid === filters.degreeid);
    }

    // Filter by batch
    if (filters.batch) {
      filtered = filtered.filter(student => student.batch === filters.batch);
    }

    setStudents(filtered);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      facultyid: '',
      degreeid: '',
      batch: ''
    });
  };

  const handleStudentAdded = () => {
    setShowForm(false);
    fetchStudents(); // Refresh the list
  };

  const handleStudentUpdated = () => {
    setShowEditForm(false);
    setEditingStudent(null);
    fetchStudents(); // Refresh the list
  };

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setShowEditForm(true);
  };

  const handleDeleteClick = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete student ${student.f_name} ${student.l_name} (${student.sid})?`
    );
    
    if (confirmed) {
      try {
        const { error } = await supabase
          .from('student')
          .delete()
          .eq('sid', student.sid);

        if (error) {
          console.error('Error deleting student:', error);
          alert('Error deleting student: ' + error.message);
        } else {
          alert('Student deleted successfully!');
          fetchStudents(); // Refresh the list
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px' }}>
        <h1>Student Registration Management</h1>
        
        <div className="dashboard-content">
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                backgroundColor: '#E6BB0C',
                color: '#342D2D',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Add New Student
            </button>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 'bold', color: '#342D2D' }}>Filter by:</span>
              
              <select
                value={filters.facultyid}
                onChange={(e) => handleFilterChange('facultyid', e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Faculties</option>
                {faculties.map(faculty => (
                  <option key={faculty.facultyid} value={faculty.facultyid}>
                    {faculty.fname}
                  </option>
                ))}
              </select>

              <select
                value={filters.degreeid}
                onChange={(e) => handleFilterChange('degreeid', e.target.value)}
                disabled={!filters.facultyid}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  opacity: !filters.facultyid ? 0.6 : 1
                }}
              >
                <option value="">
                  {!filters.facultyid ? 'Select Faculty First' : 'All Degrees'}
                </option>
                {degrees.map(degree => (
                  <option key={degree.degreeid} value={degree.degreeid}>
                    {degree.dname}
                  </option>
                ))}
              </select>

              <select
                value={filters.batch}
                onChange={(e) => handleFilterChange('batch', e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Batches</option>
                {batches.map(batch => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>

              <button
                onClick={clearFilters}
                style={{
                  padding: '8px 15px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {showForm && (
            <StudentRegistrationForm
              onClose={() => setShowForm(false)}
              onStudentAdded={handleStudentAdded}
            />
          )}

          {showEditForm && editingStudent && (
            <StudentUpdateForm
              studentData={editingStudent}
              onClose={() => {
                setShowEditForm(false);
                setEditingStudent(null);
              }}
              onStudentUpdated={handleStudentUpdated}
            />
          )}

          <div className="students-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2>Registered Students</h2>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Showing {students.length} of {allStudents.length} students
              </div>
            </div>
            
            {loading ? (
              <p>Loading students...</p>
            ) : students.length === 0 ? (
              <p>
                {allStudents.length === 0 
                  ? "No students registered yet." 
                  : "No students match the current filters."
                }
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: '20px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Student ID</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Phone</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Faculty</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Degree</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Batch</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.sid}>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{student.sid}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                          {student.f_name} {student.l_name}
                        </td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{student.email}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{student.phone_no}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                          {student.faculty?.fname || 'N/A'}
                        </td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                          {student.degree?.dname || 'N/A'}
                        </td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{student.batch}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => handleEditClick(student)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#3498db',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              title="Edit Student"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(student)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              title="Delete Student"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration; 