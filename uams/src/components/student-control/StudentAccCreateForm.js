import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';

const StudentAccCreateForm = ({ onClose, onAccountCreated }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    password: '',
    selectedStudentId: ''
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchStudentsWithoutAccounts();
  }, []);

  const fetchStudentsWithoutAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('student')
        .select('sid, f_name, l_name, user_name')
        .is('user_name', null) // Only students without accounts
        .order('sid');

      if (error) {
        console.error('Error fetching students:', error);
      } else {
        setStudents(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
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
                  {student.sid} - {student.f_name} {student.l_name}
                </option>
              ))}
            </select>
            {errors.selectedStudentId && (
              <span style={{ color: '#dc3545', fontSize: '12px' }}>{errors.selectedStudentId}</span>
            )}
            {students.length === 0 && (
              <span style={{ color: '#ffc107', fontSize: '12px' }}>
                No students available (all students already have accounts)
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