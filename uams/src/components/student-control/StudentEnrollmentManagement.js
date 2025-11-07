import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavBar from '../DashboardNavBar';
import supabase from '../../lib/supabaseClient';

const StudentEnrollmentManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('semester');
  const [semesterStudents, setSemesterStudents] = useState([]);
  const [prorataRepeatStudents, setProrataRepeatStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    year: '',
    semester: '',
    faculty: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // Fetch semester enrolled students
  const fetchSemesterStudents = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching semester students...');
      const { data, error } = await supabase
        .from('semester_payment')
        .select(`
          paymentid,
          sid,
          year,
          semester,
          amount,
          status,
          date,
          facultyid,
          degreeid,
          attachment,
          student:sid (
            sid,
            f_name,
            l_name,
            nic
          ),
          faculty:facultyid (
            facultyid,
            fname
          ),
          degree:degreeid (
            degreeid,
            dname
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching semester students:', error);
        setError(`Failed to fetch semester students: ${error.message}`);
      } else {
        console.log('Semester students fetched:', data?.length || 0, 'records');
        setSemesterStudents(data || []);
      }
    } catch (error) {
      console.error('Error fetching semester students:', error);
      setError(`Failed to fetch semester students: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch prorata/repeat students
  const fetchProrataRepeatStudents = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching prorata/repeat students...');
      // Try to fetch with attachment, fallback without it if column doesn't exist
      let data, error;
      
      try {
        const result = await supabase
          .from('other_payment')
          .select(`
            paymentid,
            sid,
            year,
            semester,
            amount,
            paymenttype,
            status,
            date,
            cid,
            attachment,
            student:sid (
              sid,
              f_name,
              l_name,
              nic
            ),
            course:cid (
              cid,
              cname,
              credits
            )
          `)
          .order('date', { ascending: false });
        
        data = result.data;
        error = result.error;
      } catch (attachmentError) {
        // If attachment column doesn't exist, fetch without it
        console.warn('Attachment column not available, fetching without it');
        const result = await supabase
          .from('other_payment')
          .select(`
            paymentid,
            sid,
            year,
            semester,
            amount,
            paymenttype,
            status,
            date,
            cid,
            student:sid (
              sid,
              f_name,
              l_name,
              nic
            ),
            course:cid (
              cid,
              cname,
              credits
            )
          `)
          .order('date', { ascending: false });
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching prorata/repeat students:', error);
        setError(`Failed to fetch prorata/repeat students: ${error.message}`);
      } else {
        console.log('Prorata/repeat students fetched:', data?.length || 0, 'records');
        setProrataRepeatStudents(data || []);
      }
    } catch (error) {
      console.error('Error fetching prorata/repeat students:', error);
      setError(`Failed to fetch prorata/repeat students: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'semester') {
      fetchSemesterStudents();
    } else {
      fetchProrataRepeatStudents();
    }
  }, [activeTab]);

  // Filter functions
  const getFilteredData = () => {
    const data = activeTab === 'semester' ? semesterStudents : prorataRepeatStudents;
    
    return data.filter(item => {
      const student = item.student;
      const matchesSearch = searchTerm === '' || 
        student?.sid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.f_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.l_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.nic?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesYear = filters.year === '' || item.year.toString() === filters.year;
      const matchesSemester = filters.semester === '' || item.semester.toString() === filters.semester;
      const matchesStatus = filters.status === '' || item.status === filters.status;

      // Date filtering
      const itemDate = new Date(item.date);
      const matchesStartDate = filters.startDate === '' || itemDate >= new Date(filters.startDate);
      const matchesEndDate = filters.endDate === '' || itemDate <= new Date(filters.endDate);

      return matchesSearch && matchesYear && matchesSemester && matchesStatus && matchesStartDate && matchesEndDate;
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return '#28a745';
      case 'completed': return '#198754';
      case 'pending': return '#ffc107';
      case 'overdue': return '#dc3545';
      case 'cancelled': return '#6c757d';
      default: return '#007bff';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const clearFilters = () => {
    setFilters({
      year: '',
      semester: '',
      faculty: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
  };

  // Status update functions
  const handleStatusClick = (paymentId, currentStatus) => {
    setEditingStatusId(paymentId);
    setNewStatus(currentStatus);
  };

  const handleStatusUpdate = async (paymentId) => {
    try {
      const tableName = activeTab === 'semester' ? 'semester_payment' : 'other_payment';
      const { error } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq('paymentid', paymentId);

      if (error) {
        console.error('Error updating status:', error);
        alert(`Failed to update status: ${error.message}`);
      } else {
        // Refresh data
        if (activeTab === 'semester') {
          fetchSemesterStudents();
        } else {
          fetchProrataRepeatStudents();
        }
        setEditingStatusId(null);
        setNewStatus('');
        alert('Status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const handleStatusCancel = () => {
    setEditingStatusId(null);
    setNewStatus('');
  };

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px', padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => navigate('/student-control')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            ← Back to Student Control
          </button>
          
          <h1 style={{ color: '#495057', marginBottom: '10px' }}>Student Enrollment Management</h1>
          <p style={{ color: '#6c757d', marginBottom: '30px' }}>
            Manage and monitor student enrollments for semester and prorata/repeat courses
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '2px solid #dee2e6',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setActiveTab('semester')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'semester' ? '#007bff' : 'transparent',
                color: activeTab === 'semester' ? 'white' : '#007bff',
                border: 'none',
                borderBottom: activeTab === 'semester' ? '3px solid #007bff' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              📚 Semester Registered Students ({semesterStudents.length})
            </button>
            <button
              onClick={() => setActiveTab('prorata')}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === 'prorata' ? '#28a745' : 'transparent',
                color: activeTab === 'prorata' ? 'white' : '#28a745',
                border: 'none',
                borderBottom: activeTab === 'prorata' ? '3px solid #28a745' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              🔄 Prorata/Repeat Students ({prorataRepeatStudents.length})
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h5 style={{ marginBottom: '15px', color: '#495057' }}>🔍 Filters & Search</h5>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                         <input
               type="text"
               placeholder="Search by Student ID, Name, or NIC..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            
            <select
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: e.target.value})}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Years</option>
              {[1, 2, 3, 4].map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>

            <select
              value={filters.semester}
              onChange={(e) => setFilters({...filters, semester: e.target.value})}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />

            <input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear Filters
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading students...</div>
          </div>
        )}

        {/* Debug Info */}
        {!loading && (
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            fontSize: '12px',
            color: '#0066cc'
          }}>
            <strong>Debug Info:</strong> Semester Students: {semesterStudents.length} | Prorata/Repeat Students: {prorataRepeatStudents.length} | Filtered: {getFilteredData().length}
          </div>
        )}

        {/* Students Table */}
        {!loading && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ 
              backgroundColor: activeTab === 'semester' ? '#007bff' : '#28a745', 
              color: 'white', 
              padding: '15px' 
            }}>
              <h4 style={{ margin: 0 }}>
                {activeTab === 'semester' ? '📚 Semester Enrolled Students' : '🔄 Prorata/Repeat Enrolled Students'}
                <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                  ({getFilteredData().length} records)
                </span>
              </h4>
            </div>

            {getFilteredData().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
                <div style={{ fontSize: '18px', marginBottom: '5px' }}>No students found</div>
                <div style={{ fontSize: '14px' }}>
                  {searchTerm || Object.values(filters).some(f => f) 
                    ? 'Try adjusting your search or filters' 
                    : `No ${activeTab === 'semester' ? 'semester' : 'prorata/repeat'} enrollments yet`
                  }
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                     <thead>
                     <tr style={{ backgroundColor: '#f8f9fa' }}>
                       <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Payment ID</th>
                       <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Student ID</th>
                       <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Student Name</th>
                       <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>NIC</th>
                      {activeTab === 'semester' ? (
                        <>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Faculty</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Degree</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Course</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Payment Type</th>
                        </>
                      )}
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Year</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Semester</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Amount</th>
                                             <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                       <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                                         {getFilteredData().map((item, index) => (
                       <tr key={item.paymentid} style={{ 
                         backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                         borderBottom: '1px solid #dee2e6'
                       }}>
                         <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#6c757d' }}>
                           {item.paymentid || 'N/A'}
                         </td>
                         <td style={{ padding: '12px', fontWeight: 'bold', color: '#007bff' }}>
                           {item.student?.sid || 'N/A'}
                         </td>
                        <td style={{ padding: '12px' }}>
                          <div>
                                                         <div style={{ fontWeight: 'bold' }}>
                               {item.student?.f_name} {item.student?.l_name}
                             </div>
                          </div>
                        </td>
                                                 <td style={{ padding: '12px', color: '#6c757d', fontSize: '14px' }}>
                           {item.student?.nic || 'N/A'}
                         </td>
                        {activeTab === 'semester' ? (
                          <>
                            <td style={{ padding: '12px' }}>
                              {item.faculty?.fname || 'N/A'}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {item.degree?.dname || 'N/A'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px' }}>
                              <div>
                                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                  {item.course?.cid || 'N/A'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                  {item.course?.cname || 'Course name not available'}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 8px',
                                backgroundColor: item.paymenttype === 'Repeat Module' ? '#dc3545' : '#17a2b8',
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                {item.paymenttype || 'N/A'}
                              </span>
                            </td>
                          </>
                        )}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {item.year}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {item.semester}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(item.amount)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {editingStatusId === item.paymentid ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '11px'
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Completed">Completed</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              <button
                                onClick={() => handleStatusUpdate(item.paymentid)}
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '2px',
                                  fontSize: '10px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleStatusCancel}
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '2px',
                                  fontSize: '10px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span 
                              onClick={() => handleStatusClick(item.paymentid, item.status)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: 'white',
                                backgroundColor: getStatusColor(item.status),
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.opacity = '0.8';
                                e.target.style.transform = 'scale(1.05)';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.opacity = '1';
                                e.target.style.transform = 'scale(1)';
                              }}
                              title="Click to edit status"
                            >
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6c757d' }}>
                          {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Summary Statistics */}
        {!loading && getFilteredData().length > 0 && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h5 style={{ color: '#495057', marginBottom: '10px' }}>📊 Summary</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                  {getFilteredData().length}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>Total Students</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                  {formatCurrency(getFilteredData().reduce((total, item) => total + (parseFloat(item.amount) || 0), 0))}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>Total Amount</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffc107' }}>
                  {getFilteredData().filter(item => item.status === 'Pending').length}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>Pending Payments</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                  {getFilteredData().filter(item => item.status === 'Paid').length}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>Paid</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#198754' }}>
                  {getFilteredData().filter(item => item.status === 'Completed').length}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>Completed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentEnrollmentManagement;