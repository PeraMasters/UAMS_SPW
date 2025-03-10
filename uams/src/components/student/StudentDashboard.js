import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';

const StudentDashboard = () => {
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
            <li><Link to="/">Home</Link></li>
            <li>
              <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
            </li>
          </ul>
        </div>
      </nav>
      
      <div className="dashboard">
        <h1>Student Dashboard</h1>
        <div className="dashboard-content">
          <p>Welcome to the Student Portal</p>
          <div className="dashboard-actions">
            <div className="action-card">
              <h3>My Courses</h3>
              <p>View your enrolled courses and materials</p>
            </div>
            <div className="action-card">
              <h3>Exam Schedule</h3>
              <p>Check upcoming exams and results</p>
            </div>
            <div className="action-card">
              <h3>Personal Profile</h3>
              <p>Update your personal information</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 