import React, { useState, useEffect, useCallback } from 'react';
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

  // Semester payment enrollment state
  const [semesterEnrollments, setSemesterEnrollments] = useState([]);
  const [showSemesterForm, setShowSemesterForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEnrollmentId, setEditingEnrollmentId] = useState(null);
  const [semesterFormData, setSemesterFormData] = useState({
    sid: '',
    facultyid: '',
    degreeid: '',
    year: 1,
    semester: 1,
    amount: '',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    attachment: null
  });
  const [semesterFormLoading, setSemesterFormLoading] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [allDegrees, setAllDegrees] = useState([]);

  // Course enrollment state
  const [currentEnrollments, setCurrentEnrollments] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  // Other payment (repeat/prorata) enrollment state
  const [showOtherPaymentForm, setShowOtherPaymentForm] = useState(false);
  const [isOtherEditMode, setIsOtherEditMode] = useState(false);
  const [editingOtherPaymentId, setEditingOtherPaymentId] = useState(null);
  const [otherPaymentFormData, setOtherPaymentFormData] = useState({
    sid: '',
    year: 1,
    semester: 1,
    amount: '',
    paymenttype: 'Repeat Module',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    cid: '',
    attachment: null
  });
  const [otherPaymentFormLoading, setOtherPaymentFormLoading] = useState(false);
  const [availableCoursesForOther, setAvailableCoursesForOther] = useState([]);

  const fetchEnrollmentData = useCallback(async (studentSID) => {
    try {
      // Fetch current enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollment')
        .select(`
          *,
          course(
            cid,
            cname,
            credits,
            lecturer_name
          )
        `)
        .eq('sid', studentSID)
        .eq('status', 'Active')
        .order('enrollment_date', { ascending: false });

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError);
      } else {
        setCurrentEnrollments(enrollmentData || []);
      }

      // Fetch available courses for the student's faculty and degree
      if (studentData?.facultyid && studentData?.degreeid) {
        const { data: courseData, error: courseError } = await supabase
          .from('course')
          .select('*')
          .eq('facultyid', studentData.facultyid)
          .eq('degreeid', studentData.degreeid)
          .eq('status', 'Active')
          .order('cname');

        if (courseError) {
          console.error('Error fetching courses:', courseError);
        } else {
          // Filter out already enrolled courses
          const enrolledCourseIds = (enrollmentData || []).map(enrollment => enrollment.cid);
          const filteredCourses = (courseData || []).filter(course => !enrolledCourseIds.includes(course.cid));
          setAvailableCourses(filteredCourses);
        }
      }
    } catch (error) {
      console.error('Error fetching enrollment data:', error);
    }
  }, [studentData]);

  const fetchSemesterEnrollments = useCallback(async (studentSID) => {
    try {
      // Fetch semester enrollments from semester_payment table
      const { data: semesterData, error: semesterError } = await supabase
        .from('semester_payment')
        .select(`
          *,
          faculty:facultyid(fname),
          degree:degreeid(dname)
        `)
        .eq('sid', studentSID)
        .order('year', { ascending: false })
        .order('semester', { ascending: false });

      if (semesterError) {
        console.error('Error fetching semester enrollments:', semesterError);
      } else {
        setSemesterEnrollments(semesterData || []);
      }

      // Fetch faculties and degrees for form dropdowns
      await fetchFacultiesAndDegrees();

      // Pre-populate form with student data
      if (studentData) {
        setSemesterFormData(prev => ({
          ...prev,
          sid: studentData.sid || '',
          facultyid: studentData.facultyid || '',
          degreeid: studentData.degreeid || ''
        }));
      }

    } catch (error) {
      console.error('Error fetching semester enrollment data:', error);
    }
  }, [studentData]);

  const fetchFacultiesAndDegrees = async () => {
    try {
      // Fetch faculties with names for dropdown display
      const { data: facultyData, error: facultyError } = await supabase
        .from('faculty')
        .select('facultyid, fname')
        .order('fname');

      if (facultyError) {
        console.error('Error fetching faculties:', facultyError);
      } else {
        setFaculties(facultyData || []);
      }

      // Fetch degrees with names and faculty references for dropdown display
      const { data: degreeData, error: degreeError } = await supabase
        .from('degree')
        .select('degreeid, dname, facultyid')
        .order('dname');

      if (degreeError) {
        console.error('Error fetching degrees:', degreeError);
      } else {
        setAllDegrees(degreeData || []);
        setDegrees(degreeData || []);
      }
    } catch (error) {
      console.error('Error fetching faculties and degrees:', error);
    }
  };

  const fetchCoursesForOtherPayment = useCallback(async (selectedYear = null, selectedSemester = null) => {
    try {
      if (studentData?.degreeid) {
        let query = supabase
          .from('course')
          .select('cid, cname, credits, year, semester, type')
          .eq('degreeid', studentData.degreeid);

        // Filter by year and semester if provided
        if (selectedYear) {
          query = query.eq('year', selectedYear);
        }
        if (selectedSemester) {
          query = query.eq('semester', selectedSemester);
        }

        const { data: courseData, error: courseError } = await query.order('cname');

        if (courseError) {
          console.error('Error fetching courses for other payment:', courseError);
        } else {
          setAvailableCoursesForOther(courseData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching courses for other payment:', error);
    }
  }, [studentData]);

  // Filter degrees when faculty changes in form
  useEffect(() => {
    if (semesterFormData.facultyid && allDegrees.length > 0) {
      // eslint-disable-next-line eqeqeq
      const filteredDegrees = allDegrees.filter(degree => degree.facultyid == semesterFormData.facultyid);
      setDegrees(filteredDegrees);
    } else {
      setDegrees(allDegrees);
    }
  }, [semesterFormData.facultyid, allDegrees]);

  useEffect(() => {
    fetchStudentData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch detailed payments and semester enrollments when payments tab becomes active
    if (activeTab === 'payments' && studentData?.sid && semesterPayments.length === 0 && otherPayments.length === 0) {
      fetchDetailedPayments(studentData.sid);
      fetchSemesterEnrollments(studentData.sid);
    }
    
    // Fetch enrollment data when semester enrollment tab becomes active
    if (activeTab === 'enrollment' && studentData?.sid && currentEnrollments.length === 0 && availableCourses.length === 0) {
      fetchEnrollmentData(studentData.sid);
    }
  }, [activeTab, studentData, semesterPayments.length, otherPayments.length, currentEnrollments.length, availableCourses.length, fetchEnrollmentData, fetchSemesterEnrollments]);

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

      // Fetch repeat and prorata enrollments (try with attachment, fallback without)
      let otherData, otherError;
      
      try {
        // First try to fetch with attachment column
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
            course(
              cid,
              cname
            )
          `)
          .eq('sid', studentSID)
          .order('year', { ascending: false })
          .order('semester', { ascending: false });
        
        otherData = result.data;
        otherError = result.error;
      } catch (attachmentFetchError) {
        // If attachment column doesn't exist, fetch without it
        console.warn('Attachment column not available, fetching without it:', attachmentFetchError);
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
            course(
              cid,
              cname
            )
          `)
          .eq('sid', studentSID)
          .order('year', { ascending: false })
          .order('semester', { ascending: false });
        
        otherData = result.data;
        otherError = result.error;
      }

      if (otherError) {
        console.error('Error fetching repeat and prorata enrollments:', otherError);
      } else {
        setOtherPayments(otherData || []);
      }

    } catch (error) {
      console.error('Error fetching detailed payments and enrollments:', error);
    }
  };

  const handleViewAttachment = (attachmentData, filename = 'payment_slip') => {
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

  const handleSemesterFormChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('File size must be less than 10MB');
          e.target.value = ''; // Clear the input
          return;
        }
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
          alert('Only PDF, DOC, DOCX, JPG, and PNG files are allowed');
          e.target.value = ''; // Clear the input
          return;
        }
      }
      
      setSemesterFormData(prev => ({
        ...prev,
        [name]: file || null
      }));
    } else {
      setSemesterFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Handle faculty change - filter degrees
      if (name === 'facultyid') {
        if (value) {
          // eslint-disable-next-line eqeqeq
          const filteredDegrees = allDegrees.filter(degree => degree.facultyid == value);
          setDegrees(filteredDegrees);
          setSemesterFormData(prev => ({
            ...prev,
            degreeid: '' // Reset degree when faculty changes
          }));
        } else {
          setDegrees(allDegrees);
          setSemesterFormData(prev => ({
            ...prev,
            degreeid: ''
          }));
        }
      }
    }
  };

  const handleEditEnrollment = (enrollment) => {
    // Populate form with existing data
    setSemesterFormData({
      sid: enrollment.sid,
      facultyid: enrollment.facultyid.toString(),
      degreeid: enrollment.degreeid,
      year: enrollment.year,
      semester: enrollment.semester,
      amount: enrollment.amount.toString(),
      status: enrollment.status,
      date: enrollment.date,
      attachment: null // Don't pre-load attachment file
    });
    setIsEditMode(true);
    setEditingEnrollmentId(enrollment.paymentid);
    setShowSemesterForm(true);
  };

  const resetForm = () => {
    setSemesterFormData({
      sid: studentData?.sid || '',
      facultyid: studentData?.facultyid || '',
      degreeid: studentData?.degreeid || '',
      year: 1,
      semester: 1,
      amount: '',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      attachment: null
    });
    setIsEditMode(false);
    setEditingEnrollmentId(null);
    setShowSemesterForm(false);
  };

  const handleSemesterEnrollment = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!semesterFormData.sid) {
      alert('Student ID is required.');
      return;
    }
    if (!semesterFormData.facultyid) {
      alert('Please select a faculty.');
      return;
    }
    if (!semesterFormData.degreeid) {
      alert('Please select a degree.');
      return;
    }
    if (!semesterFormData.amount || parseFloat(semesterFormData.amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!semesterFormData.date) {
      alert('Please select a date.');
      return;
    }

    // Check if already enrolled for this year and semester (only for new enrollments)
    if (!isEditMode) {
      const existingEnrollment = semesterEnrollments.find(
        enrollment => enrollment.year === parseInt(semesterFormData.year) && 
                     enrollment.semester === parseInt(semesterFormData.semester) &&
                     enrollment.sid === semesterFormData.sid
      );

      if (existingEnrollment) {
        alert(`Student is already enrolled for Year ${semesterFormData.year}, Semester ${semesterFormData.semester}.`);
        return;
      }
    }

    // Get selected faculty and degree names for confirmation message
    const selectedFaculty = faculties.find(f => f.facultyid === parseInt(semesterFormData.facultyid));
    const selectedDegree = degrees.find(d => d.degreeid === semesterFormData.degreeid);
    
    const confirmationMessage = `Are you sure you want to ${isEditMode ? 'update' : 'enroll for'}:
    
• Student ID: ${semesterFormData.sid}
• Faculty: ${selectedFaculty?.fname || 'Unknown'}
• Degree: ${selectedDegree?.dname || 'Unknown'}
• Year: ${semesterFormData.year}
• Semester: ${semesterFormData.semester}
• Amount: Rs. ${parseFloat(semesterFormData.amount).toLocaleString()}
• Status: ${semesterFormData.status}`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setSemesterFormLoading(true);
    try {
      let attachmentData = null;

      // Handle file upload if attachment is provided
      if (semesterFormData.attachment) {
        const file = semesterFormData.attachment;
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        attachmentData = Array.from(uint8Array);
      }

      const enrollmentData = {
        sid: semesterFormData.sid,
        facultyid: parseInt(semesterFormData.facultyid),
        degreeid: semesterFormData.degreeid,
        year: parseInt(semesterFormData.year),
        semester: parseInt(semesterFormData.semester),
        amount: parseFloat(semesterFormData.amount),
        status: semesterFormData.status,
        date: semesterFormData.date,
        attachment: attachmentData
      };

      let error;
      if (isEditMode) {
        // Update existing enrollment
        const { error: updateError } = await supabase
          .from('semester_payment')
          .update(enrollmentData)
          .eq('paymentid', editingEnrollmentId);
        error = updateError;
      } else {
        // Insert new enrollment
        const { error: insertError } = await supabase
          .from('semester_payment')
          .insert([enrollmentData]);
        error = insertError;
      }

      if (error) {
        console.error('Semester enrollment error:', error);
        alert(`Failed to ${isEditMode ? 'update' : 'enroll for'} semester: ` + error.message);
      } else {
        alert(`Successfully ${isEditMode ? 'updated' : 'enrolled for'} the semester!`);
        resetForm();
        // Refresh enrollment data
        await fetchSemesterEnrollments(studentData.sid);
        await fetchDetailedPayments(studentData.sid);
      }
    } catch (error) {
      console.error('Error during semester enrollment:', error);
      alert('An unexpected error occurred during semester enrollment.');
    } finally {
      setSemesterFormLoading(false);
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

  const handleCourseSelection = (courseId) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleEnrollment = async () => {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to enroll.');
      return;
    }

    if (!window.confirm(`Are you sure you want to enroll in ${selectedCourses.length} course(s)?`)) {
      return;
    }

    setEnrollmentLoading(true);
    try {
      // Prepare enrollment data
      const enrollmentData = selectedCourses.map(courseId => ({
        sid: studentData.sid,
        cid: courseId,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'Active'
      }));

      // Insert enrollments
      const { error } = await supabase
        .from('enrollment')
        .insert(enrollmentData);

      if (error) {
        console.error('Enrollment error:', error);
        alert('Failed to enroll in courses: ' + error.message);
      } else {
        alert('Successfully enrolled in selected courses!');
        setSelectedCourses([]);
        // Refresh enrollment data
        await fetchEnrollmentData(studentData.sid);
      }
    } catch (error) {
      console.error('Error during enrollment:', error);
      alert('An unexpected error occurred during enrollment.');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleDropCourse = async (enrollmentId, courseName) => {
    if (!window.confirm(`Are you sure you want to drop "${courseName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('enrollment')
        .update({ status: 'Dropped' })
        .eq('enrollment_id', enrollmentId);

      if (error) {
        console.error('Drop course error:', error);
        alert('Failed to drop course: ' + error.message);
      } else {
        alert('Course dropped successfully!');
        // Refresh enrollment data
        await fetchEnrollmentData(studentData.sid);
      }
    } catch (error) {
      console.error('Error dropping course:', error);
      alert('An unexpected error occurred while dropping the course.');
    }
  };



  const handleOtherPaymentFormChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('File size must be less than 10MB');
          e.target.value = ''; // Clear the input
          return;
        }
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
          alert('Only PDF, DOC, DOCX, JPG, and PNG files are allowed');
          e.target.value = ''; // Clear the input
          return;
        }
      }
      
      setOtherPaymentFormData(prev => ({
        ...prev,
        [name]: file || null
      }));
    } else {
      setOtherPaymentFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Fetch courses when year or semester changes
      if (name === 'year' || name === 'semester') {
        const newFormData = { ...otherPaymentFormData, [name]: value };
        
        // Reset course selection when year/semester changes
        setOtherPaymentFormData(prevData => ({
          ...prevData,
          [name]: value,
          cid: '' // Clear course selection
        }));
        
        // Fetch courses for the new year/semester combination
        if (newFormData.year && newFormData.semester) {
          fetchCoursesForOtherPayment(parseInt(newFormData.year), parseInt(newFormData.semester));
        }
      }
    }
  };

  const handleEditOtherPayment = (payment) => {
    // Populate form with existing data
    setOtherPaymentFormData({
      sid: payment.sid,
      year: payment.year,
      semester: payment.semester,
      amount: payment.amount.toString(),
      paymenttype: payment.paymenttype,
      status: payment.status,
      date: payment.date,
      cid: payment.cid,
      attachment: null // Don't pre-load attachment file
    });
    setIsOtherEditMode(true);
    setEditingOtherPaymentId(payment.paymentid);
    setShowOtherPaymentForm(true);
    
    // Load courses for the payment's year and semester
    if (payment.year && payment.semester) {
      fetchCoursesForOtherPayment(payment.year, payment.semester);
    }
  };

  const resetOtherPaymentForm = () => {
    setOtherPaymentFormData({
      sid: studentData?.sid || '',
      year: 1,
      semester: 1,
      amount: '',
      paymenttype: 'Repeat Module',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      cid: '',
      attachment: null
    });
    setIsOtherEditMode(false);
    setEditingOtherPaymentId(null);
    setShowOtherPaymentForm(false);
    
    // Load courses for default year and semester when form is opened
    if (studentData?.degreeid) {
      fetchCoursesForOtherPayment(1, 1); // Default to year 1, semester 1
    }
  };

  const handleOtherPaymentEnrollment = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!otherPaymentFormData.sid) {
      alert('Student ID is required.');
      return;
    }
    if (!otherPaymentFormData.cid) {
      alert('Please select a course.');
      return;
    }
    if (!otherPaymentFormData.amount || parseFloat(otherPaymentFormData.amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!otherPaymentFormData.date) {
      alert('Please select a date.');
      return;
    }

    // Get selected course name for confirmation message
    const selectedCourse = availableCoursesForOther.find(c => c.cid === otherPaymentFormData.cid);
    
    const confirmationMessage = `Are you sure you want to ${isOtherEditMode ? 'update' : 'enroll for'}:
    
• Student ID: ${otherPaymentFormData.sid}
• Course: ${selectedCourse?.cname || otherPaymentFormData.cid}
• Payment Type: ${otherPaymentFormData.paymenttype}
• Year: ${otherPaymentFormData.year}
• Semester: ${otherPaymentFormData.semester}
• Amount: Rs. ${parseFloat(otherPaymentFormData.amount).toLocaleString()}
• Status: ${otherPaymentFormData.status}`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setOtherPaymentFormLoading(true);
    try {
      let attachmentData = null;

      // Handle file upload if attachment is provided
      if (otherPaymentFormData.attachment) {
        const file = otherPaymentFormData.attachment;
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        attachmentData = Array.from(uint8Array);
      }

      // Explicitly create enrollment data without paymentid (auto-increment field)
      const enrollmentData = {
        sid: otherPaymentFormData.sid,
        year: parseInt(otherPaymentFormData.year),
        semester: parseInt(otherPaymentFormData.semester),
        amount: parseFloat(otherPaymentFormData.amount),
        paymenttype: otherPaymentFormData.paymenttype,
        status: otherPaymentFormData.status,
        date: otherPaymentFormData.date,
        cid: otherPaymentFormData.cid
      };

      // Ensure no paymentid is accidentally included
      delete enrollmentData.paymentid;

      // Debug logging
      console.log('Enrollment Data to be sent:', enrollmentData);
      console.log('Is Edit Mode:', isOtherEditMode);
      console.log('Editing Payment ID:', editingOtherPaymentId);

      let error;
      let result;
      
      if (isOtherEditMode) {
        // Update existing enrollment
        result = await supabase
          .from('other_payment')
          .update(enrollmentData)
          .eq('paymentid', editingOtherPaymentId)
          .select();
        error = result.error;
      } else {
        // Insert new enrollment
        result = await supabase
          .from('other_payment')
          .insert([enrollmentData])
          .select();
        error = result.error;
      }

      // If the main operation succeeded and we have an attachment, try to update it separately
      if (!error && attachmentData && result.data && result.data.length > 0) {
        const recordId = isOtherEditMode ? editingOtherPaymentId : result.data[0].paymentid;
        
        try {
          // Try to include attachment in the enrollment data first
          const attachmentUpdate = { attachment: attachmentData };
          const { error: attachmentError } = await supabase
            .from('other_payment')
            .update(attachmentUpdate)
            .eq('paymentid', recordId);
          
          if (attachmentError) {
            console.warn('Attachment upload failed:', attachmentError);
            if (attachmentError.message && attachmentError.message.includes('attachment')) {
              alert('Note: Payment slip upload is not available yet, but enrollment was saved successfully.');
            }
          } else {
            console.log('Attachment uploaded successfully');
          }
        } catch (attachmentErr) {
          console.warn('Attachment column not available:', attachmentErr);
          alert('Note: Payment slip upload is not available yet, but enrollment was saved successfully.');
        }
      }

      if (error) {
        console.error('Other payment enrollment error:', error);
        alert(`Failed to ${isOtherEditMode ? 'update' : 'enroll for'} repeat/prorata: ` + error.message);
      } else {
        alert(`Successfully ${isOtherEditMode ? 'updated' : 'enrolled for'} repeat/prorata enrollment!`);
        resetOtherPaymentForm();
        // Refresh payment data
        await fetchDetailedPayments(studentData.sid);
      }
    } catch (error) {
      console.error('Error during other payment enrollment:', error);
      alert('An unexpected error occurred during repeat/prorata enrollment.');
    } finally {
      setOtherPaymentFormLoading(false);
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
              <button 
                className={activeTab === 'enrollment' ? 'active-tab' : 'tab-button'}
                onClick={() => setActiveTab('enrollment')}
                style={{ padding: '10px 20px', margin: '0 5px', border: '1px solid #ccc', backgroundColor: activeTab === 'enrollment' ? '#007bff' : 'white', color: activeTab === 'enrollment' ? 'white' : 'black' }}
              >
                Semester Enrollment
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

                {/* Semester Enrollment Section */}
                        <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ color: '#007bff', marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
                    📚 Semester Enrollment
                  </h3>
                  
                  {/* Enroll Button */}
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => {
                        resetForm();
                        setShowSemesterForm(true);
                      }}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      ➕ Enroll for New Semester
                    </button>
                  </div>
                  
                  {/* Semester Enrollment Form Modal */}
                  {showSemesterForm && (
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
                        borderRadius: '8px',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h3 style={{ margin: 0, color: '#007bff' }}>
                            {isEditMode ? '✏️ Edit Semester Enrollment' : '➕ New Semester Enrollment'}
                          </h3>
                          <button
                            onClick={() => resetForm()}
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

                        <form onSubmit={handleSemesterEnrollment}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Student ID *
                              </label>
                              <input
                                type="text"
                                name="sid"
                                value={semesterFormData.sid}
                                onChange={handleSemesterFormChange}
                                required
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                                placeholder="Enter student ID"
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Faculty *
                              </label>
                              <select
                                name="facultyid"
                                value={semesterFormData.facultyid}
                                onChange={handleSemesterFormChange}
                                required
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                              >
                                <option value="">{faculties.length > 0 ? 'Select Faculty' : 'Loading faculties...'}</option>
                                {faculties.map(faculty => (
                                  <option key={faculty.facultyid} value={faculty.facultyid}>
                                    {faculty.fname}
                                  </option>
                                ))}
                              </select>
                              {faculties.length === 0 && (
                                <small style={{ color: '#dc3545', fontSize: '12px' }}>
                                  No faculties loaded. Please refresh the page.
                                </small>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Degree *
                              </label>
                              <select
                                name="degreeid"
                                value={semesterFormData.degreeid}
                                onChange={handleSemesterFormChange}
                                required
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                              >
                                <option value="">{degrees.length > 0 ? 'Select Degree' : 'Loading degrees...'}</option>
                                {degrees.map(degree => (
                                  <option key={degree.degreeid} value={degree.degreeid}>
                                    {degree.dname}
                                  </option>
                                ))}
                              </select>
                              {degrees.length === 0 && allDegrees.length > 0 && (
                                <small style={{ color: '#ffc107', fontSize: '12px' }}>
                                  Please select a faculty first to see available degrees.
                                </small>
                              )}
                              {allDegrees.length === 0 && (
                                <small style={{ color: '#dc3545', fontSize: '12px' }}>
                                  No degrees loaded. Please refresh the page.
                                </small>
                              )}
                            </div>

                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Academic Year *
                              </label>
                              <select
                                name="year"
                                value={semesterFormData.year}
                                onChange={handleSemesterFormChange}
                                required
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                              >
                                {[1, 2, 3, 4].map(year => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Semester *
                              </label>
                              <select
                                name="semester"
                                value={semesterFormData.semester}
                                onChange={handleSemesterFormChange}
                                required
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                              >
                                <option value={1}>Semester 1</option>
                                <option value={2}>Semester 2</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Amount (Rs.) *
                              </label>
                              <input
                                type="number"
                                name="amount"
                                value={semesterFormData.amount}
                                onChange={handleSemesterFormChange}
                                required
                                min="0"
                                step="0.01"
                                placeholder="Enter amount"
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Status *
                              </label>
                                                              <input
                                  type="text"
                                  name="status"
                                  value={semesterFormData.status}
                                  readOnly
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    backgroundColor: '#f8f9fa',
                                    color: '#6c757d',
                                    cursor: 'not-allowed'
                                  }}
                                />
                                <small style={{ color: '#6c757d', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                                  Status is automatically managed by the system
                                </small>
                            </div>

                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Date *
                              </label>
                              <input
                                type="date"
                                name="date"
                                value={semesterFormData.date}
                                onChange={handleSemesterFormChange}
                                required
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                              Payment Slip Attachment (Optional)
                            </label>
                            <input
                              type="file"
                              name="attachment"
                              onChange={handleSemesterFormChange}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                            <small style={{ color: '#666', fontSize: '12px' }}>
                              Upload payment slip (PDF, DOC, DOCX, JPG, PNG - Max: 10MB)
                            </small>
                            {semesterFormData.attachment && (
                              <div style={{ marginTop: '5px', fontSize: '12px', color: '#28a745' }}>
                                Selected: {semesterFormData.attachment.name} ({(semesterFormData.attachment.size / 1024 / 1024).toFixed(2)} MB)
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                              type="button"
                              onClick={() => resetForm()}
                              style={{
                                padding: '10px 20px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={semesterFormLoading}
                              style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: semesterFormLoading ? '#cccccc' : (isEditMode ? '#28a745' : '#007bff'),
                                color: 'white',
                                cursor: semesterFormLoading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              {semesterFormLoading 
                                ? (isEditMode ? 'Updating...' : 'Enrolling...') 
                                : (isEditMode ? '✏️ Update Enrollment' : '➕ Enroll for Semester')
                              }
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                  
                  {/* Semester Enrollment Records */}
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ color: '#007bff', marginBottom: '15px' }}>Your Semester Enrollment Payments</h4>
                    {semesterEnrollments.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          backgroundColor: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Payment ID</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Year</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Semester</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Faculty</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Degree</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Amount</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Status</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Payment Date</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Payment Slip</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                            {semesterEnrollments.map((enrollment, index) => (
                              <tr key={enrollment.paymentid} style={{
                                backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                              }}>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>
                                  {enrollment.paymentid}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>
                                  {enrollment.year}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                  {enrollment.semester}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                  {enrollment.faculty?.fname || 'N/A'}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                  {enrollment.degree?.dname || 'N/A'}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>
                                  {formatCurrency(enrollment.amount)}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                        <span style={{ 
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: 'white',
                                    backgroundColor: getStatusColor(enrollment.status)
                                  }}>
                                    {enrollment.status || 'Pending'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                  {enrollment.date ? new Date(enrollment.date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                  {enrollment.attachment ? (
                                    <span style={{
                                      padding: '3px 8px',
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                          fontWeight: 'bold'
                                        }}>
                                      📎 Uploaded
                                        </span>
                                  ) : (
                                    <span style={{
                                      padding: '3px 8px',
                                      backgroundColor: '#6c757d',
                                      color: 'white',
                                      borderRadius: '12px',
                                      fontSize: '11px'
                                    }}>
                                      No File
                                    </span>
                                  )}
                                      </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleEditEnrollment(enrollment)}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    ✏️ Update
                                  </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                      <p style={{ color: '#666', fontStyle: 'italic' }}>No semester enrollment payments found.</p>
                          )}
                        </div>
                </div>
                
                {/* Detailed Payment Records */}
                        <div>


                    {/* Repeat and Prorata Enrollment Section */}
                    <div>
                      <h4 style={{ color: '#28a745', marginBottom: '15px', borderBottom: '2px solid #28a745', paddingBottom: '5px' }}>
                        📋 Repeat and Prorata Enrollment
                      </h4>
                      
                      {/* Enroll Button */}
                      <div style={{ marginBottom: '20px' }}>
                        <button
                          onClick={() => {
                            resetOtherPaymentForm();
                            setShowOtherPaymentForm(true);
                          }}
                          style={{
                            padding: '12px 24px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}
                        >
                          ➕ Enroll for Repeat/Prorata
                        </button>
                      </div>
                      
                      {/* Other Payment Form Modal */}
                      {showOtherPaymentForm && (
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
                            borderRadius: '8px',
                            width: '100%',
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                              <h3 style={{ margin: 0, color: '#28a745' }}>
                                {isOtherEditMode ? '✏️ Edit Repeat/Prorata Enrollment' : '➕ New Repeat/Prorata Enrollment'}
                              </h3>
                              <button
                                onClick={() => resetOtherPaymentForm()}
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

                            <form onSubmit={handleOtherPaymentEnrollment}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Student ID *
                                  </label>
                                  <input
                                    type="text"
                                    name="sid"
                                    value={otherPaymentFormData.sid}
                                    onChange={handleOtherPaymentFormChange}
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px'
                                    }}
                                    placeholder="Enter student ID"
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Course *
                                  </label>
                                  <select
                                    name="cid"
                                    value={otherPaymentFormData.cid}
                                    onChange={handleOtherPaymentFormChange}
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px'
                                    }}
                                  >
                                    <option value="">
                                      {availableCoursesForOther.length > 0 
                                        ? 'Select Course' 
                                        : otherPaymentFormData.year && otherPaymentFormData.semester 
                                          ? 'No courses available for this year/semester' 
                                          : 'Select year and semester first'
                                      }
                                    </option>
                                    {availableCoursesForOther.map(course => (
                                      <option key={course.cid} value={course.cid}>
                                        {course.cid} - {course.cname} ({course.credits} credits, {course.type})
                                      </option>
                                    ))}
                                  </select>
                                  {availableCoursesForOther.length === 0 && otherPaymentFormData.year && otherPaymentFormData.semester && (
                                    <small style={{ color: '#ffc107', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                                      No courses available for Year {otherPaymentFormData.year}, Semester {otherPaymentFormData.semester}
                                    </small>
                                  )}
                                  {(!otherPaymentFormData.year || !otherPaymentFormData.semester) && (
                                    <small style={{ color: '#6c757d', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                                      Please select academic year and semester to view available courses
                                    </small>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Academic Year *
                                  </label>
                                  <select
                                    name="year"
                                    value={otherPaymentFormData.year}
                                    onChange={handleOtherPaymentFormChange}
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px'
                                    }}
                                  >
                                    {[1, 2, 3, 4].map(year => (
                                      <option key={year} value={year}>
                                        {year}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Semester *
                                  </label>
                                  <select
                                    name="semester"
                                    value={otherPaymentFormData.semester}
                                    onChange={handleOtherPaymentFormChange}
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px'
                                    }}
                                  >
                                    <option value={1}>Semester 1</option>
                                    <option value={2}>Semester 2</option>
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Payment Type *
                                  </label>
                                  <select
                                    name="paymenttype"
                                    value={otherPaymentFormData.paymenttype}
                                    onChange={handleOtherPaymentFormChange}
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px'
                                    }}
                                  >
                                    <option value="Repeat Module">Repeat Module</option>
                                    <option value="Prorata">Prorata</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Amount (Rs.) *
                                  </label>
                                  <input
                                    type="number"
                                    name="amount"
                                    value={otherPaymentFormData.amount}
                                    onChange={handleOtherPaymentFormChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter amount"
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Status *
                                  </label>
                                  <input
                                    type="text"
                                    name="status"
                                    value={otherPaymentFormData.status}
                                    readOnly
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px',
                                      backgroundColor: '#f8f9fa',
                                      color: '#6c757d',
                                      cursor: 'not-allowed'
                                    }}
                                  />
                                  <small style={{ color: '#6c757d', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                                    Status is automatically managed by the system
                                  </small>
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Payment Date *
                                  </label>
                                  <input
                                    type="date"
                                    name="date"
                                    value={otherPaymentFormData.date}
                                    onChange={handleOtherPaymentFormChange}
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>
                              </div>

                              <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                  Payment Slip Attachment (Optional)
                                </label>
                                <input
                                  type="file"
                                  name="attachment"
                                  onChange={handleOtherPaymentFormChange}
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                  }}
                                />
                                <small style={{ color: '#666', fontSize: '12px' }}>
                                  Upload payment slip (PDF, DOC, DOCX, JPG, PNG - Max: 10MB)
                                </small>
                                {otherPaymentFormData.attachment && (
                                  <div style={{ marginTop: '5px', fontSize: '12px', color: '#28a745' }}>
                                    Selected: {otherPaymentFormData.attachment.name} ({(otherPaymentFormData.attachment.size / 1024 / 1024).toFixed(2)} MB)
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button
                                  type="button"
                                  onClick={() => resetOtherPaymentForm()}
                                  style={{
                                    padding: '10px 20px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={otherPaymentFormLoading}
                                  style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: otherPaymentFormLoading ? '#cccccc' : (isOtherEditMode ? '#ffc107' : '#28a745'),
                                    color: 'white',
                                    cursor: otherPaymentFormLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {otherPaymentFormLoading 
                                    ? (isOtherEditMode ? 'Updating...' : 'Enrolling...') 
                                    : (isOtherEditMode ? '✏️ Update Enrollment' : '➕ Enroll for Repeat/Prorata')
                                  }
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                      
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
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Payment Slip</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Actions</th>
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
                                    {payment.semester}
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
                                  <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                    {payment.attachment ? (
                                      <span 
                                        onClick={() => handleViewAttachment(payment.attachment)}
                                        style={{
                                          padding: '3px 8px',
                                          backgroundColor: '#28a745',
                                          color: 'white',
                                          borderRadius: '12px',
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        📎 View
                                      </span>
                                    ) : (
                                      <span style={{
                                        padding: '3px 8px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        borderRadius: '12px',
                                        fontSize: '11px'
                                      }}>
                                        No File
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                    <button
                                      onClick={() => handleEditOtherPayment(payment)}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#ffc107',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      ✏️ Update
                                    </button>
                                  </td>
                                     </tr>
                                   ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>No repeat and prorata enrollments found.</p>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                            {formatCurrency(
                              semesterPayments.reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0)
                            )}
                  </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Semester Payments</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                            {formatCurrency(
                              otherPayments.reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0)
                            )}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Repeat/Prorata Total</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6f42c1' }}>
                            {formatCurrency(
                              [...semesterPayments, ...otherPayments]
                                .reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0)
                            )}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Grand Total</div>
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

            {/* Semester Enrollment Tab */}
            {activeTab === 'enrollment' && (
              <div className="semester-enrollment">
                <h3>📚 Semester Enrollment</h3>
                
                {/* Current Enrollments */}
                <div style={{ marginBottom: '40px' }}>
                  <h4 style={{ color: '#007bff', marginBottom: '20px' }}>Current Enrollments</h4>
                  {currentEnrollments.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Course ID</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Course Name</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Credits</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Lecturer</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Enrollment Date</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentEnrollments.map((enrollment, index) => (
                            <tr key={enrollment.enrollment_id} style={{
                              backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                            }}>
                              <td style={{ padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                                {enrollment.cid}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                {enrollment.course?.cname || 'Course name not available'}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                {enrollment.course?.credits || 'N/A'}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                {enrollment.course?.lecturer_name || 'N/A'}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                {new Date(enrollment.enrollment_date).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleDropCourse(enrollment.enrollment_id, enrollment.course?.cname)}
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
                                  Drop
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
          </div>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No current enrollments found.</p>
                  )}
                </div>

                {/* Available Courses for Enrollment */}
                <div>
                  <h4 style={{ color: '#28a745', marginBottom: '20px' }}>Available Courses for Enrollment</h4>
                  {availableCourses.length > 0 ? (
                    <>
                      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          backgroundColor: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Select</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Course ID</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Course Name</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Credits</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Lecturer</th>
                              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availableCourses.map((course, index) => (
                              <tr key={course.cid} style={{
                                backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                              }}>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedCourses.includes(course.cid)}
                                    onChange={() => handleCourseSelection(course.cid)}
                                    style={{ transform: 'scale(1.2)' }}
                                  />
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                                  {course.cid}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                  {course.cname}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                  {course.credits || 'N/A'}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                  {course.lecturer_name || 'N/A'}
                                </td>
                                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                  {course.description || 'No description available'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {selectedCourses.length > 0 && (
                        <div style={{ 
                          padding: '20px', 
                          backgroundColor: '#e8f5e8', 
                          borderRadius: '8px',
                          border: '1px solid #28a745'
                        }}>
                          <div style={{ marginBottom: '15px' }}>
                            <strong style={{ color: '#155724' }}>
                              Selected Courses: {selectedCourses.length}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setSelectedCourses([])}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                              }}
                            >
                              Clear Selection
                            </button>
                            <button
                              onClick={handleEnrollment}
                              disabled={enrollmentLoading}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: enrollmentLoading ? '#cccccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: enrollmentLoading ? 'not-allowed' : 'pointer',
                                opacity: enrollmentLoading ? 0.7 : 1
                              }}
                            >
                              {enrollmentLoading ? 'Enrolling...' : `Enroll in ${selectedCourses.length} Course(s)`}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No available courses found for your faculty and degree.</p>
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