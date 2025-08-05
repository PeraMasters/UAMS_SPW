import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';

const StudentAccCreateForm = ({ onClose, onAccountCreated }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    password: '',
    selectedStudentId: ''
  });
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // All students without accounts
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Filter states
  const [filters, setFilters] = useState({
    facultyid: '',
    admission_year: ''
  });
  
  // Filter options
  const [faculties, setFaculties] = useState([]);
  const [admissionYears, setAdmissionYears] = useState([]);

  useEffect(() => {
    fetchStudentsWithoutAccounts();
    fetchFaculties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, allStudents]);

  const fetchStudentsWithoutAccounts = async () => {
    try {
      // First get all existing usernames from login table
      const { data: existingLogins, error: loginError } = await supabase
        .from('login')
        .select('user_name');

      if (loginError) {
        console.error('Error fetching existing logins:', loginError);
        return;
      }

      const existingUsernames = new Set(existingLogins?.map(login => login.user_name) || []);

      // Then get students without user_name or whose user_name doesn't exist in login table
      const { data, error } = await supabase
        .from('student')
        .select(`
          sid, 
          f_name, 
          l_name, 
          user_name,
          facultyid,
          admission_year,
          faculty:facultyid(fname)
        `)
        .order('admission_year', { ascending: false }) // Most recent year first
        .order('sid');

      if (error) {
        console.error('Error fetching students:', error);
      } else {
        const allStudentsData = data || [];
        
        // Filter out students who already have accounts (either linked or existing in login table)
        const studentsWithoutAccounts = allStudentsData.filter(student => {
          // Student doesn't have account if:
          // 1. user_name is null in student table, AND
          // 2. student ID (sid) doesn't exist as username in login table
          return !student.user_name && !existingUsernames.has(student.sid);
        });
        
        setAllStudents(studentsWithoutAccounts);
        setStudents(studentsWithoutAccounts);
        
        // Extract unique admission years and sort (most recent first)
        const uniqueAdmissionYears = [...new Set(studentsWithoutAccounts.map(student => student.admission_year))].sort((a, b) => b - a);
        setAdmissionYears(uniqueAdmissionYears);
        
        // Auto-select the most recent admission year
        if (uniqueAdmissionYears.length > 0 && !filters.admission_year) {
          setFilters(prev => ({
            ...prev,
            admission_year: uniqueAdmissionYears[0].toString()
          }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
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

  const applyFilters = () => {
    let filtered = [...allStudents];

    // Filter by admission year
    if (filters.admission_year) {
      // eslint-disable-next-line eqeqeq
      filtered = filtered.filter(student => student.admission_year == filters.admission_year);
    }

    // Filter by faculty
    if (filters.facultyid) {
      // eslint-disable-next-line eqeqeq
      filtered = filtered.filter(student => student.facultyid == filters.facultyid);
    }

    setStudents(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear selected student when filters change
    setFormData(prev => ({
      ...prev,
      selectedStudentId: '',
      user_name: '',
      password: ''
    }));
    setErrors(prev => ({
      ...prev,
      selectedStudentId: '',
      user_name: '',
      password: ''
    }));
  };

  const clearFilters = () => {
    setFilters({
      facultyid: '',
      admission_year: admissionYears.length > 0 ? admissionYears[0].toString() : ''
    });
    setFormData(prev => ({
      ...prev,
      selectedStudentId: '',
      user_name: '',
      password: ''
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If student is selected, automatically set username and password to student ID
    if (name === 'selectedStudentId') {
      const selectedStudent = students.find(student => student.sid === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        user_name: selectedStudent ? selectedStudent.sid : '',
        password: selectedStudent ? selectedStudent.sid : ''
      }));
      // Clear all relevant errors when student is selected
      if (errors[name] || errors.user_name || errors.password) {
        setErrors(prev => ({
          ...prev,
          [name]: '',
          user_name: '',
          password: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.user_name.trim()) {
      newErrors.user_name = 'Please select a student to set the username';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Please select a student to set the password';
    }

    if (!formData.selectedStudentId) {
      newErrors.selectedStudentId = 'Please select a student';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // First, insert into login table
      const { error: loginError } = await supabase
        .from('login')
        .insert({
          user_name: formData.user_name,
          password: formData.password,
          role: 'Student'
        })
        .select();

      if (loginError) {
        console.error('Error creating account:', loginError);
        alert('Error creating account: ' + loginError.message);
        return;
      }

      // Update student table with the username
      if (formData.selectedStudentId) {
        const { error: studentError } = await supabase
          .from('student')
          .update({ user_name: formData.user_name })
          .eq('sid', formData.selectedStudentId);

        if (studentError) {
          console.error('Error updating student:', studentError);
          alert('Account created but failed to link student: ' + studentError.message);
        }
      }

      alert('Account created successfully!');
      onAccountCreated();
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCreateAccounts = async () => {
    if (students.length === 0) {
      alert('No students available to create accounts for.');
      return;
    }

    const confirmMessage = `Create accounts for all ${students.length} filtered students?\n\nThis will create accounts with:\n- Username = Student ID\n- Password = Student ID\n- Role = Student\n\nStudents can change their passwords later.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBatchLoading(true);
    const results = {
      successful: [],
      failed: []
    };

    try {
      for (const student of students) {
        try {
          // Double-check if account already exists (safety check)
          const { data: existingAccount, error: checkError } = await supabase
            .from('login')
            .select('user_name')
            .eq('user_name', student.sid)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 = no rows returned (which is what we want)
            results.failed.push({
              student: student,
              error: `Error checking existing account: ${checkError.message}`
            });
            continue;
          }

          if (existingAccount) {
            // Account already exists, skip
            results.failed.push({
              student: student,
              error: 'Account already exists in login table'
            });
            continue;
          }

          // Create account in login table
          const { error: loginError } = await supabase
            .from('login')
            .insert({
              user_name: student.sid,
              password: student.sid,
              role: 'Student'
            })
            .select();

          if (loginError) {
            results.failed.push({
              student: student,
              error: loginError.message
            });
            continue;
          }

          // Update student table with username
          const { error: studentError } = await supabase
            .from('student')
            .update({ user_name: student.sid })
            .eq('sid', student.sid);

          if (studentError) {
            results.failed.push({
              student: student,
              error: `Account created but failed to link student: ${studentError.message}`
            });
          } else {
            results.successful.push(student);
          }

          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          results.failed.push({
            student: student,
            error: error.message
          });
        }
      }

      // Show results
      const successCount = results.successful.length;
      const failCount = results.failed.length;
      
      let message = `Batch Account Creation Complete!\n\n`;
      message += `✅ Successfully created: ${successCount} accounts\n`;
      
      if (failCount > 0) {
        message += `❌ Failed: ${failCount} accounts\n\n`;
        message += `Failed accounts:\n`;
        results.failed.forEach(failure => {
          message += `- ${failure.student.sid} (${failure.student.f_name} ${failure.student.l_name}): ${failure.error}\n`;
        });
        message += `\nNote: Failed accounts may already exist. The student list will refresh to show only students who truly need accounts.`;
      }

      alert(message);
      
      // Always refresh the list to get the most current data
      fetchStudentsWithoutAccounts();
      if (successCount > 0) {
        onAccountCreated(); // Also refresh the parent component
      }

    } catch (error) {
      console.error('Batch creation error:', error);
      alert('An unexpected error occurred during batch creation: ' + error.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };

  const formStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  };

  return (
    <div style={modalStyle}>
      <div style={formStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#28a745' }}>Create Student Account</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Filter Section */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#495057', fontSize: '16px' }}>Filter Students</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                  Academic Year
                </label>
                <select
                  name="admission_year"
                  value={filters.admission_year}
                  onChange={handleFilterChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Years</option>
                  {admissionYears.map(year => (
                    <option key={year} value={year}>
                      {year} {year === admissionYears[0] ? '(Latest)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                  Faculty
                </label>
                <select
                  name="facultyid"
                  value={filters.facultyid}
                  onChange={handleFilterChange}
                  style={{
                    width: '100%',
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
              </div>
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Showing {students.length} of {allStudents.length} students without accounts
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={fetchStudentsWithoutAccounts}
                  style={{
                    padding: '5px 10px',
                    border: '1px solid #17a2b8',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#17a2b8'
                  }}
                  title="Refresh student list to get latest data"
                >
                  🔄 Refresh
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    padding: '5px 10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#666'
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
            
            {/* Batch Create Section */}
            {students.length > 0 && (
              <div style={{ 
                marginTop: '15px', 
                padding: '12px',
                backgroundColor: '#e8f5e8',
                borderRadius: '6px',
                border: '1px solid #28a745'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#155724', fontSize: '14px' }}>
                      🚀 Batch Account Creation
                    </div>
                    <div style={{ fontSize: '12px', color: '#155724', marginTop: '2px' }}>
                      Create accounts for all {students.length} filtered students at once
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleBatchCreateAccounts}
                    disabled={batchLoading}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '5px',
                      backgroundColor: batchLoading ? '#6c757d' : '#28a745',
                      color: 'white',
                      cursor: batchLoading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      opacity: batchLoading ? 0.7 : 1
                    }}
                  >
                    {batchLoading ? 'Creating...' : `Create All ${students.length} Accounts`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Individual Account Creation Section */}
          <div style={{ 
            marginBottom: '20px', 
            paddingTop: '20px',
            borderTop: '2px solid #dee2e6'
          }}>
            <h4 style={{ 
              margin: '0 0 15px 0', 
              color: '#495057', 
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center'
            }}>
              👤 Individual Account Creation
              <span style={{ 
                fontSize: '12px', 
                color: '#6c757d', 
                fontWeight: 'normal',
                marginLeft: '10px'
              }}>
                (Create one account at a time)
              </span>
            </h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Select Student *
              </label>
            <select
              name="selectedStudentId"
              value={formData.selectedStudentId}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: errors.selectedStudentId ? '2px solid #dc3545' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select a student</option>
              {students.map(student => (
                <option key={student.sid} value={student.sid}>
                  {student.sid} - {student.f_name} {student.l_name} ({student.faculty?.fname || 'Unknown Faculty'}) - {student.admission_year}
                </option>
              ))}
            </select>
            {errors.selectedStudentId && (
              <span style={{ color: '#dc3545', fontSize: '12px' }}>{errors.selectedStudentId}</span>
            )}
            {students.length === 0 && allStudents.length === 0 && (
              <span style={{ color: '#ffc107', fontSize: '12px' }}>
                No students available (all students already have accounts)
              </span>
            )}
            {students.length === 0 && allStudents.length > 0 && (
              <span style={{ color: '#17a2b8', fontSize: '12px' }}>
                No students match the current filters. Try adjusting the Academic Year or Faculty filters.
              </span>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Username *
            </label>
            <input
              type="text"
              name="user_name"
              value={formData.user_name}
              readOnly
              placeholder={formData.selectedStudentId ? "Auto-filled from Student ID" : "Select a student to auto-fill username"}
              style={{
                width: '100%',
                padding: '10px',
                border: errors.user_name ? '2px solid #dc3545' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa',
                color: formData.user_name ? '#495057' : '#6c757d',
                cursor: 'not-allowed'
              }}
            />
            <span style={{ color: '#6c757d', fontSize: '12px' }}>
              {formData.selectedStudentId ? 'Username is automatically set to Student ID' : 'Username will be set automatically when you select a student'}
            </span>
            {errors.user_name && (
              <span style={{ color: '#dc3545', fontSize: '12px', display: 'block', marginTop: '2px' }}>{errors.user_name}</span>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Password *
            </label>
            <input
              type="text"
              name="password"
              value={formData.password}
              readOnly
              placeholder={formData.selectedStudentId ? "Auto-filled from Student ID" : "Select a student to auto-fill password"}
              style={{
                width: '100%',
                padding: '10px',
                border: errors.password ? '2px solid #dc3545' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa',
                color: formData.password ? '#495057' : '#6c757d',
                cursor: 'not-allowed'
              }}
            />
            <span style={{ color: '#6c757d', fontSize: '12px' }}>
              {formData.selectedStudentId ? 'Password is automatically set to Student ID. Students can change it later.' : 'Password will be set automatically when you select a student'}
            </span>
            {errors.password && (
              <span style={{ color: '#dc3545', fontSize: '12px', display: 'block', marginTop: '2px' }}>{errors.password}</span>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Role *
            </label>
            <input
              type="text"
              value="Student"
              disabled
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa',
                color: '#6c757d',
                cursor: 'not-allowed'
              }}
            />
            <span style={{ color: '#6c757d', fontSize: '12px' }}>Role is automatically set to Student</span>
          </div>
          </div> {/* Close Individual Account Creation Section */}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: loading ? '#cccccc' : '#28a745',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentAccCreateForm;