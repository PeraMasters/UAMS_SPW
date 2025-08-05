import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavBar from '../DashboardNavBar';

const StudentRegistrationAndAccountCreation = () => {
  const navigate = useNavigate();

  const handleRegistrationClick = () => {
    navigate('/student-registration');
  };

  const handleAccountCreationClick = () => {
    navigate('/student-account-creation');
  };

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px' }}>
        <h1>Student Registration and Account Creation</h1>
        
        <div className="dashboard-content">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
            gap: '30px', 
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div 
              className="action-card" 
              onClick={handleRegistrationClick}
              style={{ 
                cursor: 'pointer',
                padding: '30px',
                textAlign: 'center',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>👨‍🎓</div>
              <h3 style={{ color: '#007bff', marginBottom: '15px' }}>Student Registration</h3>
              <p style={{ color: '#666', lineHeight: '1.5' }}>
                Register new students, view existing student records, update student information, and manage student status
              </p>
            </div>
            
            <div 
              className="action-card" 
              onClick={handleAccountCreationClick}
              style={{ 
                cursor: 'pointer',
                padding: '30px',
                textAlign: 'center',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔐</div>
              <h3 style={{ color: '#28a745', marginBottom: '15px' }}>Account Creation</h3>
              <p style={{ color: '#666', lineHeight: '1.5' }}>
                Create user accounts for students, manage login credentials, and set up student portal access
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistrationAndAccountCreation;