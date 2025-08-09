import React from 'react';
import DashboardNavBar from '../DashboardNavBar';

const ExamDashboard = () => {
  return (
    <div className="dashboard-page">
      {/* Use the DashboardNavBar component */}
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px' }}>
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