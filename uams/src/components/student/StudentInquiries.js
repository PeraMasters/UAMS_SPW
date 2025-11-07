import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabaseClient';

const StudentInquiries = ({ studentData }) => {
  const [inquiries, setInquiries] = useState([]);
  const [error, setError] = useState('');
  
  // Inquiry form state
  const [inquiryForm, setInquiryForm] = useState({
    inquiryType: '',
    message: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Inquiry detail modal state
  const [showInquiryDetail, setShowInquiryDetail] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [editingInquiry, setEditingInquiry] = useState(false);
  const [updatedInquiryForm, setUpdatedInquiryForm] = useState({
    inquiryType: '',
    message: ''
  });
  const [updatedFile, setUpdatedFile] = useState(null);
  const [updatingInquiry, setUpdatingInquiry] = useState(false);
  const [attachmentAction, setAttachmentAction] = useState('keep'); // 'keep', 'replace', 'remove'

  useEffect(() => {
    if (studentData?.sid) {
      fetchInquiries(studentData.sid);
    }
  }, [studentData]);

  const fetchInquiries = async (studentSID) => {
    try {
      const { data, error } = await supabase
        .from('studentinquiry')
        .select('*')
        .eq('sid', studentSID)
        .order('inquirydate', { ascending: false });

      if (error) {
        console.error('Inquiries fetch error:', error);
        return;
      }

      setInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    }
  };

  const handleViewAttachment = (attachmentData, filename = 'inquiry_attachment') => {
    if (!attachmentData) {
      alert('No attachment available');
      return;
    }

    try {
      // Convert array back to Uint8Array
      const uint8Array = new Uint8Array(attachmentData);
      
      // Create blob and view
      const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        alert('Please allow pop-ups to view the attachment');
      }
      
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('Error viewing attachment:', error);
      alert('Error viewing attachment');
    }
  };

  const handleDownloadInquiryAttachment = (attachmentData, filename = 'inquiry_attachment') => {
    if (!attachmentData) {
      alert('No attachment available');
      return;
    }

    try {
      // Convert array back to Uint8Array
      const uint8Array = new Uint8Array(attachmentData);
      
      // Create blob for download
      const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary link for download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Error downloading attachment');
    }
  };

  const handleInquiryFormChange = (e) => {
    setInquiryForm({
      ...inquiryForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only images (JPG, PNG, GIF) and documents (PDF, DOC, DOCX) are allowed');
        e.target.value = ''; // Clear the input
        return;
      }
      
      setSelectedFile(file);
      setError(''); // Clear any previous errors
    }
  };

  const submitInquiry = async (e) => {
    e.preventDefault();
    
    if (!inquiryForm.inquiryType || !inquiryForm.message.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSubmittingInquiry(true);
    setError('');
    setUploadProgress(0);

    try {
      // Prepare the inquiry data (SERIAL inquiryid will auto-generate)
      let inquiryData = {
        inquirytype: inquiryForm.inquiryType,
        inquiry_text: inquiryForm.message, // Store the inquiry message
        inquirydate: new Date().toISOString().split('T')[0], // Today's date
        status: 'Pending',
        response: null,
        sid: studentData.sid
      };
      
      console.log('Attempting to insert inquiry data (auto-generated ID):', inquiryData);
      
      // Insert the inquiry (SERIAL will auto-generate inquiryid)
      let { data: inquiryResult, error: inquiryError } = await supabase
        .from('studentinquiry')
        .insert([inquiryData])
        .select()
        .single();

      // If inquiry_text column doesn't exist, try without it
      if (inquiryError && inquiryError.message.includes('inquiry_text')) {
        console.log('inquiry_text column not found, trying basic data without inquiry_text...');
        inquiryData = {
          inquirytype: inquiryForm.inquiryType,
          inquirydate: new Date().toISOString().split('T')[0], // Today's date
          status: 'Pending',
          response: null,
          sid: studentData.sid
        };
        
        console.log('Attempting to insert basic inquiry data:', inquiryData);
        
        const result = await supabase
          .from('studentinquiry')
          .insert([inquiryData])
          .select()
          .single();
          
        inquiryResult = result.data;
        inquiryError = result.error;
      }

      if (inquiryError) {
        console.error('Inquiry submission error details:', inquiryError);
        console.error('Error message:', inquiryError.message);
        console.error('Error code:', inquiryError.code);
        console.error('Error details:', inquiryError.details);
        setError(`Failed to submit inquiry: ${inquiryError.message}`);
        return;
      }

      // If there's a file, upload it as bytea
      if (selectedFile && inquiryResult) {
        try {
          setUploadProgress(25);
          
          // Convert file to base64 for bytea storage
          const fileReader = new FileReader();
          const fileData = await new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = () => reject(fileReader.error);
            fileReader.readAsArrayBuffer(selectedFile);
          });
          
          setUploadProgress(75);
          
          // Update the inquiry record with file data as bytea
          const { error: updateError } = await supabase
            .from('studentinquiry')
            .update({
              attachment: fileData
            })
            .eq('inquiryid', inquiryResult.inquiryid);

          setUploadProgress(100);

          if (updateError) {
            console.error('Error updating inquiry with file:', updateError);
            setError('File upload failed, but inquiry was submitted successfully.');
          } else {
            console.log('File uploaded successfully as bytea');
            alert('Inquiry submitted successfully with attachment!');
          }
        } catch (fileError) {
          console.error('File processing error:', fileError);
          setError('File upload failed, but inquiry was submitted successfully.');
        }
      }

      // Reset form
      setInquiryForm({
        inquiryType: '',
        message: ''
      });
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

      // Refresh inquiries
      await fetchInquiries(studentData.sid);
      
      // Show success message if no file was attached
      if (!selectedFile) {
        alert('Inquiry submitted successfully!');
      }

    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setError('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmittingInquiry(false);
      setUploadProgress(0);
    }
  };

  // Handle inquiry detail view
  const handleInquiryDetail = (inquiry) => {
    setSelectedInquiry(inquiry);
    setUpdatedInquiryForm({
      inquiryType: inquiry.inquirytype,
      message: inquiry.inquiry_text || ''
    });
    setEditingInquiry(false);
    setUpdatedFile(null);
    setAttachmentAction('keep');
    setShowInquiryDetail(true);
  };

  // Handle inquiry edit mode
  const handleEditInquiry = () => {
    if (selectedInquiry.status === 'Pending') {
      setEditingInquiry(true);
    }
  };

  // Handle updated inquiry form change
  const handleUpdatedInquiryFormChange = (e) => {
    const { name, value } = e.target;
    setUpdatedInquiryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle updated file change
  const handleUpdatedFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setUpdatedFile(file);
      setError('');
    }
  };

  // Submit updated inquiry
  const handleUpdateInquiry = async (e) => {
    e.preventDefault();
    
    if (!updatedInquiryForm.inquiryType || !updatedInquiryForm.message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (attachmentAction === 'replace' && !updatedFile) {
      setError('Please select a file to upload or choose a different attachment option');
      return;
    }

    setUpdatingInquiry(true);
    setError('');

    try {
      // Update inquiry data
      const updateData = {
        inquirytype: updatedInquiryForm.inquiryType,
        inquiry_text: updatedInquiryForm.message.trim()
      };

      const { error: updateError } = await supabase
        .from('studentinquiry')
        .update(updateData)
        .eq('inquiryid', selectedInquiry.inquiryid);

      if (updateError) {
        console.error('Error updating inquiry:', updateError);
        setError('Failed to update inquiry: ' + updateError.message);
        return;
      }

      // Handle attachment actions
      if (attachmentAction === 'replace' && updatedFile) {
        try {
          // Convert file to ArrayBuffer for bytea storage
          const fileReader = new FileReader();
          const fileData = await new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = () => reject(fileReader.error);
            fileReader.readAsArrayBuffer(updatedFile);
          });

          // Update the inquiry with new file data
          const { error: fileUpdateError } = await supabase
            .from('studentinquiry')
            .update({
              attachment: fileData
            })
            .eq('inquiryid', selectedInquiry.inquiryid);

          if (fileUpdateError) {
            console.error('Error updating file:', fileUpdateError);
            setError('File update failed, but inquiry text was updated successfully.');
          }
        } catch (fileError) {
          console.error('File processing error:', fileError);
          setError('File update failed, but inquiry text was updated successfully.');
        }
      } else if (attachmentAction === 'remove') {
        try {
          // Remove the attachment by setting it to null
          const { error: removeFileError } = await supabase
            .from('studentinquiry')
            .update({
              attachment: null
            })
            .eq('inquiryid', selectedInquiry.inquiryid);

          if (removeFileError) {
            console.error('Error removing file:', removeFileError);
            setError('File removal failed, but inquiry text was updated successfully.');
          }
        } catch (removeError) {
          console.error('File removal error:', removeError);
          setError('File removal failed, but inquiry text was updated successfully.');
        }
      }
      // If attachmentAction === 'keep', do nothing with the attachment

      // Update local state
      const updatedInquiries = inquiries.map(inquiry => 
        inquiry.inquiryid === selectedInquiry.inquiryid 
          ? { 
              ...inquiry, 
              inquirytype: updatedInquiryForm.inquiryType,
              inquiry_text: updatedInquiryForm.message.trim(),
              attachment: attachmentAction === 'remove' ? null : 
                         attachmentAction === 'replace' && updatedFile ? updatedFile : 
                         inquiry.attachment
            }
          : inquiry
      );
      
      setInquiries(updatedInquiries);

      // Update selected inquiry for modal display
      setSelectedInquiry(prev => ({
        ...prev,
        inquirytype: updatedInquiryForm.inquiryType,
        inquiry_text: updatedInquiryForm.message.trim()
      }));

      setEditingInquiry(false);
      setUpdatedFile(null);
      setAttachmentAction('keep');
      
      alert('Inquiry updated successfully!');
      
      // Refresh inquiries from database
      await fetchInquiries(studentData.sid);
      
    } catch (error) {
      console.error('Error updating inquiry:', error);
      setError('Failed to update inquiry. Please try again.');
    } finally {
      setUpdatingInquiry(false);
    }
  };

  // Close inquiry detail modal
  const closeInquiryDetail = () => {
    setShowInquiryDetail(false);
    setSelectedInquiry(null);
    setEditingInquiry(false);
    setUpdatedInquiryForm({
      inquiryType: '',
      message: ''
    });
    setUpdatedFile(null);
    setAttachmentAction('keep');
    setError('');
  };

  return (
    <div className="inquiries-section">
      <h3>Submit New Inquiry</h3>
      <form onSubmit={submitInquiry} style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Inquiry Type:</label>
          <select
            name="inquiryType"
            value={inquiryForm.inquiryType}
            onChange={handleInquiryFormChange}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          >
            <option value="">Select inquiry type...</option>
            <option value="Personal Details">Personal Details</option>
            <option value="Payment Details">Payment Details</option>
            <option value="Exam Result">Exam Result</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Your Inquiry:</label>
          <textarea
            name="message"
            value={inquiryForm.message}
            onChange={handleInquiryFormChange}
            required
            rows="5"
            placeholder="Please describe your inquiry in detail..."
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', resize: 'vertical' }}
          ></textarea>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Attach File (Optional):</label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
          <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
            Allowed: Images (JPG, PNG, GIF), Documents (PDF, DOC, DOCX). Max size: 10MB
          </small>
          {selectedFile && (
            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#4caf50', fontSize: '18px' }}>📎</span>
                <div>
                  <strong style={{ color: '#2e7d32' }}>File selected:</strong> {selectedFile.name}
                  <br />
                  <small style={{ color: '#666' }}>
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB | Type: {selectedFile.type || 'Unknown'}
                  </small>
                </div>
              </div>
            </div>
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: '20px',
                    backgroundColor: '#007bff',
                    transition: 'width 0.3s ease'
                  }}
                ></div>
              </div>
              <small>Uploading... {uploadProgress}%</small>
            </div>
          )}
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '12px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submittingInquiry}
          style={{
            padding: '12px 30px',
            backgroundColor: submittingInquiry ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: submittingInquiry ? 'not-allowed' : 'pointer'
          }}
        >
          {submittingInquiry ? 'Submitting...' : 'Submit Inquiry'}
        </button>
      </form>

      <h3>My Inquiries</h3>
      {inquiries.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Type</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Inquiry</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Status</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Attachment</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry, index) => (
                <tr key={index} style={{ 
                  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }} 
                onClick={() => handleInquiryDetail(inquiry)}
                onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#e7f3ff'}
                onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
                >
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <strong>#{inquiry.inquiryid}</strong>
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
                  <td style={{ padding: '12px', border: '1px solid #ddd', maxWidth: '200px' }}>
                    <div style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap'
                    }}>
                      {inquiry.inquiry_text || 'No text provided'}
                    </div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {new Date(inquiry.inquirydate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <span style={{ 
                      color: inquiry.status === 'Pending' ? '#ffc107' : (inquiry.status === 'Completed' || inquiry.status === 'Solved') ? '#28a745' : '#6c757d',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      backgroundColor: inquiry.status === 'Pending' ? '#fff3cd' : (inquiry.status === 'Completed' || inquiry.status === 'Solved') ? '#d4edda' : '#e2e3e5',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {inquiry.attachment ? (
                      <span style={{ 
                        color: '#28a745', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        backgroundColor: '#d4edda',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #c3e6cb'
                      }}>
                        📎 Uploaded
                      </span>
                    ) : (
                      <span style={{ color: '#999', fontSize: '12px' }}>No file</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleInquiryDetail(inquiry)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#6f42c1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      📋 Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No inquiries submitted yet.</p>
      )}

      {/* Inquiry Detail Modal */}
      {showInquiryDetail && selectedInquiry && (
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
            maxWidth: '700px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, color: '#6f42c1' }}>
                📋 Inquiry Details #{selectedInquiry.inquiryid}
              </h3>
              <button
                onClick={closeInquiryDetail}
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

            {/* Error Display */}
            {error && (
              <div style={{ 
                backgroundColor: '#f8d7da', 
                color: '#721c24', 
                padding: '12px', 
                borderRadius: '5px', 
                marginBottom: '20px',
                border: '1px solid #f5c6cb'
              }}>
                {error}
              </div>
            )}

            {/* Inquiry Information */}
            <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <strong>Type:</strong> 
                  <span style={{ 
                    marginLeft: '10px',
                    backgroundColor: '#e9ecef', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {selectedInquiry.inquirytype}
                  </span>
                </div>
                <div>
                  <strong>Date:</strong> {new Date(selectedInquiry.inquirydate).toLocaleDateString()}
                </div>
                <div>
                  <strong>Status:</strong> 
                  <span style={{ 
                    marginLeft: '10px',
                    color: selectedInquiry.status === 'Pending' ? '#ffc107' : (selectedInquiry.status === 'Completed' || selectedInquiry.status === 'Solved') ? '#28a745' : '#6c757d',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    backgroundColor: selectedInquiry.status === 'Pending' ? '#fff3cd' : (selectedInquiry.status === 'Completed' || selectedInquiry.status === 'Solved') ? '#d4edda' : '#e2e3e5',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {selectedInquiry.status}
                  </span>
                </div>
                <div>
                  <strong>Response Date:</strong> {selectedInquiry.responsedate ? new Date(selectedInquiry.responsedate).toLocaleDateString() : 'Not responded yet'}
                </div>
              </div>
              
              {/* Attachment Info */}
              {selectedInquiry.attachment && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>Attachment:</strong>
                  <div style={{ marginLeft: '10px', display: 'inline-flex', gap: '10px', marginTop: '5px' }}>
                    <button
                      onClick={() => handleViewAttachment(selectedInquiry.attachment, `inquiry_${selectedInquiry.inquiryid}_attachment`)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      👁️ View File
                    </button>
                    <button
                      onClick={() => handleDownloadInquiryAttachment(selectedInquiry.attachment, `inquiry_${selectedInquiry.inquiryid}_attachment`)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📥 Download File
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Inquiry Content Form */}
            <form onSubmit={handleUpdateInquiry}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Inquiry Type:
                </label>
                <select
                  name="inquiryType"
                  value={updatedInquiryForm.inquiryType}
                  onChange={handleUpdatedInquiryFormChange}
                  disabled={!editingInquiry || selectedInquiry.status !== 'Pending'}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px', 
                    fontSize: '14px',
                    backgroundColor: (!editingInquiry || selectedInquiry.status !== 'Pending') ? '#f8f9fa' : 'white'
                  }}
                >
                  <option value="Personal Details">Personal Details</option>
                  <option value="Payment Details">Payment Details</option>
                  <option value="Exam Result">Exam Result</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Your Inquiry:
                </label>
                <textarea
                  name="message"
                  value={updatedInquiryForm.message}
                  onChange={handleUpdatedInquiryFormChange}
                  rows="6"
                  readOnly={!editingInquiry || selectedInquiry.status !== 'Pending'}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px', 
                    fontSize: '14px',
                    backgroundColor: (!editingInquiry || selectedInquiry.status !== 'Pending') ? '#f8f9fa' : 'white',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Attachment Management (only in edit mode for pending inquiries) */}
              {editingInquiry && selectedInquiry.status === 'Pending' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>
                    Attachment Options:
                  </label>
                  
                  {/* Current Attachment Status */}
                  {selectedInquiry.attachment && (
                    <div style={{ 
                      marginBottom: '15px', 
                      padding: '12px', 
                      backgroundColor: '#e8f4fd', 
                      border: '1px solid #bee5eb', 
                      borderRadius: '6px' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ color: '#0c5460', fontWeight: 'bold' }}>📎 Current Attachment:</span>
                        <button
                          type="button"
                          onClick={() => handleViewAttachment(selectedInquiry.attachment, `inquiry_${selectedInquiry.inquiryid}_attachment`)}
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
                          type="button"
                          onClick={() => handleDownloadInquiryAttachment(selectedInquiry.attachment, `inquiry_${selectedInquiry.inquiryid}_attachment`)}
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
                    </div>
                  )}

                  {/* Attachment Action Options */}
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="attachmentAction"
                          value="keep"
                          checked={attachmentAction === 'keep'}
                          onChange={(e) => setAttachmentAction(e.target.value)}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontWeight: attachmentAction === 'keep' ? 'bold' : 'normal' }}>
                          {selectedInquiry.attachment ? '📎 Keep existing attachment' : '📋 No attachment (keep as is)'}
                        </span>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="attachmentAction"
                          value="replace"
                          checked={attachmentAction === 'replace'}
                          onChange={(e) => setAttachmentAction(e.target.value)}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontWeight: attachmentAction === 'replace' ? 'bold' : 'normal' }}>
                          {selectedInquiry.attachment ? '🔄 Replace with new file' : '📎 Add new attachment'}
                        </span>
                      </label>
                      
                      {selectedInquiry.attachment && (
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="attachmentAction"
                            value="remove"
                            checked={attachmentAction === 'remove'}
                            onChange={(e) => setAttachmentAction(e.target.value)}
                            style={{ marginRight: '8px' }}
                          />
                          <span style={{ 
                            fontWeight: attachmentAction === 'remove' ? 'bold' : 'normal',
                            color: attachmentAction === 'remove' ? '#dc3545' : 'inherit'
                          }}>
                            🗑️ Remove attachment
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* File Upload (only when replacing) */}
                  {attachmentAction === 'replace' && (
                    <div style={{ marginTop: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Select New File:
                      </label>
                      <input
                        type="file"
                        onChange={handleUpdatedFileChange}
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                        Allowed: Images (JPG, PNG, GIF), Documents (PDF, DOC, DOCX). Max size: 10MB
                      </small>
                      {updatedFile && (
                        <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#4caf50', fontSize: '16px' }}>📎</span>
                            <div>
                              <strong style={{ color: '#2e7d32' }}>New file selected:</strong> {updatedFile.name}
                              <br />
                              <small style={{ color: '#666' }}>
                                Size: {(updatedFile.size / 1024 / 1024).toFixed(2)} MB | Type: {updatedFile.type || 'Unknown'}
                              </small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Summary */}
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '10px', 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}>
                    <strong>Action:</strong> {
                      attachmentAction === 'keep' 
                        ? (selectedInquiry.attachment ? 'Current attachment will be kept' : 'No attachment will be added')
                        : attachmentAction === 'replace' 
                          ? (updatedFile ? `Will ${selectedInquiry.attachment ? 'replace' : 'add'} attachment with: ${updatedFile.name}` : 'Please select a file to upload')
                          : 'Current attachment will be removed'
                    }
                  </div>
                </div>
              )}

              {/* Response Section (if available) */}
              {selectedInquiry.response && (
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#28a745' }}>
                    Admin Response:
                  </label>
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#d4edda', 
                    border: '1px solid #c3e6cb', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {selectedInquiry.response}
                  </div>
                  <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                    Responded on: {selectedInquiry.responsedate ? new Date(selectedInquiry.responsedate).toLocaleDateString() : 'Unknown'}
                  </small>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeInquiryDetail}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                
                {selectedInquiry.status === 'Pending' && !editingInquiry && (
                  <button
                    type="button"
                    onClick={handleEditInquiry}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ffc107',
                      color: '#212529',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✏️ Edit Inquiry
                  </button>
                )}
                
                {editingInquiry && selectedInquiry.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingInquiry(false)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Edit
                    </button>
                    <button
                      type="submit"
                      disabled={updatingInquiry}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: updatingInquiry ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: updatingInquiry ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {updatingInquiry ? 'Updating...' : '💾 Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentInquiries;

