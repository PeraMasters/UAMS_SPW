import React from 'react';
import DashboardNavBar from '../DashboardNavBar';

const TimetableDashboard = () => {
  return (
    <div className="dashboard-page">
      {/* Use the DashboardNavBar component */}
      <DashboardNavBar />

      <div className="dashboard" style={{ marginTop: '60px' }}>
        <h1>Timetable Dashboard</h1>
        <div className="dashboard-content">
          <p>Welcome to the Timetable Management System</p>
          <div className="dashboard-actions">
            <div className="action-card">
              <h3>task 1</h3>
              <p>task 1</p>
            </div>
            <div className="action-card">
              <h3>task 2</h3>
              <p>task 2</p>
            </div>
            <div className="action-card">
              <h3>task 3</h3>
              <p>task 3</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableDashboard; 