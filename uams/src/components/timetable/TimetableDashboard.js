import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';

const TimetableDashboard = () => {
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
        <h1>Timetable Dashboard</h1>
        <div className="dashboard-content">
          <p>Welcome to the Timetable Management System</p>
          <div className="dashboard-actions">
            <div className="action-card">
              <h3>Create Timetable</h3>
              <p>Create timetable</p>
            </div>
            <div className="action-card">
              <h3>Display Timetables</h3>
              <p>Display Timetables</p>
            </div>
            <div className="action-card">
              <h3>Send Timetable to Exam Coordinator</h3>
              <p>Send Timetable to Exam Coordinator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableDashboard; 