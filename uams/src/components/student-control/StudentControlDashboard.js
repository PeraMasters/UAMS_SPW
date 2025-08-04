import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavBar from '../DashboardNavBar';

const StudentControlDashboard = () => {
  const navigate = useNavigate();

  const handleStudentRegistrationClick = () => {
    navigate('/student-registration');
  };

  return (
    <div className="dashboard-page">
      {/* Use the DashboardNavBar component */}
      <DashboardNavBar />

      <div className="dashboard" style={{ marginTop: '60px' }}>
        <h1>Student Control Dashboard</h1>
        <div className="dashboard-content">
          <p>Welcome to the Student Control Management System</p>
          <div className="dashboard-actions">
            <div className="action-card" onClick={handleStudentRegistrationClick} style={{ cursor: 'pointer' }}>
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