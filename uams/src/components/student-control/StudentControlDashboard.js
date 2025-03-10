import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';

const StudentControlDashboard = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="dashboard-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <h1>University Academic Management System</h1>
          <ul>
            <li>
              <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="dashboard">
        <h1>Student Control Dashboard</h1>
        <div className="dashboard-content">
          <p>Welcome to the Student Control Management System</p>
          <div className="dashboard-actions">
            <div className="action-card">
              <h3>Student Registration</h3>
              <p>Manage student enrollment and registration</p>
            </div>
            <div className="action-card">
              <h3>Academic Records</h3>
              <p>Maintain and update student academic records</p>
            </div>
            <div className="action-card">
              <h3>Attendance Tracking</h3>
              <p>Monitor student attendance and participation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentControlDashboard; 