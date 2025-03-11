import React from 'react';
import DashboardNavBar from '../DashboardNavBar';

const StudentDashboard = () => {
  return (
    <div className="dashboard-page">
      {/* Use the DashboardNavBar component */}
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px' }}>
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