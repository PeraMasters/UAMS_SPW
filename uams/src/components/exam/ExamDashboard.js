import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavBar from '../DashboardNavBar';

const ExamDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-page" style={{ backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <DashboardNavBar />

      <div className="dashboard" style={{ marginTop: '60px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#1f2937', fontWeight: '700' }}>Exam Dashboard</h1>
        <p style={{ marginTop: '10px', color: '#374151', fontSize: '1.1rem' }}>
          Welcome to the Exam Management System
        </p>

        <div
          className="dashboard-actions"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
            marginTop: '30px',
          }}
        >
          <div
            className="action-card"
            onClick={() => navigate('/exam-result')}
            style={cardStyle}
          >
            <h3 style={cardTextStyle}>Publish Exam Results</h3>
          </div>

          <div
            className="action-card"
            onClick={() => navigate('/exam')}
            style={cardStyle}
          >
            <h3 style={cardTextStyle}>Add Students Into Exam</h3>
          </div>

          <div
            className="action-card"
            onClick={() => navigate('/exam-admission')}
            style={cardStyle}
          >
            <h3 style={cardTextStyle}>Generate Admission</h3>
          </div>

          <div
            className="action-card"
            onClick={() => navigate('/exam-timetable')}
            style={cardStyle}
          >
            <h3 style={cardTextStyle}>View Exam Timetable</h3>
          </div>

          <div
            className="action-card"
            onClick={() => navigate('/exam-attendance')}
            style={cardStyle}
          >
            <h3 style={cardTextStyle}>Get Exam Attendance</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Style definitions
const cardStyle = {
  backgroundColor: '#fff',
  padding: '30px',
  borderRadius: '12px',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
  cursor: 'pointer',
  width: '260px',
  transition: 'transform 0.2s',
};

const cardTextStyle = {
  color: '#0284c7',
  fontWeight: '600',
  fontSize: '18px',
  margin: 0,
};

export default ExamDashboard;
