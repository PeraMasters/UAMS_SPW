import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavBar from '../DashboardNavBar';
import supabase from '../../lib/supabaseClient';

const PaymentDetails = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [semesterPayments, setSemesterPayments] = useState([]);
  const [otherPayments, setOtherPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentDataAndPayments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStudentDataAndPayments = async () => {
    try {
      // Get user session
      const userSession = JSON.parse(localStorage.getItem('userSession'));
      if (!userSession) {
        setError('No active session found');
        return;
      }

      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from('student')
        .select('*')
        .eq('user_name', userSession.username)
        .single();

      if (studentError) {
        console.error('Student fetch error:', studentError);
        setError('Student record not found');
        return;
      }

      setStudentData(student);

      // Fetch both payment types
      if (student?.sid) {
        await Promise.all([
          fetchSemesterPayments(student.sid),
          fetchOtherPayments(student.sid)
        ]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSemesterPayments = async (studentSID) => {
    try {
      const { data, error } = await supabase
        .from('semester_payment')
        .select('*')
        .eq('sid', studentSID)
        .order('year', { ascending: false })
        .order('semester', { ascending: false });

      if (error) {
        console.error('Error fetching semester payments:', error);
        return;
      }

      setSemesterPayments(data || []);
    } catch (error) {
      console.error('Error fetching semester payments:', error);
    }
  };

  const fetchOtherPayments = async (studentSID) => {
    try {
      const { data, error } = await supabase
        .from('other_payment')
        .select(`
          *,
          course(
            cid,
            cname
          )
        `)
        .eq('sid', studentSID)
        .order('year', { ascending: false })
        .order('semester', { ascending: false });

      if (error) {
        console.error('Error fetching other payments:', error);
        return;
      }

      setOtherPayments(data || []);
    } catch (error) {
      console.error('Error fetching other payments:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return '#28a745'; // Green
      case 'pending':
        return '#ffc107'; // Yellow
      case 'overdue':
        return '#dc3545'; // Red
      default:
        return '#6c757d'; // Gray
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <DashboardNavBar />
        <div className="dashboard" style={{ marginTop: '60px' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>Loading payment details...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <DashboardNavBar />
        <div className="dashboard" style={{ marginTop: '60px' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>Error: {error}</h2>
            <button 
              onClick={() => navigate('/student-dashboard')}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Payment Details</h1>
            {studentData && (
              <p style={{ color: '#666', margin: '5px 0 0 0' }}>
                Student: {studentData.f_name} {studentData.l_name} ({studentData.sid})
              </p>
            )}
          </div>
          <button 
            onClick={() => navigate('/student-dashboard')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px' }}>
          
          {/* Semester Payments Section */}
          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ color: '#007bff', marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
              📚 Semester Payments
            </h2>
            
            {semesterPayments.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment ID</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Academic Year</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Semester</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesterPayments.map((payment, index) => (
                      <tr key={payment.paymentid} style={{ 
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
                      >
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                          {payment.paymentid}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          {payment.year}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          Semester {payment.semester}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(payment.amount)}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: getStatusColor(payment.status)
                          }}>
                            {payment.status || 'Unknown'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          {payment.date ? new Date(payment.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                color: '#666'
              }}>
                <h4>No semester payments found</h4>
                <p>Your semester payment records will appear here once available.</p>
              </div>
            )}
          </div>

          {/* Other Payments Section */}
          <div>
            <h2 style={{ color: '#28a745', marginBottom: '20px', borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>
              📋 Other Payments (Repeat Module / Prorata)
            </h2>
            
            {otherPayments.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment ID</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Academic Year</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Semester</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment Type</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment Date</th>
                      <th style={{ padding: '15px 12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Course</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherPayments.map((payment, index) => (
                      <tr key={payment.paymentid} style={{ 
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f5e8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
                      >
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                          {payment.paymentid}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          {payment.year}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          Semester {payment.semester}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(payment.amount)}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {payment.paymenttype || 'Other'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: getStatusColor(payment.status)
                          }}>
                            {payment.status || 'Unknown'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          {payment.date ? new Date(payment.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>
                              {payment.cid || 'N/A'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {payment.course?.cname || 'Course name not available'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                color: '#666'
              }}>
                <h4>No other payments found</h4>
                <p>Your repeat module and prorata payment records will appear here once available.</p>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div style={{ 
            marginTop: '40px', 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ color: '#495057', marginBottom: '15px' }}>Payment Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                  {semesterPayments.length}
                </div>
                <div style={{ color: '#666' }}>Semester Payments</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {otherPayments.length}
                </div>
                <div style={{ color: '#666' }}>Other Payments</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                  {formatCurrency(
                    [...semesterPayments, ...otherPayments]
                      .reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0)
                  )}
                </div>
                <div style={{ color: '#666' }}>Total Amount</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails; 