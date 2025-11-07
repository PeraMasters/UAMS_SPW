import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavBar from '../DashboardNavBar';
import supabase from '../../lib/supabaseClient';
import './AcademicCoordinatorDashboard.css';

const AcademicCordinatorDashboard = () => {
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get userSession from localStorage
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    const lid = userSession?.username; // user_name is the lecturer's ID

    if (!lid) {
      setError('No logged-in lecturer found. Please log in.');
      setLoading(false);
      return;
    }

    async function fetchLecturer() {
      const { data, error } = await supabase
        .from('lecturer')
        .select('f_name, l_name, facultyid, lid, email, address, phone_no, nic')
        .eq('lid', lid) // lid as string
        .single();

      if (error || !data) {
        setError('Failed to fetch lecturer details.');
      } else {
        setLecturer(data);
      }
      setLoading(false);
    }

    fetchLecturer();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div>
      <p>{error}</p>
      <button onClick={() => navigate('/login')}>Go to Login</button>
    </div>
  );

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      <div className="dashboard" style={{ marginTop: '60px' }}>
        <h1>Academic Coordinator Dashboard</h1>
        <div className="dashboard-content">
          <div className="user-card">
            <div className="left-info">
             
              <p><strong>Name</strong>:- <span className="info-value">{lecturer.f_name} {lecturer.l_name}</span></p>
              <p><strong>NIC</strong>:- <span className="info-value">{lecturer.nic}</span></p> 
            </div>
            {/* <div className="right-info"> */}
              {/* <p><strong>Faculty</strong>:- <span className="info-value">{lecturer.fname}</span></p> */}
              <p><strong>Email</strong>:- <span className="info-value">{lecturer.email}</span></p>
              <p><strong>Address</strong>:- <span className="info-value">{lecturer.address}</span></p>
              <p><strong>Employee ID</strong>:- <span className="info-value">{lecturer.lid}</span></p>
              <p><strong>Phone Number</strong>:- <span className="info-value">{lecturer.phone_no}</span></p>
              <p><strong>Current Position</strong>:- <span className="info-value">Lecturer</span></p>
            {/* </div> */}
          </div>
          <div className="nav-section">
            <div className="nav-row">
              <button className="nav-btn"onClick={() => navigate('/academic-confirm-attendance')}>Attendance</button>
              <button className="nav-btn" onClick={() => navigate('/lecture-time-table')}>Time Table</button>
            </div>
            <div className="nav-row">
              <button className="nav-btn" onClick={() => navigate('/e-dashboard')}>Exam</button>
              <button className="nav-btn" onClick={() => navigate('/student-details')}>Student Details</button>
            </div>
          </div>
          <footer className="footer">
            © 2025 University Management System. All Rights Reserved.
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AcademicCordinatorDashboard;
