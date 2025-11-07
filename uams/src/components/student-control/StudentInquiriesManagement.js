import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';
import DashboardNavBar from '../DashboardNavBar';

const StudentInquiriesManagement = () => {
  const [inquiries, setInquiries] = useState([]);
  const [filteredInquiries, setFilteredInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Fetch all inquiries
  const fetchInquiries = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('studentinquiry')
        .select(`
          inquiryid,
          inquirytype,
          inquirydate,
          status,
          response,
          responsedate,
          sid,
          inquiry_text,
          attachment,
          student:sid (
            sid,
            f_name,
            l_name,
            email
          )
        `)
        .order('inquirydate', { ascending: false });

      if (error) {
        console.error('Error fetching inquiries:', error);
        setError('Failed to fetch inquiries: ' + error.message);
        return;
      }

      console.log('Fetched inquiries:', data);
      setInquiries(data || []);
      setFilteredInquiries(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred while fetching inquiries.');
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters
  const applyFilters = React.useCallback(() => {
    let filtered = [...inquiries];

    // Filter by inquiry type
    if (filterType !== 'All') {
      filtered = filtered.filter(inquiry => inquiry.inquirytype === filterType);
    }

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(inquiry => inquiry.status === statusFilter);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(inquiry => 
        new Date(inquiry.inquirydate) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(inquiry => 
        new Date(inquiry.inquirydate) <= new Date(endDate)
      );
    }

    setFilteredInquiries(filtered);
  }, [inquiries, filterType, statusFilter, startDate, endDate]);

  // Filter inquiries by type
  const handleFilterChange = (type) => {
    setFilterType(type);
  };

  // Filter inquiries by status
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  // Handle date filter changes
  const handleStartDateChange = (date) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
  };

  // Apply filters whenever filter values change
  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Open response modal
  const handleResponseClick = (inquiry) => {
    setSelectedInquiry(inquiry);
    setResponseText(inquiry.response || '');
    setShowResponseModal(true);
  };

  // Submit response
  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    
    if (!responseText.trim()) {
      setError('Please enter a response');
      return;
    }

    setSubmittingResponse(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('studentinquiry')
        .update({
          response: responseText.trim(),
          status: 'Solved',
          responsedate: new Date().toISOString().split('T')[0]
        })
        .eq('inquiryid', selectedInquiry.inquiryid);

      if (updateError) {
        console.error('Error updating inquiry:', updateError);
        setError('Failed to update inquiry: ' + updateError.message);
        return;
      }

      // Update local state
      const updatedInquiries = inquiries.map(inquiry => 
        inquiry.inquiryid === selectedInquiry.inquiryid 
          ? { 
              ...inquiry, 
              response: responseText.trim(), 
              status: 'Solved', 
              responsedate: new Date().toISOString().split('T')[0] 
            }
          : inquiry
      );
      
      setInquiries(updatedInquiries);
      
      // Apply current filter to updated data
      if (filterType === 'All') {
        setFilteredInquiries(updatedInquiries);
      } else {
        setFilteredInquiries(updatedInquiries.filter(inquiry => inquiry.inquirytype === filterType));
      }

      // Close modal
      setShowResponseModal(false);
      setSelectedInquiry(null);
      setResponseText('');
      
      alert('Response submitted successfully!');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred while submitting response.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Download attachment
  const handleDownloadAttachment = (inquiry) => {
    if (!inquiry.attachment) {
      alert('No attachment available');
      return;
    }

    try {
      // Convert bytea back to blob for download
      const byteArray = new Uint8Array(inquiry.attachment);
      const blob = new Blob([byteArray]);
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `inquiry_${inquiry.inquiryid}_attachment`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      alert('Error downloading attachment');
    }
  };

  // View attachment in new window
  const handleViewAttachment = (inquiry) => {
    if (!inquiry.attachment) {
      alert('No attachment available');
      return;
    }

    try {
      // Convert bytea back to blob for viewing
      const byteArray = new Uint8Array(inquiry.attachment);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        alert('Please allow pop-ups to view the attachment');
      }
      
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Error viewing attachment:', err);
      alert('Error viewing attachment');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#ffc107';
      case 'Solved': return '#28a745';
      case 'Completed': return '#28a745'; // Keep for backward compatibility
      default: return '#6c757d';
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '90px', padding: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ color: 'black', margin: 0 }}>Student Inquiries Management</h1>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '15px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {/* Filter Section */}
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '20px', color: '#007bff' }}>Filters</h3>
          
          {/* Inquiry Type Filter */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Inquiry Type:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['All', 'Personal Details', 'Payment Details', 'Exam Result', 'Other'].map(type => (
                <button
                  key={type}
                  onClick={() => handleFilterChange(type)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: filterType === type ? '#007bff' : 'white',
                    color: filterType === type ? 'white' : '#007bff',
                    border: '2px solid #007bff',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: filterType === type ? 'bold' : 'normal',
                    fontSize: '14px'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Status:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['All', 'Pending', 'Solved'].map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusFilterChange(status)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: statusFilter === status ? '#28a745' : 'white',
                    color: statusFilter === status ? 'white' : '#28a745',
                    border: '2px solid #28a745',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: statusFilter === status ? 'bold' : 'normal',
                    fontSize: '14px'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Date Range:
            </label>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#e9ecef', 
            borderRadius: '4px',
            fontSize: '14px', 
            color: '#495057',
            border: '1px solid #dee2e6'
          }}>
            <strong>Results:</strong> Showing {filteredInquiries.length} of {inquiries.length} inquiries
            {filterType !== 'All' && <span> | Type: <strong>{filterType}</strong></span>}
            {statusFilter !== 'All' && <span> | Status: <strong>{statusFilter}</strong></span>}
            {(startDate || endDate) && (
              <span> | Date: <strong>
                {startDate ? new Date(startDate).toLocaleDateString() : 'Any'} - {endDate ? new Date(endDate).toLocaleDateString() : 'Any'}
              </strong></span>
            )}
          </div>
        </div>

        {/* Inquiries List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3>Loading inquiries...</h3>
          </div>
        ) : filteredInquiries.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>Student</th>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>Inquiry</th>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>Attachment</th>
                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inquiry, index) => (
                  <tr key={inquiry.inquiryid} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <strong>#{inquiry.inquiryid}</strong>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <div>
                        <strong>{inquiry.student?.f_name} {inquiry.student?.l_name}</strong>
                        <br />
                        <small style={{ color: '#666' }}>
                          {inquiry.sid}
                          <br />
                          {inquiry.student?.email}
                        </small>
                      </div>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <span style={{ 
                        backgroundColor: '#e9ecef', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {inquiry.inquirytype}
                      </span>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', maxWidth: '250px' }}>
                      <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {inquiry.inquiry_text || 'No text provided'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {new Date(inquiry.inquirydate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <span style={{ 
                        color: getStatusColor(inquiry.status),
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        backgroundColor: `${getStatusColor(inquiry.status)}20`,
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                      {inquiry.attachment ? (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleViewAttachment(inquiry)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => handleDownloadAttachment(inquiry)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            📥 Download
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontSize: '12px' }}>No file</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => handleResponseClick(inquiry)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: inquiry.status === 'Pending' ? '#007bff' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {inquiry.status === 'Pending' ? '✏️ Respond' : '👁️ View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ color: '#666' }}>No inquiries found</h3>
            <p style={{ color: '#999' }}>
              {filterType === 'All' 
                ? 'No student inquiries have been submitted yet.' 
                : `No inquiries found for "${filterType}" type.`
              }
            </p>
          </div>
        )}

        {/* Response Modal */}
        {showResponseModal && selectedInquiry && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#007bff' }}>
                  {selectedInquiry.status === 'Pending' ? 'Respond to Inquiry' : 'View Inquiry Details'}
                </h3>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedInquiry(null);
                    setResponseText('');
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Inquiry Details */}
              <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Student:</strong> {selectedInquiry.student?.f_name} {selectedInquiry.student?.l_name} ({selectedInquiry.sid})
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Type:</strong> {selectedInquiry.inquirytype}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Date:</strong> {new Date(selectedInquiry.inquirydate).toLocaleDateString()}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Status:</strong> 
                  <span style={{ 
                    color: getStatusColor(selectedInquiry.status),
                    fontWeight: 'bold',
                    marginLeft: '10px'
                  }}>
                    {selectedInquiry.status}
                  </span>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Inquiry:</strong>
                  <div style={{ 
                    marginTop: '5px', 
                    padding: '10px', 
                    backgroundColor: 'white', 
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}>
                    {selectedInquiry.inquiry_text || 'No text provided'}
                  </div>
                </div>
                {selectedInquiry.attachment && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Attachment:</strong>
                    <div style={{ marginLeft: '10px', display: 'inline-flex', gap: '10px' }}>
                      <button
                        onClick={() => handleViewAttachment(selectedInquiry)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        👁️ View File
                      </button>
                      <button
                        onClick={() => handleDownloadAttachment(selectedInquiry)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        📥 Download File
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Response Section */}
              <form onSubmit={handleSubmitResponse}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    {selectedInquiry.status === 'Pending' ? 'Your Response:' : 'Response:'}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={selectedInquiry.status === 'Pending' ? 'Enter your response to the student...' : ''}
                    rows="6"
                    readOnly={selectedInquiry.status !== 'Pending'}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px', 
                      fontSize: '14px',
                      backgroundColor: selectedInquiry.status !== 'Pending' ? '#f8f9fa' : 'white'
                    }}
                  />
                </div>

                {selectedInquiry.responsedate && (
                  <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
                    <strong>Response Date:</strong> {new Date(selectedInquiry.responsedate).toLocaleDateString()}
                  </div>
                )}

                {selectedInquiry.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResponseModal(false);
                        setSelectedInquiry(null);
                        setResponseText('');
                        setError('');
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingResponse || !responseText.trim()}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: submittingResponse || !responseText.trim() ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: submittingResponse || !responseText.trim() ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {submittingResponse ? 'Submitting...' : 'Submit Response'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentInquiriesManagement;