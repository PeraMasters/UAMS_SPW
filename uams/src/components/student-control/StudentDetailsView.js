import React from 'react';

const StudentDetailsView = ({ student, onClose, onEdit, onDelete }) => {
  if (!student) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return '#27ae60'; // Green
      case 'Hold':
        return '#f39c12'; // Orange
      case 'Dropped':
        return '#e74c3c'; // Red
      case 'Graduated':
        return '#3498db'; // Blue
      default:
        return '#95a5a6'; // Gray
    }
  };

  const getStatusTheme = (status) => {
    const color = getStatusColor(status);
    return {
      primary: color,
      light: color + '20', // Add transparency
      lighter: color + '10'
    };
  };

  const statusTheme = getStatusTheme(student.status);

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };

  const modalStyle = {
    backgroundColor: 'white',
    padding: '0',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    border: `3px solid ${statusTheme.primary}`
  };

  const headerStyle = {
    background: `linear-gradient(135deg, ${statusTheme.primary}, ${statusTheme.primary}dd)`,
    color: 'white',
    padding: '30px',
    borderRadius: '7px 7px 0 0',
    marginBottom: '30px'
  };

  const sectionStyle = {
    marginBottom: '25px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  };

  const sectionTitleStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '15px',
    borderBottom: `2px solid ${statusTheme.primary}`,
    paddingBottom: '5px'
  };

  const fieldRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '15px'
  };

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column'
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: '5px'
  };

  const valueStyle = {
    fontSize: '16px',
    color: '#2c3e50',
    padding: '8px 12px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minHeight: '20px'
  };

  const fullWidthFieldStyle = {
    ...fieldStyle,
    gridColumn: '1 / 3'
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header with Status */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, color: 'white' }}>Student Details</h2>
                <div
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    color: statusTheme.primary,
                    border: `2px solid white`
                  }}
                >
                  ● {student.status || 'Unknown Status'}
                </div>
              </div>
              <p style={{ margin: '0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                Complete information for Student ID: {student.sid}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 15px',
                border: '2px solid white',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                backdropFilter: 'blur(10px)'
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{ padding: '0 30px 30px 30px' }}>

        {/* Personal Information */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Personal Information</div>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Student ID</label>
              <div style={valueStyle}>{student.sid || 'N/A'}</div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Full Name</label>
              <div style={valueStyle}>
                {`${student.f_name || ''} ${student.l_name || ''}`.trim() || 'N/A'}
              </div>
            </div>
          </div>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>NIC Number</label>
              <div style={valueStyle}>{student.nic || 'N/A'}</div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date of Birth</label>
              <div style={valueStyle}>{formatDate(student.dob)}</div>
            </div>
          </div>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Gender</label>
              <div style={valueStyle}>{student.gender || 'N/A'}</div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Admission Year</label>
              <div style={valueStyle}>{student.admission_year || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div style={{
          ...sectionStyle,
          backgroundColor: statusTheme.light,
          border: `2px solid ${statusTheme.primary}`
        }}>
          <div style={sectionTitleStyle}>Student Status</div>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Current Status</label>
              <div style={{
                ...valueStyle,
                backgroundColor: statusTheme.primary,
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: '18px'
              }}>
                {student.status || 'N/A'}
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Status Description</label>
              <div style={valueStyle}>
                {student.status === 'Active' && 'Student is currently enrolled and attending classes'}
                {student.status === 'Hold' && 'Student enrollment is temporarily on hold'}
                {student.status === 'Dropped' && 'Student has dropped out of the program'}
                {student.status === 'Graduated' && 'Student has successfully completed the program'}
                {!student.status && 'Status information not available'}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Contact Information</div>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Phone Number</label>
              <div style={valueStyle}>{student.phone_no || 'N/A'}</div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email Address</label>
              <div style={valueStyle}>{student.email || 'N/A'}</div>
            </div>
          </div>
          <div style={fieldRowStyle}>
            <div style={fullWidthFieldStyle}>
              <label style={labelStyle}>Address</label>
              <div style={valueStyle}>{student.address || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Family Information */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Family Information</div>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Parent/Guardian Name</label>
              <div style={valueStyle}>{student.parent_name || 'N/A'}</div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Parent/Guardian Contact</label>
              <div style={valueStyle}>{student.parent_contact_no || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Academic Information</div>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Faculty</label>
              <div style={valueStyle}>
                {student.faculty?.fname || 'N/A'}
                {student.facultyid && (
                  <span style={{ color: '#7f8c8d', fontSize: '14px', marginLeft: '10px' }}>
                    (ID: {student.facultyid})
                  </span>
                )}
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Degree Program</label>
              <div style={valueStyle}>
                {student.degree?.dname || 'N/A'}
                {student.degreeid && (
                  <span style={{ color: '#7f8c8d', fontSize: '14px', marginLeft: '10px' }}>
                    (ID: {student.degreeid})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  onEdit(student);
                  onClose();
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  backgroundColor: statusTheme.primary,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                title="Edit Student Information"
              >
                ✏️ Edit Student
              </button>
              <button
                onClick={() => {
                  onDelete(student);
                  onClose();
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                title="Delete Student"
              >
                🗑️ Delete Student
              </button>
            </div>
            
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: '#95a5a6',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsView; 