import React, { useState, useEffect, useCallback } from 'react';
import DashboardNavBar from '../DashboardNavBar';
import StudentRegistrationForm from './StudentRegistrationForm';
import StudentUpdateForm from './StudentUpdateForm';
import StudentDetailsView from './StudentDetailsView';
import supabase from '../../lib/supabaseClient';

const StudentRegistration = () => {
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetailsView, setShowDetailsView] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Store all students
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    facultyid: '',
    degreeid: '',
    admission_year: '',
    status: ''
  });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter options
  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [allDegrees, setAllDegrees] = useState([]);
  const [admissionYears, setAdmissionYears] = useState([]);
  const [statuses] = useState(['Active', 'Hold', 'Dropped', 'Graduated']);

  useEffect(() => {
    fetchStudents();
    fetchFaculties();
    fetchDegrees();
  }, []);

  // Filter degrees when faculty filter changes
  useEffect(() => {
    if (filters.facultyid) {
      // eslint-disable-next-line eqeqeq
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
  }, [filters.facultyid, filters.degreeid, allDegrees]);

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
          admission_year,
          status,
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
        
        // Extract unique admission years for filter
        const uniqueAdmissionYears = [...new Set(studentsData.map(student => student.admission_year))].sort();
        setAdmissionYears(uniqueAdmissionYears);
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

  const applyFilters = useCallback(() => {
    let filtered = [...allStudents];

    // Filter by search term (student ID or name)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const fullName = `${student.f_name} ${student.l_name}`.toLowerCase();
        const studentId = student.sid.toLowerCase();
        return studentId.includes(searchLower) || 
               fullName.includes(searchLower) ||
               student.f_name.toLowerCase().includes(searchLower) ||
               student.l_name.toLowerCase().includes(searchLower);
      });
    }

    // Filter by faculty
    if (filters.facultyid) {
      // eslint-disable-next-line eqeqeq
      filtered = filtered.filter(student => student.facultyid == filters.facultyid);
    }

    // Filter by degree
    if (filters.degreeid) {
      filtered = filtered.filter(student => student.degreeid === filters.degreeid);
    }

    // Filter by admission year
    if (filters.admission_year) {
      filtered = filtered.filter(student => student.admission_year === filters.admission_year);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(student => student.status === filters.status);
    }

    setStudents(filtered);
  }, [allStudents, searchTerm, filters]);

  // Apply filters when filters or search term change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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
      admission_year: '',
      status: ''
    });
    setSearchTerm('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return '#27ae60'; // Green
      case 'Hold':
        return '#f39c12'; // Orange
      case 'Dropped':
        return '#e74c3c'; // Red
      case 'Graduated':
        return '#3498db'; // Blue
      default:
        return '#95a5a6'; // Gray
    }
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

  const handleViewClick = (student) => {
    setSelectedStudent(student);
    setShowDetailsView(true);
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
          {/* Search Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontWeight: 'bold', color: '#342D2D', minWidth: 'fit-content' }}>🔍 Search:</span>
              <input
                type="text"
                placeholder="Search by Student ID or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  maxWidth: '400px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#E6BB0C';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ddd';
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#666'
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

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
                value={filters.admission_year}
                onChange={(e) => handleFilterChange('admission_year', e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Admission Years</option>
                {admissionYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status}
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

          {showDetailsView && selectedStudent && (
            <StudentDetailsView
              student={selectedStudent}
              onClose={() => {
                setShowDetailsView(false);
                setSelectedStudent(null);
              }}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          )}

          <div className="students-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Registered Students</h2>
              </div>
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
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Admission Year</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const statusColor = getStatusColor(student.status);
                      const rowBackgroundColor = statusColor + '15'; // Light transparency
                      const hoverBackgroundColor = statusColor + '25'; // Slightly more opacity on hover
                      
                      return (
                        <tr 
                          key={student.sid}
                          onClick={() => handleViewClick(student)}
                          style={{
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: rowBackgroundColor,
                            borderLeft: `4px solid ${statusColor}`
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = hoverBackgroundColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = rowBackgroundColor;
                          }}
                          title="Click to view student details"
                        >
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
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{student.admission_year}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: 'white',
                              backgroundColor: getStatusColor(student.status)
                            }}
                          >
                            {student.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
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