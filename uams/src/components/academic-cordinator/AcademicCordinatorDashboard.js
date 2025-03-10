import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';

const AcademicCordinatorDashboard = () => {
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
        <h1>Academic Cordinator Dashboard</h1>
        <div className="dashboard-content">
          <p>Welcome to the Academic Cordinator Management System</p>
          <div className="dashboard-actions">
            <div className="action-card">
              <h3>Track Lecture Hours</h3>
              <p>Track Lecture Hours</p>
            </div>
            <div className="action-card">
              <h3>Retrive Attandance Report</h3>
              <p>Retrive Attandance Report</p>
            </div>
            <div className="action-card">
              <h3>Confirm & Upload Results</h3>
              <p>Confirm & Upload Results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicCordinatorDashboard; 