import React, { useState, useEffect } from 'react';
import DashboardNavBar from '../DashboardNavBar';
import supabase from '../../lib/supabaseClient';

const TimetableDashboard = () => {
  const [lectures, setLectures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('view');
  const [error, setError] = useState('');
  
  // Form state for creating lectures
  const [lectureForm, setLectureForm] = useState({
    cid: '',
    lecture_title: '',
    lecture_date: '',
    start_time: '',
    end_time: '',
    lecturer_name: '',
    location: '',
    attendance_enabled: true
  });
  const [submittingLecture, setSubmittingLecture] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchLectures(),
        fetchCourses()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lecture')
        .select(`
          *,
          course(cid, cname)
        `)
        .order('lecture_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching lectures:', error);
        return;
      }

      setLectures(data || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('course')
        .select('cid, cname')
        .order('cid', { ascending: true });

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLectureForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateLectureForm = () => {
    const { cid, lecture_title, lecture_date, start_time, end_time, lecturer_name, location } = lectureForm;
    
    if (!cid || !lecture_title || !lecture_date || !start_time || !end_time || !lecturer_name || !location) {
      return 'Please fill in all required fields';
    }

    // Validate that end time is after start time
    if (start_time >= end_time) {
      return 'End time must be after start time';
    }

    // Validate that lecture date is not in the past
    const lectureDate = new Date(lecture_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (lectureDate < today) {
      return 'Lecture date cannot be in the past';
    }

    return null;
  };

  const submitLecture = async (e) => {
    e.preventDefault();
    
    const validationError = validateLectureForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmittingLecture(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('lecture')
        .insert([lectureForm])
        .select()
        .single();

      if (error) {
        console.error('Error creating lecture:', error);
        setError(`Failed to create lecture: ${error.message}`);
        return;
      }

      // Reset form
      setLectureForm({
        cid: '',
        lecture_title: '',
        lecture_date: '',
        start_time: '',
        end_time: '',
        lecturer_name: '',
        location: '',
        attendance_enabled: true
      });

      // Refresh lectures list
      await fetchLectures();
      
      alert('Lecture created successfully!');
      setActiveTab('view'); // Switch to view tab

    } catch (error) {
      console.error('Error submitting lecture:', error);
      setError(`Failed to create lecture: ${error.message}`);
    } finally {
      setSubmittingLecture(false);
    }
  };

  const deleteLecture = async (lectureId) => {
    if (!window.confirm('Are you sure you want to delete this lecture? This will also delete all attendance records for this lecture.')) {
      return;
    }

    try {
      // First delete attendance records
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .eq('lecture_id', lectureId);

      if (attendanceError) {
        console.error('Error deleting attendance records:', attendanceError);
        setError('Failed to delete attendance records');
        return;
      }

      // Then delete the lecture
      const { error: lectureError } = await supabase
        .from('lecture')
        .delete()
        .eq('lecture_id', lectureId);

      if (lectureError) {
        console.error('Error deleting lecture:', lectureError);
        setError(`Failed to delete lecture: ${lectureError.message}`);
        return;
      }

      // Refresh lectures list
      await fetchLectures();
      alert('Lecture deleted successfully!');

    } catch (error) {
      console.error('Error deleting lecture:', error);
      setError(`Failed to delete lecture: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <DashboardNavBar />
        <div className="dashboard" style={{ marginTop: '60px' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardNavBar />

      <div className="dashboard" style={{ marginTop: '60px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1>Timetable & Lecture Management</h1>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px' }}>
          {/* Tab Navigation */}
          <div className="tab-navigation" style={{ marginBottom: '30px' }}>
            <button 
              className={activeTab === 'view' ? 'active-tab' : 'tab-button'}
              onClick={() => setActiveTab('view')}
              style={{ 
                padding: '10px 20px', 
                margin: '0 5px', 
                border: '1px solid #ccc', 
                backgroundColor: activeTab === 'view' ? '#007bff' : 'white', 
                color: activeTab === 'view' ? 'white' : 'black',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View Lectures
            </button>
            <button 
              className={activeTab === 'create' ? 'active-tab' : 'tab-button'}
              onClick={() => setActiveTab('create')}
              style={{ 
                padding: '10px 20px', 
                margin: '0 5px', 
                border: '1px solid #ccc', 
                backgroundColor: activeTab === 'create' ? '#007bff' : 'white', 
                color: activeTab === 'create' ? 'white' : 'black',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Create Lecture
            </button>
          </div>

          {/* View Lectures Tab */}
          {activeTab === 'view' && (
            <div>
              <h3>All Lectures</h3>
              {lectures.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Course</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Title</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Time</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Lecturer</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Location</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Attendance</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lectures.map((lecture, index) => (
                        <tr key={lecture.lecture_id} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {lecture.course?.cname || lecture.cid}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>{lecture.lecture_title}</td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {new Date(lecture.lecture_date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {lecture.start_time} - {lecture.end_time}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>{lecture.lecturer_name}</td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>{lecture.location}</td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            <span style={{ 
                              color: lecture.attendance_enabled ? 'green' : 'red',
                              fontWeight: 'bold'
                            }}>
                              {lecture.attendance_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            <button
                              onClick={() => deleteLecture(lecture.lecture_id)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No lectures found. Create your first lecture using the "Create Lecture" tab.</p>
              )}
            </div>
          )}

          {/* Create Lecture Tab */}
          {activeTab === 'create' && (
            <div>
              <h3>Create New Lecture</h3>
              <form onSubmit={submitLecture} style={{ maxWidth: '600px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Course:</label>
                  <select
                    name="cid"
                    value={lectureForm.cid}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <option value="">Select a course...</option>
                    {courses.map(course => (
                      <option key={course.cid} value={course.cid}>
                        {course.cid} - {course.cname}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lecture Title:</label>
                  <input
                    type="text"
                    name="lecture_title"
                    value={lectureForm.lecture_title}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., Introduction to React Components"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lecture Date:</label>
                  <input
                    type="date"
                    name="lecture_date"
                    value={lectureForm.lecture_date}
                    onChange={handleFormChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Start Time:</label>
                    <input
                      type="time"
                      name="start_time"
                      value={lectureForm.start_time}
                      onChange={handleFormChange}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>End Time:</label>
                    <input
                      type="time"
                      name="end_time"
                      value={lectureForm.end_time}
                      onChange={handleFormChange}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lecturer Name:</label>
                  <input
                    type="text"
                    name="lecturer_name"
                    value={lectureForm.lecturer_name}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., Dr. Smith"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Location:</label>
                  <input
                    type="text"
                    name="location"
                    value={lectureForm.location}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., Room A101, Computer Lab 2"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      name="attendance_enabled"
                      checked={lectureForm.attendance_enabled}
                      onChange={handleFormChange}
                      style={{ marginRight: '8px' }}
                    />
                    Enable attendance marking for this lecture
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingLecture}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: submittingLecture ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: submittingLecture ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingLecture ? 'Creating...' : 'Create Lecture'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimetableDashboard; 