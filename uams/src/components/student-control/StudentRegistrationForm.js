import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';

const StudentRegistrationForm = ({ onClose, onStudentAdded }) => {
  const [formData, setFormData] = useState({
    sid: '',
    f_name: '',
    l_name: '',
    nic: '',
    phone_no: '',
    dob: '',
    gender: '',
    email: '',
    address: '',
    parent_name: '',
    parent_contact_no: '',
    facultyid: '',
    degreeid: '',
    batch: ''
  });

  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [allDegrees, setAllDegrees] = useState([]); // Store all degrees
  const [filteredDegrees, setFilteredDegrees] = useState([]); // Store filtered degrees
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchFaculties();
    fetchDegrees();
  }, []);

  // Filter degrees when faculty is selected
  useEffect(() => {
    if (formData.facultyid) {
      const filtered = allDegrees.filter(degree => degree.facultyid == formData.facultyid);
      setFilteredDegrees(filtered);
      // Clear degree selection if current degree doesn't belong to selected faculty
      if (formData.degreeid) {
        const currentDegreeValid = filtered.some(degree => degree.degreeid === formData.degreeid);
        if (!currentDegreeValid) {
          setFormData(prev => ({ ...prev, degreeid: '' }));
        }
      }
    } else {
      setFilteredDegrees([]);
      setFormData(prev => ({ ...prev, degreeid: '' }));
    }
  }, [formData.facultyid, allDegrees]);

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
        setDegrees(data || []); // Keep this for backward compatibility
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.sid.trim()) newErrors.sid = 'Student ID is required';
    if (!formData.f_name.trim()) newErrors.f_name = 'First name is required';
    if (!formData.l_name.trim()) newErrors.l_name = 'Last name is required';
    if (!formData.nic.trim()) newErrors.nic = 'NIC is required';
    if (!formData.phone_no.trim()) newErrors.phone_no = 'Phone number is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.parent_name.trim()) newErrors.parent_name = 'Parent name is required';
    if (!formData.parent_contact_no.trim()) newErrors.parent_contact_no = 'Parent contact is required';
    if (!formData.facultyid) newErrors.facultyid = 'Faculty is required';
    if (!formData.degreeid) newErrors.degreeid = 'Degree is required';
    if (!formData.batch.trim()) newErrors.batch = 'Batch is required';

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
      const { data, error } = await supabase
        .from('student')
        .insert([formData])
        .select();

      if (error) {
        console.error('Error adding student:', error);
        alert('Error adding student: ' + error.message);
      } else {
        alert('Student added successfully!');
        onStudentAdded();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formStyle = {
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

  const formContentStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  };

  const errorStyle = {
    color: 'red',
    fontSize: '12px',
    marginTop: '4px'
  };

  return (
    <div style={formStyle}>
      <div style={formContentStyle}>
        <h2>Add New Student</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label>Student ID *</label>
              <input
                type="text"
                name="sid"
                value={formData.sid}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter student ID"
              />
              {errors.sid && <div style={errorStyle}>{errors.sid}</div>}
            </div>

            <div>
              <label>First Name *</label>
              <input
                type="text"
                name="f_name"
                value={formData.f_name}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter first name"
              />
              {errors.f_name && <div style={errorStyle}>{errors.f_name}</div>}
            </div>

            <div>
              <label>Last Name *</label>
              <input
                type="text"
                name="l_name"
                value={formData.l_name}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter last name"
              />
              {errors.l_name && <div style={errorStyle}>{errors.l_name}</div>}
            </div>

            <div>
              <label>NIC *</label>
              <input
                type="text"
                name="nic"
                value={formData.nic}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter NIC number"
              />
              {errors.nic && <div style={errorStyle}>{errors.nic}</div>}
            </div>

            <div>
              <label>Phone Number *</label>
              <input
                type="text"
                name="phone_no"
                value={formData.phone_no}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter phone number"
              />
              {errors.phone_no && <div style={errorStyle}>{errors.phone_no}</div>}
            </div>

            <div>
              <label>Date of Birth *</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                style={inputStyle}
              />
              {errors.dob && <div style={errorStyle}>{errors.dob}</div>}
            </div>

            <div>
              <label>Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                style={inputStyle}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <div style={errorStyle}>{errors.gender}</div>}
            </div>

            <div>
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter email address"
              />
              {errors.email && <div style={errorStyle}>{errors.email}</div>}
            </div>

            <div style={{ gridColumn: '1 / 3' }}>
              <label>Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
                placeholder="Enter full address"
              />
              {errors.address && <div style={errorStyle}>{errors.address}</div>}
            </div>

            <div>
              <label>Parent Name *</label>
              <input
                type="text"
                name="parent_name"
                value={formData.parent_name}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter parent name"
              />
              {errors.parent_name && <div style={errorStyle}>{errors.parent_name}</div>}
            </div>

            <div>
              <label>Parent Contact Number *</label>
              <input
                type="text"
                name="parent_contact_no"
                value={formData.parent_contact_no}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter parent contact number"
              />
              {errors.parent_contact_no && <div style={errorStyle}>{errors.parent_contact_no}</div>}
            </div>

            <div>
              <label>Faculty *</label>
              <select
                name="facultyid"
                value={formData.facultyid}
                onChange={handleInputChange}
                style={inputStyle}
              >
                <option value="">Select Faculty</option>
                {faculties.map(faculty => (
                  <option key={faculty.facultyid} value={faculty.facultyid}>
                    {faculty.fname}
                  </option>
                ))}
              </select>
              {errors.facultyid && <div style={errorStyle}>{errors.facultyid}</div>}
            </div>

            <div>
              <label>Degree *</label>
              <select
                name="degreeid"
                value={formData.degreeid}
                onChange={handleInputChange}
                style={inputStyle}
                disabled={!formData.facultyid}
              >
                <option value="">
                  {!formData.facultyid ? 'Select Faculty First' : 'Select Degree'}
                </option>
                {filteredDegrees.map(degree => (
                  <option key={degree.degreeid} value={degree.degreeid}>
                    {degree.dname}
                  </option>
                ))}
              </select>
              {errors.degreeid && <div style={errorStyle}>{errors.degreeid}</div>}
              {!formData.facultyid && (
                <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                  Please select a faculty to view available degrees
                </div>
              )}
            </div>

            <div>
              <label>Batch *</label>
              <input
                type="text"
                name="batch"
                value={formData.batch}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="Enter batch (e.g., 2024)"
              />
              {errors.batch && <div style={errorStyle}>{errors.batch}</div>}
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: 'white',
                cursor: 'pointer'
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
                borderRadius: '5px',
                backgroundColor: '#E6BB0C',
                color: '#342D2D',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistrationForm; 