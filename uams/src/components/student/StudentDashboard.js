import React, { useState, useEffect } from 'react';
import DashboardNavBar from '../DashboardNavBar';
import supabase from '../../lib/supabaseClient';
import { validateAttendanceEligibility, getClientIP, getUserAgent } from '../../lib/networkUtils';

const StudentDashboard = () => {
  const [studentData, setStudentData] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [error, setError] = useState('');
  
  // Inquiry form state
  const [inquiryForm, setInquiryForm] = useState({
    inquiryType: '',
    message: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Attendance state
  const [availableLectures, setAvailableLectures] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [markingAttendance, setMarkingAttendance] = useState(false);

  // Payment details state
  const [semesterPayments, setSemesterPayments] = useState([]);
  const [otherPayments, setOtherPayments] = useState([]);
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false);

  useEffect(() => {
    fetchStudentData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch detailed payments when payments tab becomes active
    if (activeTab === 'payments' && studentData?.sid && semesterPayments.length === 0 && otherPayments.length === 0) {
      fetchDetailedPayments(studentData.sid);
    }
  }, [activeTab, studentData, semesterPayments.length, otherPayments.length]);

  const fetchStudentData = async () => {
    try {
      // Get user session
      const userSession = JSON.parse(localStorage.getItem('userSession'));
      if (!userSession) {
        setError('No active session found');
        return;
      }

      console.log('Fetching data for user:', userSession.username);

      // Fetch student personal details
      // Username in login table corresponds to user_name in student table
      console.log('Looking for student with user_name:', userSession.username);
      
      let studentRecord = null;
      
      // First, let's check what students exist in the table
      const { data: allStudents, error: allError } = await supabase
        .from('student')
        .select('sid, user_name, f_name, l_name, email')
        .limit(5);
      
      console.log('Sample students in database:', allStudents);
      console.log('All students error:', allError);
      
      // Find student by user_name (without joins for now)
      const { data: student, error: studentError } = await supabase
        .from('student')
        .select('*')
        .eq('user_name', userSession.username)
        .single();

      console.log('User_name lookup result:', { data: student, error: studentError });

      if (studentError) {
        console.error('Student fetch error:', studentError);
        setError(`Student record not found. Searched for user_name: "${userSession.username}". Check console for details.`);
        return;
      } else {
        studentRecord = student;
      }

      setStudentData(studentRecord);

      // Fetch other data using the student's SID
      if (studentRecord?.sid) {
        await fetchExamResults(studentRecord.sid);
        await fetchInquiries(studentRecord.sid);
        await fetchAttendanceData(studentRecord.sid);
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
      setError('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };



  // fetchPaymentData function removed - now using fetchDetailedPayments instead
  // eslint-disable-next-line no-unused-vars
  const fetchPaymentData_UNUSED = async (studentSID) => {
    try {
      console.log('=== FETCHING PAYMENT DATA WITH 3-TABLE JOIN ===');
      console.log('Student SID:', studentSID);
      
      // Method 1: Try complete 3-table JOIN (student_payment -> payment -> course)
      console.log('Attempting 3-table JOIN: student_payment -> payment -> course');
      const { data: fullJoinData, error: fullJoinError } = await supabase
        .from('student_payment')
        .select(`
          sid,
          paymentid,
          payment!inner(
            paymentid,
            year,
            semester,
            amount,
            paymenttype,
            status,
            date,
            cid,
            course(
              cid,
              cname
            )
          )
        `)
        .eq('sid', studentSID);

      console.log('3-table JOIN result:', { data: fullJoinData, error: fullJoinError });

      if (fullJoinError) {
        console.log('3-table JOIN failed, trying 2-table JOIN...');
        
        // Method 2: Try 2-table JOIN (student_payment -> payment)
        const { data: twoTableJoin, error: twoTableError } = await supabase
          .from('student_payment')
          .select(`
            sid,
            paymentid,
            payment!inner(
              paymentid,
              year,
              semester,
              amount,
              paymenttype,
              status,
              date,
              cid
            )
          `)
          .eq('sid', studentSID);

        console.log('2-table JOIN result:', { data: twoTableJoin, error: twoTableError });

        if (twoTableError) {
          console.log('2-table JOIN failed, skipping payment data fetch...');
          // Manual fetch function removed - now using fetchDetailedPayments instead
        } else {
          console.log('2-table JOIN successful, now fetching course data separately...');
          
          // Extract payment data
          const payments = twoTableJoin.map(item => item.payment);
          console.log('Extracted payments from 2-table JOIN:', payments);
          
          // Get unique CIDs for course lookup
          const cids = [...new Set(payments.map(p => p.cid).filter(cid => cid))];
          console.log('CIDs to fetch from course table:', cids);
          
          if (cids.length > 0) {
            // Fetch course data
                         const { data: courses, error: courseError } = await supabase
               .from('course')
               .select('cid, cname')
               .in('cid', cids);
            
            console.log('Course data:', { data: courses, error: courseError });
            
            // Combine payment and course data
                           const paymentsWithCourses = payments.map(payment => {
                 const course = courses?.find(c => c.cid === payment.cid);
                 return {
                   ...payment,
                   cname: course?.cname || null
                 };
               });
            
            console.log('Final payment data with course info:', paymentsWithCourses);
          } else {
            console.log('No CIDs found, setting payment data without course info');
          }
        }
      } else {
        console.log('3-table JOIN successful! Processing results...');
        
        // Process the 3-table JOIN results
        const paymentsWithCourses = fullJoinData.map(item => {
          const payment = item.payment;
          const course = payment.course;
          
                   return {
           paymentid: payment.paymentid,
           year: payment.year,
           semester: payment.semester,
           amount: payment.amount,
           paymenttype: payment.paymenttype,
           status: payment.status,
           date: payment.date,
           cid: payment.cid,
           cname: course?.cname || null
         };
        });
        
        console.log('Final payment data from 3-table JOIN:', paymentsWithCourses);
      }
      
    } catch (error) {
      console.error('Error in fetchPaymentData:', error);
      // Fallback to manual approach
      // Function removed
    }
  };

  // fetchPaymentDataManually function removed - now using fetchDetailedPayments instead  
  // eslint-disable-next-line no-unused-vars
  const fetchPaymentDataManually_UNUSED = async (studentSID) => {
    try {
      console.log('=== MANUAL APPROACH: Fetching tables separately ===');
      
      // Step 1: Get student payments
      const { data: studentPayments, error: spError } = await supabase
        .from('student_payment')
        .select('*')
        .eq('sid', studentSID);
      
      console.log('Student payments:', { data: studentPayments, error: spError });
      
      if (spError || !studentPayments || studentPayments.length === 0) {
        console.log('No student payments found');
        return;
      }
      
      // Step 2: Get payment details
      const paymentIds = studentPayments.map(sp => sp.paymentid);
      const { data: payments, error: pError } = await supabase
        .from('payment')
        .select('*')
        .in('paymentid', paymentIds);
      
      console.log('Payment details:', { data: payments, error: pError });
      
      if (pError || !payments) {
        console.log('Error fetching payment details');
        return;
      }
      
      // Step 3: Get course details for payments with CID
      const cids = [...new Set(payments.map(p => p.cid).filter(cid => cid))];
      console.log('Course IDs to fetch:', cids);
      
      let courses = [];
      if (cids.length > 0) {
        const { data: courseData, error: cError } = await supabase
          .from('course')
          .select('cid, cname')
          .in('cid', cids);
        
        console.log('Course details:', { data: courseData, error: cError });
        courses = courseData || [];
      }
      
      // Step 4: Combine all data
             const paymentsWithCourses = payments.map(payment => {
         const course = courses.find(c => c.cid === payment.cid);
         return {
           ...payment,
           cname: course?.cname || null
         };
       });
      
      console.log('Final manual approach result:', paymentsWithCourses);
      
    } catch (error) {
      console.error('Error in manual fetch:', error);
    }
  };


  const fetchExamResults = async (studentSID) => {
    try {
      // First try with basic columns (no joins)
      const { data, error } = await supabase
        .from('examresult')
        .select('*')
        .eq('sid', studentSID);

      if (error) {
        console.error('Exam results fetch error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Table/query details:', 'examresult table basic query');
        return;
      }

      console.log('Exam results fetched successfully:', data);
      setExamResults(data || []);
    } catch (error) {
      console.error('Error fetching exam results:', error);
    }
  };

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

  const fetchAttendanceData = async (studentSID) => {
    try {
      setAttendanceLoading(true);
      
      // Fetch available lectures (today and upcoming lectures)
      const today = new Date().toISOString().split('T')[0];
      const { data: lectures, error: lecturesError } = await supabase
        .from('lecture')
        .select(`
          *,
          course(cid, cname)
        `)
        .gte('lecture_date', today)
        .eq('attendance_enabled', true)
        .order('lecture_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (lecturesError) {
        console.error('Error fetching lectures:', lecturesError);
      } else {
        setAvailableLectures(lectures || []);
      }

      // Fetch student's attendance history
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          lecture(
            lecture_id,
            lecture_title,
            lecture_date,
            start_time,
            end_time,
            lecturer_name,
            location,
            course(cid, cname)
          )
        `)
        .eq('sid', studentSID)
        .order('marked_at', { ascending: false });

      if (attendanceError) {
        console.error('Error fetching attendance history:', attendanceError);
      } else {
        setAttendanceHistory(attendance || []);
      }

    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const checkNetworkStatus = async () => {
    try {
      const clientIP = await getClientIP();
      setNetworkStatus({
        clientIP: clientIP,
        checking: false,
        timestamp: new Date()
      });
    } catch (error) {
      setNetworkStatus({
        error: error.message,
        checking: false,
        timestamp: new Date()
      });
    }
  };

  const markAttendance = async (lecture) => {
    if (markingAttendance) return;
    
    setMarkingAttendance(true);
    setError('');

    try {
      // Validate attendance eligibility
      const validation = await validateAttendanceEligibility(lecture, supabase);
      
      if (!validation.canMarkAttendance) {
        setError(`Cannot mark attendance: ${validation.errors.join(', ')}`);
        return;
      }

      // Check if already marked
      const { data: existingAttendance, error: checkError } = await supabase
        .from('attendance')
        .select('attendance_id')
        .eq('sid', studentData.sid)
        .eq('lecture_id', lecture.lecture_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking existing attendance:', checkError);
        setError('Error checking existing attendance record');
        return;
      }

      if (existingAttendance) {
        setError('You have already marked attendance for this lecture');
        return;
      }

      // Prepare attendance data
      const attendanceData = {
        sid: studentData.sid,
        lecture_id: lecture.lecture_id,
        ip_address: validation.networkCheck.clientIP,
        user_agent: getUserAgent(),
        location_verified: validation.locationCheck?.available || false,
        latitude: validation.locationCheck?.coordinates?.latitude || null,
        longitude: validation.locationCheck?.coordinates?.longitude || null,
        status: 'Present'
      };

      // Insert attendance record
      const { error: insertError } = await supabase
        .from('attendance')
        .insert([attendanceData])
        .select()
        .single();

      if (insertError) {
        console.error('Error marking attendance:', insertError);
        setError(`Failed to mark attendance: ${insertError.message}`);
        return;
      }

      // Success feedback
      alert(`Attendance marked successfully for ${lecture.lecture_title}!`);
      
      // Refresh attendance data
      await fetchAttendanceData(studentData.sid);

    } catch (error) {
      console.error('Error marking attendance:', error);
      setError(`Failed to mark attendance: ${error.message}`);
    } finally {
      setMarkingAttendance(false);
    }
  };

  const fetchDetailedPayments = async (studentSID) => {
    setPaymentDetailsLoading(true);
    try {
      // Fetch semester payments
      const { data: semesterData, error: semesterError } = await supabase
        .from('semester_payment')
        .select('*')
        .eq('sid', studentSID)
        .order('year', { ascending: false })
        .order('semester', { ascending: false });

      if (semesterError) {
        console.error('Error fetching semester payments:', semesterError);
      } else {
        setSemesterPayments(semesterData || []);
      }

      // Fetch other payments
      const { data: otherData, error: otherError } = await supabase
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

      if (otherError) {
        console.error('Error fetching other payments:', otherError);
      } else {
        setOtherPayments(otherData || []);
      }

    } catch (error) {
      console.error('Error fetching detailed payments:', error);
    } finally {
      setPaymentDetailsLoading(false);
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
        return '#ffc107'; // Yellow (Default: Pending)
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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

  // eslint-disable-next-line no-unused-vars
  const uploadFile = async (file, inquiryId) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `inquiry_${inquiryId}_${Date.now()}.${fileExt}`;
      const filePath = `inquiry-attachments/${fileName}`;

      console.log('Starting file upload...');
      console.log('File name:', fileName);
      console.log('File path:', filePath);
      console.log('File size:', file.size);
      console.log('File type:', file.type);

      setUploadProgress(25);

      console.log('Uploading to Supabase storage bucket: student-files');
      const { error } = await supabase.storage
        .from('student-files') // Make sure this bucket exists in Supabase
        .upload(filePath, file);

      setUploadProgress(75);

      if (error) {
        console.error('File upload error details:', error);
        console.error('Error message:', error.message);
        console.error('Error status:', error.statusCode);
        console.error('Bucket name:', 'student-files');
        console.error('File path:', filePath);
        return null;
      }

      setUploadProgress(100);
      return {
        fileName: fileName,
        filePath: filePath,
        fileSize: file.size,
        fileType: file.type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
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

      // If there's a file, upload it
      if (selectedFile && inquiryResult) {
        console.log('File upload temporarily disabled - bucket not set up yet');
        // Don't use setError for this since it's not actually an error
        alert('Inquiry submitted successfully! (File upload feature is temporarily disabled)');
        
        // TODO: Uncomment below when storage bucket is ready
        /*
        const fileInfo = await uploadFile(selectedFile, inquiryResult.inquiryid);
        
        if (fileInfo) {
          // Update the inquiry record with file information
          const { error: updateError } = await supabase
            .from('studentinquiry')
            .update({
              attachment_name: fileInfo.fileName,
              attachment_path: fileInfo.filePath,
              attachment_size: fileInfo.fileSize,
              attachment_type: fileInfo.fileType
            })
            .eq('inquiryid', inquiryResult.inquiryid);

          if (updateError) {
            console.error('Error updating inquiry with file info:', updateError);
            // Don't fail the whole process, just log the error
          }
        } else {
          setError('File upload failed, but inquiry was submitted successfully.');
        }
        */
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
      
      // Show success message (only if file upload wasn't handled above)
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



  if (loading) {
    return (
      <div className="dashboard-page">
        <DashboardNavBar />
        <div className="dashboard" style={{ marginTop: '60px' }}>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>Loading your data...</h2>
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardNavBar />
      
      <div className="dashboard" style={{ marginTop: '60px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1>Student Dashboard</h1>
        </div>

        {studentData && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px' }}>
            <h2>Welcome, {studentData.f_name} {studentData.l_name}!</h2>
            
            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ marginBottom: '30px' }}>
              <button 
                className={activeTab === 'personal' ? 'active-tab' : 'tab-button'}
                onClick={() => setActiveTab('personal')}
                style={{ padding: '10px 20px', margin: '0 5px', border: '1px solid #ccc', backgroundColor: activeTab === 'personal' ? '#007bff' : 'white', color: activeTab === 'personal' ? 'white' : 'black' }}
              >
                Personal Details
              </button>
              <button 
                className={activeTab === 'payments' ? 'active-tab' : 'tab-button'}
                onClick={() => setActiveTab('payments')}
                style={{ padding: '10px 20px', margin: '0 5px', border: '1px solid #ccc', backgroundColor: activeTab === 'payments' ? '#007bff' : 'white', color: activeTab === 'payments' ? 'white' : 'black' }}
              >
                Payment Details
              </button>
              <button 
                className={activeTab === 'results' ? 'active-tab' : 'tab-button'}
                onClick={() => setActiveTab('results')}
                style={{ padding: '10px 20px', margin: '0 5px', border: '1px solid #ccc', backgroundColor: activeTab === 'results' ? '#007bff' : 'white', color: activeTab === 'results' ? 'white' : 'black' }}
              >
                Exam Results
              </button>
              <button 
                className={activeTab === 'inquiries' ? 'active-tab' : 'tab-button'}
                onClick={() => setActiveTab('inquiries')}
                style={{ padding: '10px 20px', margin: '0 5px', border: '1px solid #ccc', backgroundColor: activeTab === 'inquiries' ? '#007bff' : 'white', color: activeTab === 'inquiries' ? 'white' : 'black' }}
              >
                Inquiries
              </button>
              <button 
                className={activeTab === 'attendance' ? 'active-tab' : 'tab-button'}
                onClick={() => {
                  setActiveTab('attendance');
                  checkNetworkStatus();
                }}
                style={{ padding: '10px 20px', margin: '0 5px', border: '1px solid #ccc', backgroundColor: activeTab === 'attendance' ? '#007bff' : 'white', color: activeTab === 'attendance' ? 'white' : 'black' }}
              >
                Attendance
              </button>
            </div>

            {/* Personal Details Tab */}
            {activeTab === 'personal' && (
              <div className="personal-details">
                <h3>Personal Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                  <div><strong>Student ID:</strong> {studentData.sid}</div>
                  <div><strong>Full Name:</strong> {studentData.f_name} {studentData.l_name}</div>
                  <div><strong>NIC:</strong> {studentData.nic}</div>
                  <div><strong>Email:</strong> {studentData.email}</div>
                  <div><strong>Phone:</strong> {studentData.phone_no}</div>
                  <div><strong>Date of Birth:</strong> {new Date(studentData.dob).toLocaleDateString()}</div>
                  <div><strong>Gender:</strong> {studentData.gender}</div>
                  <div><strong>Address:</strong> {studentData.address}</div>
                  <div><strong>Parent Name:</strong> {studentData.parent_name}</div>
                  <div><strong>Parent Contact:</strong> {studentData.parent_contact_no}</div>
                  <div><strong>Faculty ID:</strong> {studentData.facultyid || 'N/A'}</div>
                  <div><strong>Degree ID:</strong> {studentData.degreeid || 'N/A'}</div>
                  <div><strong>Batch:</strong> {studentData.batch}</div>
                </div>
              </div>
            )}

            {/* Payment Details Tab */}
            {activeTab === 'payments' && (
              <div className="payment-details">
                <div style={{ marginBottom: '20px' }}>
                  <h3>💳 Payment Details</h3>
                  {paymentDetailsLoading && (
                    <div style={{ color: '#666', fontStyle: 'italic', marginTop: '10px' }}>
                      ⏳ Loading payment records...
                    </div>
                  )}
                </div>
                
                {/* Detailed Payment Records */}
                <div>
                    {/* Semester Payments Section */}
                    <div style={{ marginBottom: '40px' }}>
                      <h4 style={{ color: '#007bff', marginBottom: '15px', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
                        📚 Semester Payments
                      </h4>
                      
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
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment ID</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Year</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Semester</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semesterPayments.map((payment, index) => (
                                <tr key={payment.paymentid} style={{ 
                                  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                                }}>
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
                                      padding: '4px 8px',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      color: 'white',
                                      backgroundColor: getStatusColor(payment.status)
                                    }}>
                                      {payment.status || 'Pending'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                    {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No semester payments found.</p>
                      )}
                    </div>

                    {/* Other Payments Section */}
                    <div>
                      <h4 style={{ color: '#28a745', marginBottom: '15px', borderBottom: '2px solid #28a745', paddingBottom: '5px' }}>
                        📋 Other Payments (Repeat Module / Prorata)
                      </h4>
                      
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
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment ID</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Year</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Semester</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Type</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Course</th>
                              </tr>
                            </thead>
                            <tbody>
                              {otherPayments.map((payment, index) => (
                                <tr key={payment.paymentid} style={{ 
                                  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                                }}>
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
                                      padding: '3px 6px',
                                      backgroundColor: '#e9ecef',
                                      borderRadius: '3px',
                                      fontSize: '11px',
                                      fontWeight: 'bold'
                                    }}>
                                      {payment.paymenttype || 'Other'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      color: 'white',
                                      backgroundColor: getStatusColor(payment.status)
                                    }}>
                                      {payment.status || 'Pending'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                    {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                    <div>
                                      <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                        {payment.cid || 'N/A'}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#666' }}>
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
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No other payments found.</p>
                      )}
                    </div>

                    {/* Payment Summary */}
                    <div style={{ 
                      marginTop: '30px', 
                      padding: '15px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <h5 style={{ color: '#495057', marginBottom: '10px' }}>Payment Summary</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                            {formatCurrency(
                              semesterPayments.reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0)
                            )}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Total Semester Fees</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                            {formatCurrency(
                              otherPayments.reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0)
                            )}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Total Other Payments</div>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            )}

            {/* Exam Results Tab */}
            {activeTab === 'results' && (
              <div className="exam-results">
                <h3>Exam Results</h3>
                {examResults.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Result ID</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Exam ID</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Marks</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Grade</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>GPA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examResults.map((result, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{result.resultid}</td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{result.examid}</td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{result.marks}</td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                              <span style={{ fontWeight: 'bold', color: result.grade && result.grade.startsWith('A') ? 'green' : result.grade && result.grade.startsWith('F') ? 'red' : 'orange' }}>
                                {result.grade}
                              </span>
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{result.gpa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No exam results found.</p>
                )}
              </div>
            )}

            {/* Inquiries Tab */}
            {activeTab === 'inquiries' && (
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
                      <option value="Exam Results">Exam Results</option>
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
                      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                        <strong>Selected file:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
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
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Inquiry ID</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Type</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Inquiry Text</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Attachment</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Status</th>
                          <th style={{ padding: '12px', border: '1px solid #ddd' }}>Response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inquiries.map((inquiry, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{inquiry.inquiryid}</td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{inquiry.inquirytype}</td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', maxWidth: '200px' }}>
                              {inquiry.inquiry_text || 'No text provided'}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                              {inquiry.attachment_name ? (
                                <div>
                                  <span style={{ color: '#007bff', fontWeight: 'bold' }}>📎 {inquiry.attachment_name}</span>
                                  <br />
                                  <small style={{ color: '#666' }}>
                                    {inquiry.attachment_type} • {inquiry.attachment_size ? (inquiry.attachment_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
                                  </small>
                                </div>
                              ) : (
                                <span style={{ color: '#666' }}>No attachment</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                              {new Date(inquiry.inquirydate).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                              <span style={{ 
                                color: inquiry.status === 'Pending' ? 'orange' : inquiry.status === 'Resolved' ? 'green' : 'blue',
                                fontWeight: 'bold'
                              }}>
                                {inquiry.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                              {inquiry.response || 'No response yet'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No inquiries submitted yet.</p>
                )}
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="attendance-section">
                <h3>Lecture Attendance</h3>
                
                {/* Network Status */}
                <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ color: '#007bff', marginBottom: '15px' }}>Network Status</h4>
                  {networkStatus ? (
                    <div>
                      {networkStatus.clientIP ? (
                        <div>
                          <div style={{ marginBottom: '10px' }}>
                            <strong>Your IP:</strong> {networkStatus.clientIP}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            Last checked: {networkStatus.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'red' }}>
                          <strong>Error:</strong> {networkStatus.error}
                        </div>
                      )}
                      <button
                        onClick={checkNetworkStatus}
                        style={{
                          marginTop: '10px',
                          padding: '8px 16px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Refresh Network Status
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={checkNetworkStatus}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Check Network Status
                      </button>
                    </div>
                  )}
                </div>

                {/* Available Lectures */}
                <div style={{ marginBottom: '40px' }}>
                  <h4 style={{ color: '#28a745', marginBottom: '20px' }}>Available Lectures for Attendance</h4>
                  {attendanceLoading ? (
                    <p>Loading lectures...</p>
                  ) : availableLectures.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Course</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Lecture Title</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Time</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Lecturer</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Location</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableLectures.map((lecture, index) => {
                            const lectureDate = new Date(lecture.lecture_date);
                            const lectureStart = new Date(`${lecture.lecture_date}T${lecture.start_time}`);
                            const now = new Date();
                            
                            // Check if attendance window is open (15 min before to 30 min after start)
                            const allowedStart = new Date(lectureStart.getTime() - 15 * 60 * 1000);
                            const allowedEnd = new Date(lectureStart.getTime() + 30 * 60 * 1000);
                            const isAttendanceOpen = now >= allowedStart && now <= allowedEnd;
                            
                            // Check if already attended
                            const hasAttended = attendanceHistory.some(att => att.lecture_id === lecture.lecture_id);

                            return (
                              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                  {lecture.course?.cname || lecture.cid}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{lecture.lecture_title}</td>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                  {lectureDate.toLocaleDateString()}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                  {lecture.start_time} - {lecture.end_time}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{lecture.lecturer_name}</td>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{lecture.location}</td>
                                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                  {hasAttended ? (
                                    <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Attended</span>
                                  ) : isAttendanceOpen ? (
                                    <button
                                      onClick={() => markAttendance(lecture)}
                                      disabled={markingAttendance}
                                      style={{
                                        padding: '8px 16px',
                                        backgroundColor: markingAttendance ? '#ccc' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: markingAttendance ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      {markingAttendance ? 'Marking...' : 'Mark Attendance'}
                                    </button>
                                  ) : now < allowedStart ? (
                                    <span style={{ color: 'orange' }}>Not yet available</span>
                                  ) : (
                                    <span style={{ color: 'red' }}>Window closed</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No lectures available for attendance marking.</p>
                  )}
                </div>

                {/* Attendance History */}
                <div>
                  <h4 style={{ color: '#6f42c1', marginBottom: '20px' }}>My Attendance History</h4>
                  {attendanceHistory.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Course</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Lecture Title</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Time</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Marked At</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Status</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.map((attendance, index) => (
                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                {attendance.lecture?.course?.cname || attendance.lecture?.cid || 'N/A'}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                {attendance.lecture?.lecture_title || 'N/A'}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                {attendance.lecture?.lecture_date ? new Date(attendance.lecture.lecture_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                {attendance.lecture?.start_time && attendance.lecture?.end_time ? 
                                  `${attendance.lecture.start_time} - ${attendance.lecture.end_time}` : 'N/A'}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                {new Date(attendance.marked_at).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                <span style={{ 
                                  color: attendance.status === 'Present' ? 'green' : 'red',
                                  fontWeight: 'bold'
                                }}>
                                  {attendance.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                {attendance.lecture?.location || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No attendance records found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard; 