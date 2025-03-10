import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';

const ExamDashboard = () => {
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
        <h1>Exam Dashboard</h1>
        <div className="dashboard-content">
          <p>Welcome to the Exam Management System</p>
          <div className="dashboard-actions">
            <div className="action-card">
              <h3>Publish Exam Results</h3>
              <p>Publish Exam Results dfgfdghfh</p>
            </div>
            <div className="action-card">
              <h3>Add Students Into Exam</h3>
              <p>Add Students Into Exams fgfhrs</p>
            </div>
            <div className="action-card">
              <h3>Generate Addmission</h3>
              <p>Generate Addmission vfdhs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamDashboard; 