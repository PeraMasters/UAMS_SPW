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

  // Enrolled modules state
  const [enrolledModules, setEnrolledModules] = useState({
    semester: [],
    prorata: [],
    repeat: []
  });

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

  // Timetable state
  const [classSchedule, setClassSchedule] = useState([]);
  const [examSchedule, setExamSchedule] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // Exam results state
  const [examResultsLoading, setExamResultsLoading] = useState(false);

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

  // Fetch enrolled modules data
  const fetchEnrolledModules = useCallback(async () => {
    if (!studentData?.sid) return;

    try {
      // Fetch semester modules from semester_payment with completed status
      const { data: semesterData, error: semesterError } = await supabase
        .from('semester_payment')
        .select(`
          paymentid,
          year,
          semester,
          status,
          date,
          degreeid,
          degree:degreeid (
            degreeid,
            dname
          )
        `)
        .eq('sid', studentData.sid)
        .eq('status', 'Completed')
        .order('year', { ascending: false })
        .order('semester', { ascending: false });

      // For each semester enrollment, fetch the courses for that year/semester/degree
      let enrichedSemesterData = [];
      if (semesterData && semesterData.length > 0) {
        enrichedSemesterData = await Promise.all(
          semesterData.map(async (semesterModule) => {
            // Fetch courses for this specific year, semester, and degree
            const { data: coursesData, error: coursesError } = await supabase
              .from('course')
              .select(`
                cid,
                cname,
                credits,
                year,
                semester,
                type
              `)
              .eq('year', semesterModule.year)
              .eq('semester', semesterModule.semester)
              .eq('degreeid', semesterModule.degreeid)
              .order('cid');

            if (coursesError) {
              console.error('Error fetching courses for semester:', coursesError);
              return { ...semesterModule, courses: [] };
            }

            return { ...semesterModule, courses: coursesData || [] };
          })
        );
      }

      // Fetch prorata and repeat modules from other_payment with completed status
      const { data: otherData, error: otherError } = await supabase
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
          course:cid (
            cid,
            cname,
            credits,
            type
          )
        `)
        .eq('sid', studentData.sid)
        .eq('status', 'Completed')
        .order('date', { ascending: false });

      if (semesterError) {
        console.error('Error fetching semester modules:', semesterError);
      }

      if (otherError) {
        console.error('Error fetching other modules:', otherError);
      }

      // Group other modules by payment type
      const prorataModules = otherData?.filter(item => item.paymenttype === 'Prorata') || [];
      const repeatModules = otherData?.filter(item => item.paymenttype === 'Repeat Module') || [];

      setEnrolledModules({
        semester: enrichedSemesterData || [],
        prorata: prorataModules,
        repeat: repeatModules
      });

    } catch (error) {
      console.error('Error fetching enrolled modules:', error);
    }
  }, [studentData?.sid]);

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

  const fetchExamResults = useCallback(async (studentSID) => {
    // Helper function to calculate grade points (moved inside to avoid dependency issues)
    const calculateGradePoints = (grade) => {
      if (!grade) return 0;
      
      const gradeStr = grade.toString().toUpperCase().trim();
      
      // Standard 4.0 GPA scale
      const gradeMap = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
      };
      
      return gradeMap[gradeStr] || 0;
    };

    try {
      console.log('Debug: Fetching exam results for student:', studentSID);
      setExamResultsLoading(true);
      
      // First, let's check if the examresult table exists and has any data
      const { data: sampleResults, error: sampleError } = await supabase
        .from('examresult')
        .select('*')
        .limit(5);
      
      console.log('Debug: Sample examresult data (first 5 records):', { sampleResults, sampleError });
      
      // Also check what SIDs exist in examresult table to verify data
      const { data: uniqueSIDs, error: sidError } = await supabase
        .from('examresult')
        .select('sid')
        .limit(10);
      
      console.log('Debug: SIDs found in examresult table:', { uniqueSIDs, sidError });
      console.log('Debug: Looking for results with SID:', studentSID);
      
      // Step 1: Get exam results for the student
      const { data: examResultsData, error: resultsError } = await supabase
        .from('examresult')
        .select('resultid, marks, grade, sid, cid')
        .eq('sid', studentSID);

      if (resultsError) {
        console.error('Exam results fetch error:', resultsError);
        setExamResults([]);
        return;
      }

      console.log('Debug: Raw exam results:', examResultsData);

      if (!examResultsData || examResultsData.length === 0) {
        console.log('Debug: No exam results found for student');
        setExamResults([]);
        return;
      }

      // Step 2: Get course details for each result
      const courseIds = [...new Set(examResultsData.map(result => result.cid))];
      console.log('Debug: Course IDs for results:', courseIds);

      const { data: coursesData, error: coursesError } = await supabase
        .from('course')
        .select('cid, cname, credits, year, semester, degreeid, type')
        .in('cid', courseIds);

      if (coursesError) {
        console.error('Error fetching course details:', coursesError);
        setExamResults(examResultsData || []);
        return;
      }

      console.log('Debug: Course details:', coursesData);

      // Step 3: Combine exam results with course details
      const resultsWithCourses = examResultsData.map(result => {
        const courseDetails = coursesData?.find(course => course.cid === result.cid);
        return {
          ...result,
          course: courseDetails || { 
            cid: result.cid, 
            cname: 'Unknown Course', 
            credits: 0, 
            year: 0, 
            semester: 0,
            type: 'Unknown'
          }
        };
      });

      console.log('Debug: Results with course details:', resultsWithCourses);

      // Step 4: Sort by year and semester
      const sortedResults = resultsWithCourses.sort((a, b) => {
        if (a.course.year !== b.course.year) {
          return a.course.year - b.course.year;
        }
        return a.course.semester - b.course.semester;
      });

      console.log('Debug: Sorted results:', sortedResults);

      // Step 5: Group by year and semester, calculate semester GPAs
      const groupedResults = {};
      sortedResults.forEach(result => {
        const key = `Year ${result.course.year} Semester ${result.course.semester}`;
        if (!groupedResults[key]) {
          groupedResults[key] = {
            year: result.course.year,
            semester: result.course.semester,
            results: [],
            totalCredits: 0,
            totalGradePoints: 0,
            semesterGPA: 0
          };
        }
        
        // Add grade points calculation
        const gradePoints = calculateGradePoints(result.grade);
        const credits = result.course.credits || 0;
        
        groupedResults[key].results.push({
          ...result,
          gradePoints,
          credits
        });
        
        if (gradePoints > 0) { // Only count if valid grade
          groupedResults[key].totalCredits += credits;
          groupedResults[key].totalGradePoints += (gradePoints * credits);
        }
      });

      // Calculate semester GPAs
      Object.keys(groupedResults).forEach(key => {
        const group = groupedResults[key];
        if (group.totalCredits > 0) {
          group.semesterGPA = (group.totalGradePoints / group.totalCredits).toFixed(2);
        } else {
          group.semesterGPA = '0.00';
        }
      });

      // Step 6: Calculate overall GPA
      let totalCreditsOverall = 0;
      let totalGradePointsOverall = 0;
      
      Object.values(groupedResults).forEach(group => {
        totalCreditsOverall += group.totalCredits;
        totalGradePointsOverall += group.totalGradePoints;
      });

      const overallGPA = totalCreditsOverall > 0 ? 
        (totalGradePointsOverall / totalCreditsOverall).toFixed(2) : '0.00';

      console.log('Debug: Grouped results with GPA:', groupedResults);
      console.log('Debug: Overall GPA:', overallGPA);

      // Store both grouped results and overall GPA
      const resultData = {
        groupedResults,
        overallGPA,
        sortedResults,
        rawResults: examResultsData // Keep raw data as fallback
      };
      
      console.log('Debug: Final exam results object:', resultData);
      setExamResults(resultData);

    } catch (error) {
      console.error('Error fetching exam results:', error);
      setExamResults([]);
    } finally {
      setExamResultsLoading(false);
    }
  }, []); // Empty dependency array since function is self-contained

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
    
    // Fetch enrollment data when enrolled modules tab becomes active
    if (activeTab === 'enrollment' && studentData?.sid && currentEnrollments.length === 0 && availableCourses.length === 0) {
      fetchEnrollmentData(studentData.sid);
      fetchEnrolledModules();
    }

    // Fetch timetable data when timetable tab becomes active
    if (activeTab === 'timetable' && studentData?.sid && classSchedule.length === 0 && examSchedule.length === 0) {
      fetchTimetableData(studentData.sid);
    }

    // Fetch exam results when results tab becomes active (always reload for fresh data)
    if (activeTab === 'results' && studentData?.sid) {
      console.log('Debug: Results tab activated, fetching fresh exam results...');
      setExamResults([]); // Clear previous results
      fetchExamResults(studentData.sid);
    }
  }, [activeTab, studentData, semesterPayments.length, otherPayments.length, currentEnrollments.length, availableCourses.length, classSchedule.length, examSchedule.length, fetchEnrollmentData, fetchSemesterEnrollments, fetchEnrolledModules, fetchExamResults]);

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




  // Helper function to get grade color
  const getGradeColor = (grade) => {
    if (!grade) return '#6c757d';
    
    const gradeStr = grade.toString().toUpperCase().trim();
    
    if (gradeStr.startsWith('A')) return '#28a745'; // Green for A grades
    if (gradeStr.startsWith('B')) return '#007bff'; // Blue for B grades  
    if (gradeStr.startsWith('C')) return '#ffc107'; // Yellow for C grades
    if (gradeStr.startsWith('D')) return '#fd7e14'; // Orange for D grades
    if (gradeStr === 'F') return '#dc3545'; // Red for F grade
    
    return '#6c757d'; // Gray for unknown grades
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

  const fetchTimetableData = async (studentSID) => {
    try {
      console.log('Debug: fetchTimetableData called for student:', studentSID);
      setTimetableLoading(true);
      
      // Step 1: Get student's semester payments with all details including date
      const { data: semesterPayments, error: paymentError } = await supabase
        .from('semester_payment')
        .select('paymentid, year, semester, status, date, degreeid, facultyid')
        .eq('sid', studentSID)
        .order('date', { ascending: false }); // Order by most recent date first

      console.log('Debug: Semester payments query result:', { semesterPayments, paymentError });

      if (paymentError) {
        console.error('Error fetching semester payments:', paymentError);
        setClassSchedule([]);
        setExamSchedule([]);
        return;
      }

      if (!semesterPayments || semesterPayments.length === 0) {
        console.log('Debug: No semester payments found for student');
        setClassSchedule([]);
        setExamSchedule([]);
        return;
      }

      // Step 2: Find the most recent payment (most recent enrollment)
      const mostRecentPayment = semesterPayments[0]; // First item is most recent due to ordering
      console.log('Debug: Most recent payment (enrollment):', mostRecentPayment);

      // For class timetable, use only the most recent enrollment (current semester)
      const currentSemesterInfo = {
        year: mostRecentPayment.year,
        semester: mostRecentPayment.semester,
        degreeid: mostRecentPayment.degreeid,
        enrollmentDate: mostRecentPayment.date
      };

      console.log('Debug: Current semester info for class schedule:', currentSemesterInfo);

      // Get all unique year/semester combinations for exam purposes
      const uniqueYearSemesters = [];
      const seen = new Set();
      
      semesterPayments.forEach(payment => {
        const key = `${payment.year}-${payment.semester}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueYearSemesters.push({
            year: payment.year,
            semester: payment.semester,
            degreeid: payment.degreeid
          });
        }
      });

      console.log('Debug: All student registered year/semesters (for exams):', uniqueYearSemesters);

      // Step 3: Get student's degree information to find relevant courses
      console.log('Debug: Getting student degree information for SID:', studentSID);
      const { data: studentInfo, error: studentError } = await supabase
        .from('student')
        .select('sid, degreeid, facultyid, f_name, l_name')
        .eq('sid', studentSID)
        .single();

      console.log('Debug: Student info query result:', { studentInfo, studentError });

      // Also log the semester payments in more detail
      console.log('Debug: Detailed semester payments analysis:');
      semesterPayments.forEach((payment, index) => {
        console.log(`Payment ${index + 1}:`, {
          paymentid: payment.paymentid,
          year: payment.year,
          semester: payment.semester,
          degreeid: payment.degreeid,
          status: payment.status,
          date: payment.date
        });
      });

      if (studentError || !studentInfo) {
        console.error('Error fetching student info:', studentError);
        setClassSchedule([]);
        setExamSchedule([]);
        return;
      }

      // Step 4A: Get courses for current semester (for class schedule)
      console.log('Debug: Looking for courses for current semester:', {
        studentDegreeid: studentInfo.degreeid,
        currentYear: currentSemesterInfo.year,
        currentSemester: currentSemesterInfo.semester
      });

      const { data: currentSemesterCourses, error: currentCourseError } = await supabase
        .from('course')
        .select('cid, cname, year, semester, credits, degreeid, type')
        .eq('degreeid', studentInfo.degreeid)
        .eq('year', currentSemesterInfo.year)
        .eq('semester', currentSemesterInfo.semester);

      console.log('Debug: Current semester courses:', { currentSemesterCourses, currentCourseError });

      // Step 4B: Get courses for all registered year/semester combinations (for exams)
      console.log('Debug: Looking for courses for all semesters (exams):', {
        studentDegreeid: studentInfo.degreeid,
        uniqueYearSemesters: uniqueYearSemesters
      });

      let examCourseQuery = supabase
        .from('course')
        .select('cid, cname, year, semester, credits, degreeid, type')
        .eq('degreeid', studentInfo.degreeid);

      // Add year/semester filtering for exam courses
      const orConditions = uniqueYearSemesters.map(ys => 
        `and(year.eq.${ys.year},semester.eq.${ys.semester})`
      ).join(',');

      console.log('Debug: OR conditions for exam course query:', orConditions);

      const { data: examSemesterCourses, error: examCourseError } = await examCourseQuery
        .or(orConditions);

      console.log('Debug: Exam semester courses for all year/semesters:', { examSemesterCourses, examCourseError });

      // Let's also check what courses exist for this degree without year/semester filter
      const { data: allDegreeCourses, error: allDegreeCoursesError } = await supabase
        .from('course')
        .select('cid, cname, year, semester, credits, degreeid, type')
        .eq('degreeid', studentInfo.degreeid);

      console.log('Debug: All courses for this degree (no year/semester filter):', { allDegreeCourses, allDegreeCoursesError });

      if (currentCourseError || examCourseError) {
        console.error('Error fetching courses:', { currentCourseError, examCourseError });
        setClassSchedule([]);
        setExamSchedule([]);
        return;
      }

      // Step 5: Also get courses from other_payment table (for Repeat/Prorata exams)
      const { data: otherPaymentRecords, error: otherPaymentError } = await supabase
        .from('other_payment')
        .select('cid, paymenttype, year, semester, status, date, amount')
        .eq('sid', studentSID)
        .in('paymenttype', ['Repeat Module', 'Prorata']);

      console.log('Debug: Other payment records query result:', { otherPaymentRecords, otherPaymentError });

      // Get course details for other payment courses
      const otherPaymentCourseIds = otherPaymentRecords?.map(payment => payment.cid) || [];
      let otherPaymentCourses = [];
      
      if (otherPaymentCourseIds.length > 0) {
        const { data: otherCourses, error: otherCoursesError } = await supabase
          .from('course')
          .select('cid, cname, year, semester, credits, degreeid, type')
          .in('cid', otherPaymentCourseIds);
        
        if (!otherCoursesError) {
          otherPaymentCourses = otherCourses || [];
        }
      }

      console.log('Debug: Other payment courses details:', { otherPaymentCourses });

      // For class schedule: use current semester courses only
      const currentSemesterCourseIds = (currentSemesterCourses || []).map(course => course.cid);
      console.log('Debug: Current semester course IDs (for class schedule):', currentSemesterCourseIds);

      // For exam schedule: combine all semester courses and other payment courses
      const allExamCourses = [
        ...(examSemesterCourses || []),
        ...otherPaymentCourses
      ];
      
      // Remove duplicates based on cid for exam courses
      const uniqueExamCourses = allExamCourses.filter((course, index, self) => 
        index === self.findIndex(c => c.cid === course.cid)
      );

      const examRelevantCourses = uniqueExamCourses;
      const examRelevantCourseIds = uniqueExamCourses.map(course => course.cid);
      
      console.log('Debug: Exam relevant courses (combined and unique):', { examRelevantCourses, examRelevantCourseIds });

      // Step 6: Fetch class schedule from classtimetable table for next 2 weeks
      console.log('Debug: About to fetch class schedule...');
      console.log('Debug: Current semester course IDs length:', currentSemesterCourseIds.length);
      console.log('Debug: Current semester course IDs:', currentSemesterCourseIds);

      // First, let's check if classtimetable table has any data at all
      const { data: allClassData, error: allClassError } = await supabase
        .from('classtimetable')
        .select('*')
        .limit(5);

      console.log('Debug: Sample classtimetable data (first 5 records):', { allClassData, allClassError });

      if (currentSemesterCourseIds.length > 0) {
        const today = new Date();
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14); // Next 2 weeks
        
        console.log('Debug: Fetching class schedule for date range:', {
          from: today.toISOString().split('T')[0],
          to: twoWeeksLater.toISOString().split('T')[0],
          currentSemesterCourseIds
        });

        // Try a simpler query first without date filtering
        const { data: allCoursesClassData, error: allCoursesClassError } = await supabase
          .from('classtimetable')
          .select(`
            classtimetableid,
            date,
            starttime,
            endtime,
            vid,
            lid,
            cid
          `)
          .in('cid', currentSemesterCourseIds);

        console.log('Debug: All classes for relevant courses (no date filter):', { allCoursesClassData, allCoursesClassError });

        // Now try with date filtering
        const { data: classData, error: classError } = await supabase
          .from('classtimetable')
          .select(`
            classtimetableid,
            date,
            starttime,
            endtime,
            vid,
            lid,
            cid
          `)
          .in('cid', currentSemesterCourseIds)
          .gte('date', today.toISOString().split('T')[0])
          .lte('date', twoWeeksLater.toISOString().split('T')[0])
          .order('date')
          .order('starttime');

        console.log('Debug: Class timetable query result (with date filter):', { classData, classError });

        if (classError) {
          console.error('Error fetching class timetable:', classError);
          setClassSchedule([]);
        } else {
          // Step 7: Fetch additional details for each class (location, lecturer, course)
          const classesWithDetails = await Promise.all(
            (classData || []).map(async (classItem) => {
              // Get course details from current semester courses
              const courseDetails = (currentSemesterCourses || []).find(course => course.cid === classItem.cid);
              
              // Get location details (correct column name: 'venue')
              let locationDetails = null;
              if (classItem.vid) {
                const { data: locationData, error: locationError } = await supabase
                  .from('location')
                  .select('vid, venue')
                  .eq('vid', classItem.vid)
                  .single();
                
                console.log('Debug: Location query for vid', classItem.vid, ':', { locationData, locationError });
                
                if (!locationError && locationData) {
                  locationDetails = {
                    vid: locationData.vid,
                    venue: locationData.venue,
                    location: locationData.venue // Map venue to 'location' for UI consistency
                  };
                }
              }

              // Get lecturer details (corrected column names: 'f_name', 'l_name')
              let lecturerDetails = null;
              if (classItem.lid) {
                const { data: lecturerData, error: lecturerError } = await supabase
                  .from('lecturer')
                  .select('lid, f_name, l_name')
                  .eq('lid', classItem.lid)
                  .single();
                
                console.log('Debug: Lecturer query for lid', classItem.lid, ':', { lecturerData, lecturerError });
                
                if (!lecturerError && lecturerData) {
                  lecturerDetails = {
                    lid: lecturerData.lid,
                    name: `${lecturerData.f_name} ${lecturerData.l_name}`.trim()
                  };
                }
              }
              
              return {
                ...classItem,
                course: courseDetails || { cid: classItem.cid, cname: 'Unknown Course', credits: null, year: null, semester: null },
                location: locationDetails || { vid: classItem.vid, venue: 'Unknown Location', location: 'Unknown Location' },
                lecturer: lecturerDetails || { lid: classItem.lid, name: 'Unknown Lecturer' }
              };
            })
          );
          
          console.log('Debug: Class schedule with details:', classesWithDetails);
          setClassSchedule(classesWithDetails);
        }

        // Step 8: Fetch exam schedule for exam relevant courses (without join due to FK issue)
        const { data: examData, error: examError } = await supabase
          .from('exam')
          .select(`
            examid,
            examcategory,
            date,
            starttime,
            endtime,
            cid,
            Status,
            Vid
          `)
          .in('cid', examRelevantCourseIds)
          .order('date')
          .order('starttime');

        console.log('Debug: Exam schedule query result:', { examData, examError });

        if (examError) {
          console.error('Error fetching exam schedule:', examError);
          setExamSchedule([]);
        } else {
          console.log('Debug: Found exam data:', examData);
          
          // Step 9: Manually fetch course details and location details for each exam
          const examsWithDetails = await Promise.all(
            (examData || []).map(async (exam) => {
              // Get course details for this exam's cid from exam relevant courses
              const courseDetails = examRelevantCourses.find(course => course.cid === exam.cid);
              
              // Get location details for this exam's Vid (correct column name: 'venue')
              let locationDetails = null;
              if (exam.Vid) {
                const { data: locationData, error: locationError } = await supabase
                  .from('location')
                  .select('vid, venue')
                  .eq('vid', exam.Vid)
                  .single();
                
                if (!locationError && locationData) {
                  locationDetails = {
                    vid: locationData.vid,
                    venue: locationData.venue,
                    location: locationData.venue // Map venue to 'location' for UI consistency
                  };
                }
              }
              
              return {
                ...exam,
                course: courseDetails || { cid: exam.cid, cname: 'Unknown Course', year: null, semester: null },
                location: locationDetails || { vid: exam.Vid, venue: 'Unknown Location', location: 'Unknown Location' }
              };
            })
          );

          console.log('Debug: Exams with course and location details:', examsWithDetails);
          
          // Step 7: Filter and process exams - only show upcoming exams based on payment dates
          const eligibleExams = [];
          
          for (const exam of examsWithDetails) {
            console.log('Debug: Processing exam:', exam);
            
            let shouldShowExam = false;
            let isEligible = false;
            let eligibilityMessage = 'Not eligible';
            let paymentDetails = {};

            if (exam.Status === 'Proper') {
              // For Proper exams: Check semester_payment table and time condition
              const relevantPayment = semesterPayments.find(payment => 
                payment.year === exam.course?.year && 
                payment.semester === exam.course?.semester &&
                payment.degreeid === exam.course?.degreeid
              );

              // Check if exam date is in upcoming month compared to payment date
              let isUpcomingExam = false;
              if (relevantPayment) {
                const examDate = new Date(exam.date);
                const paymentDate = new Date(relevantPayment.date);
                
                // Check if exam is in the same month or upcoming months after payment
                isUpcomingExam = examDate >= paymentDate;
              }

              console.log('Debug: Proper exam payment and time check:', { 
                examId: exam.examid, 
                examDate: exam.date,
                courseYear: exam.course?.year, 
                courseSemester: exam.course?.semester,
                courseDegreeId: exam.course?.degreeid,
                relevantPayment,
                isUpcomingExam,
                mostRecentPaymentStatus: mostRecentPayment.status,
                mostRecentPaymentDate: mostRecentPayment.date
              });

              // Only show exam if there's a payment record AND it's upcoming
              if (relevantPayment && isUpcomingExam) {
                shouldShowExam = true;
                
                if (relevantPayment.status !== 'Completed') {
                  eligibilityMessage = 'Not eligible because semester payment is not completed';
                } else {
                  isEligible = true;
                  eligibilityMessage = 'Eligible';
                }

                paymentDetails = {
                  paymentType: 'Semester Payment',
                  mostRecentPaymentStatus: relevantPayment.status,
                  mostRecentPaymentDate: relevantPayment.date,
                  relevantPaymentDate: relevantPayment.date
                };
              }

            } else if (exam.Status === 'Repeat') {
              // For Repeat exams: Check other_payment records for this specific course and time condition
              console.log('Debug: Checking repeat/prorata payment for course:', exam.cid);
              
              // Find the most recent other payment for this course
              const relevantOtherPayments = otherPaymentRecords?.filter(payment => 
                payment.cid === exam.cid &&
                (payment.paymenttype === 'Repeat Module' || payment.paymenttype === 'Prorata')
              ) || [];

              // Sort by date to get the most recent
              const sortedPayments = relevantOtherPayments.sort((a, b) => 
                new Date(b.date) - new Date(a.date)
              );

              const repeatPayment = sortedPayments.length > 0 ? sortedPayments[0] : null;

              let isUpcomingExam = false;
              if (repeatPayment) {
                // Check if exam date is in upcoming month compared to repeat/prorata payment date
                const examDate = new Date(exam.date);
                const paymentDate = new Date(repeatPayment.date);
                
                // Check if exam is in the same month or upcoming months after payment
                isUpcomingExam = examDate >= paymentDate;
              }

              console.log('Debug: Repeat exam time check:', {
                examId: exam.examid,
                examDate: exam.date,
                relevantOtherPayments,
                repeatPayment,
                isUpcomingExam
              });

              // Only show exam if there's a payment record AND it's upcoming
              if (repeatPayment && isUpcomingExam) {
                shouldShowExam = true;
                
                if (repeatPayment.status !== 'Completed') {
                  eligibilityMessage = `Not eligible because ${repeatPayment.paymenttype.toLowerCase()} payment is not completed`;
                } else {
                  isEligible = true;
                  eligibilityMessage = 'Eligible';
                }

                paymentDetails = {
                  paymentType: `${repeatPayment.paymenttype} Payment`,
                  mostRecentPaymentStatus: repeatPayment.status,
                  mostRecentPaymentDate: repeatPayment.date,
                  amount: repeatPayment.amount
                };
              }
            }
            
            // Only add exam to the list if it should be shown (has payment record and is upcoming)
            if (shouldShowExam) {
              eligibleExams.push({
                ...exam,
                isEligible: isEligible,
                eligibilityMessage: eligibilityMessage,
                ...paymentDetails
              });
            }
          }

          const examsWithEligibility = eligibleExams;

          console.log('Debug: Final exam schedule with eligibility:', examsWithEligibility);
          setExamSchedule(examsWithEligibility);
        }
      } else {
        console.log('Debug: No relevant courses found');
        setClassSchedule([]);
        setExamSchedule([]);
      }

    } catch (error) {
      console.error('Error fetching timetable data:', error);
    } finally {
      setTimetableLoading(false);
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
                Enrolled Modules
              </button>
              <button 
                className={activeTab === 'timetable' ? 'active-tab' : 'tab-button'}
                onClick={() => {
                  setActiveTab('timetable');
                  fetchTimetableData(studentData.sid);
                }}
                style={{ padding: '10px 20px', margin: '0 5px', border: '1px solid #ccc', backgroundColor: activeTab === 'timetable' ? '#007bff' : 'white', color: activeTab === 'timetable' ? 'white' : 'black' }}
              >
                Timetable
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
                                    disabled={enrollment.status === 'Completed'}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: enrollment.status === 'Completed' ? '#6c757d' : '#28a745',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: enrollment.status === 'Completed' ? 'not-allowed' : 'pointer',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      opacity: enrollment.status === 'Completed' ? 0.6 : 1
                                    }}
                                    title={enrollment.status === 'Completed' ? 'Cannot update completed payments' : 'Update enrollment'}
                                  >
                                    {enrollment.status === 'Completed' ? '🔒 Completed' : '✏️ Update'}
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
                                      disabled={payment.status === 'Completed'}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: payment.status === 'Completed' ? '#6c757d' : '#ffc107',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: payment.status === 'Completed' ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        opacity: payment.status === 'Completed' ? 0.6 : 1
                                      }}
                                      title={payment.status === 'Completed' ? 'Cannot update completed payments' : 'Update enrollment'}
                                    >
                                      {payment.status === 'Completed' ? '🔒 Completed' : '✏️ Update'}
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
                <h3>📊 Academic Results</h3>
                
                {examResultsLoading ? (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <div style={{ fontSize: '18px', marginBottom: '20px' }}>🔄 Loading Exam Results...</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      Fetching your academic records and calculating GPA...
                    </div>
                  </div>
                ) : examResults && examResults.groupedResults && Object.keys(examResults.groupedResults).length > 0 ? (
                  <div>
                    {/* Overall GPA Display */}
                    <div style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '30px',
                      textAlign: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      🎓 Overall GPA: {examResults.overallGPA}
                    </div>

                    {/* Results by Semester */}
                    {Object.keys(examResults.groupedResults)
                      .sort((a, b) => {
                        const aGroup = examResults.groupedResults[a];
                        const bGroup = examResults.groupedResults[b];
                        if (aGroup.year !== bGroup.year) {
                          return aGroup.year - bGroup.year;
                        }
                        return aGroup.semester - bGroup.semester;
                      })
                      .map((semesterKey) => {
                        const semesterData = examResults.groupedResults[semesterKey];
                        return (
                          <div key={semesterKey} style={{ marginBottom: '40px' }}>
                            {/* Semester Header with GPA */}
                            <div style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              padding: '15px 20px',
                              borderRadius: '8px 8px 0 0',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>📚 {semesterKey}</span>
                              <span>Semester GPA: {semesterData.semesterGPA}</span>
                            </div>

                            {/* Results Table for this semester */}
                            <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderTop: 'none' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                      <thead>
                                  <tr style={{ backgroundColor: '#f8f9fa', color: '#333' }}>
                                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Course Code</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Course Name</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Credits</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Type</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Marks</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Grade</th>
                                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Grade Points</th>
                        </tr>
                      </thead>
                      <tbody>
                                  {semesterData.results.map((result, index) => (
                                    <tr key={result.resultid || index} style={{ 
                                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                                      transition: 'background-color 0.2s'
                                    }}>
                                      <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                                        {result.course.cid}
                                      </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                        {result.course.cname}
                                      </td>
                                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                        {result.course.credits}
                                      </td>
                                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                        <span style={{
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          fontWeight: 'bold',
                                          backgroundColor: result.course.type === 'core' ? '#007bff' : '#6c757d',
                                          color: 'white'
                                        }}>
                                          {result.course.type?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                                        {result.marks}
                                      </td>
                                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                                        <span style={{ 
                                          fontWeight: 'bold', 
                                          padding: '6px 10px',
                                          borderRadius: '4px',
                                          backgroundColor: getGradeColor(result.grade),
                                          color: 'white'
                                        }}>
                                {result.grade}
                              </span>
                            </td>
                                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                                        {result.gradePoints?.toFixed(1) || '0.0'}
                                      </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                            </div>

                            {/* Semester Summary */}
                            <div style={{
                              backgroundColor: '#e9ecef',
                              padding: '15px 20px',
                              borderRadius: '0 0 8px 8px',
                              border: '1px solid #ddd',
                              borderTop: 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              <span>📈 Total Credits: {semesterData.totalCredits}</span>
                              <span>🎯 Grade Points: {semesterData.totalGradePoints.toFixed(2)}</span>
                              <span>📊 Semester GPA: {semesterData.semesterGPA}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    color: '#6c757d'
                  }}>
                    <h4>📋 No Exam Results Found</h4>
                    <p>Your academic results will appear here once they are available.</p>
                    
                    {/* Debug info */}
                    <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                      <p><strong>Debug Info:</strong></p>
                      <p>Student ID: {studentData?.sid || 'Not loaded'}</p>
                      <p>Results data type: {typeof examResults}</p>
                      <p>Has grouped results: {examResults?.groupedResults ? 'Yes' : 'No'}</p>
                      <p>Raw results count: {examResults?.rawResults?.length || 0}</p>
                      <p>Check browser console for detailed logs.</p>
                    </div>
                  </div>
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

            {/* Enrolled Modules Tab */}
            {activeTab === 'enrollment' && (
              <div className="enrolled-modules">
                <h3>📚 Enrolled Modules</h3>
                
                {/* Semester Modules */}
                <div style={{ marginBottom: '40px' }}>
                  <h4 style={{ color: '#007bff', marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
                    📅 Semester Modules
                  </h4>
                  {enrolledModules.semester.length > 0 ? (
                    <div style={{ display: 'grid', gap: '20px' }}>
                      {enrolledModules.semester.map((semesterModule, index) => (
                        <div key={semesterModule.paymentid} style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '20px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h5 style={{ color: '#007bff', margin: 0 }}>
                              Year {semesterModule.year} - Semester {semesterModule.semester}
                            </h5>
                            <span style={{
                              padding: '4px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {semesterModule.status}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                            <div><strong>Degree:</strong> {semesterModule.degree?.dname || 'N/A'}</div>
                            <div><strong>Enrollment Date:</strong> {new Date(semesterModule.date).toLocaleDateString()}</div>
                            <div><strong>Payment ID:</strong> {semesterModule.paymentid}</div>
                          </div>
                          
                          {/* Courses List */}
                          <div>
                            <h6 style={{ color: '#495057', marginBottom: '10px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                              📚 Courses ({semesterModule.courses?.length || 0})
                            </h6>
                            {semesterModule.courses && semesterModule.courses.length > 0 ? (
                              <div style={{ display: 'grid', gap: '10px' }}>
                                {semesterModule.courses.map((course, courseIndex) => (
                                  <div key={course.cid} style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '6px',
                                    padding: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 'bold', color: '#007bff', fontSize: '14px' }}>
                                        {course.cid} - {course.cname}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                                        {course.credits} Credits • {course.type}
                                      </div>
                                    </div>
                                    <div style={{
                                      padding: '3px 8px',
                                      backgroundColor: course.type === 'Core' ? '#28a745' : '#ffc107',
                                      color: course.type === 'Core' ? 'white' : '#212529',
                                      borderRadius: '12px',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}>
                                      {course.type}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: '#6c757d', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>
                                No courses found for this semester
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No completed semester enrollments found.</p>
                  )}
                </div>

                {/* Prorata Modules */}
                <div style={{ marginBottom: '40px' }}>
                  <h4 style={{ color: '#17a2b8', marginBottom: '20px', borderBottom: '2px solid #17a2b8', paddingBottom: '5px' }}>
                    📋 Prorata Modules
                  </h4>
                  {enrolledModules.prorata.length > 0 ? (
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {enrolledModules.prorata.map((prorataModule, index) => (
                        <div key={prorataModule.paymentid} style={{
                          backgroundColor: '#e7f6fd',
                          border: '1px solid #bee5eb',
                          borderRadius: '8px',
                          padding: '15px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h6 style={{ color: '#17a2b8', margin: 0 }}>
                              {prorataModule.course?.cid} - {prorataModule.course?.cname}
                            </h6>
                            <span style={{
                              padding: '3px 8px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}>
                              Prorata
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
                            <div><strong>Credits:</strong> {prorataModule.course?.credits || 'N/A'}</div>
                            <div><strong>Type:</strong> {prorataModule.course?.type || 'N/A'}</div>
                            <div><strong>Year:</strong> {prorataModule.year}</div>
                            <div><strong>Semester:</strong> {prorataModule.semester}</div>
                            <div><strong>Amount:</strong> LKR {prorataModule.amount || 'N/A'}</div>
                            <div><strong>Date:</strong> {new Date(prorataModule.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No completed prorata modules found.</p>
                  )}
                </div>

                {/* Repeat Modules */}
                <div style={{ marginBottom: '40px' }}>
                  <h4 style={{ color: '#dc3545', marginBottom: '20px', borderBottom: '2px solid #dc3545', paddingBottom: '5px' }}>
                    🔄 Repeat Modules
                  </h4>
                  {enrolledModules.repeat.length > 0 ? (
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {enrolledModules.repeat.map((repeatModule, index) => (
                        <div key={repeatModule.paymentid} style={{
                          backgroundColor: '#fdf2f2',
                          border: '1px solid #f5c6cb',
                          borderRadius: '8px',
                          padding: '15px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h6 style={{ color: '#dc3545', margin: 0 }}>
                              {repeatModule.course?.cid} - {repeatModule.course?.cname}
                            </h6>
                            <span style={{
                              padding: '3px 8px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}>
                              Repeat
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
                            <div><strong>Credits:</strong> {repeatModule.course?.credits || 'N/A'}</div>
                            <div><strong>Type:</strong> {repeatModule.course?.type || 'N/A'}</div>
                            <div><strong>Year:</strong> {repeatModule.year}</div>
                            <div><strong>Semester:</strong> {repeatModule.semester}</div>
                            <div><strong>Amount:</strong> LKR {repeatModule.amount || 'N/A'}</div>
                            <div><strong>Date:</strong> {new Date(repeatModule.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No completed repeat modules found.</p>
                  )}
                </div>
              </div>
            )}

            {/* Timetable Tab */}
            {activeTab === 'timetable' && (
              <div className="timetable-content">
                <h3>📅 Student Timetable</h3>
                
                {timetableLoading ? (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p>Loading timetable data...</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    
                    {/* Class Schedule */}
                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
                      <h4 style={{ color: '#007bff', marginBottom: '20px', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
                        📚 Class Schedule
                      </h4>
                      
                      {classSchedule.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {classSchedule.map((classItem, index) => (
                            <div key={classItem.classtimetableid} style={{
                              backgroundColor: 'white',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              padding: '15px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div>
                                  <h6 style={{ color: '#007bff', margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>
                                    {classItem.course?.cname || 'Class Session'}
                                  </h6>
                                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#495057' }}>
                                    <strong>{classItem.course?.cid}</strong> - Year {classItem.course?.year} • Semester {classItem.course?.semester}
                                  </p>
                                </div>
                                <span style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#e3f2fd',
                                  color: '#1976d2',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  {classItem.course?.credits || 'N/A'} Credits
                                </span>
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px', color: '#6c757d' }}>
                                <div><strong>📅 Date:</strong> {new Date(classItem.date).toLocaleDateString()}</div>
                                <div><strong>🕐 Time:</strong> {classItem.starttime} - {classItem.endtime}</div>
                                <div><strong>👨‍🏫 Lecturer:</strong> {classItem.lecturer?.name || 'TBD'}</div>
                                <div><strong>📍 Location:</strong> {classItem.location?.location || 'TBD'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                          <p style={{ fontSize: '16px', marginBottom: '10px' }}>📅 No upcoming classes found</p>
                          <p style={{ fontSize: '14px', fontStyle: 'italic' }}>
                            Your class schedule for the next 2 weeks will appear here.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Exam Schedule */}
                    <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px' }}>
                      <h4 style={{ color: '#856404', marginBottom: '20px', borderBottom: '2px solid #856404', paddingBottom: '5px' }}>
                        📝 Exam Schedule
                      </h4>
                      
                      {examSchedule.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {examSchedule.map((exam, index) => (
                            <div key={exam.examid || index} style={{
                              backgroundColor: 'white',
                              border: `2px solid ${exam.isEligible ? '#28a745' : '#dc3545'}`,
                              borderRadius: '8px',
                              padding: '15px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              opacity: exam.isEligible ? 1 : 0.8
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div>
                                  <h6 style={{ color: '#856404', margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>
                                    {exam.examcategory} Exam - {exam.course?.cname}
                                  </h6>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#495057' }}>
                                    Course: <strong>{exam.cid}</strong> • {exam.course?.credits} Credits
                                  </p>
                                  <p style={{ margin: '0', fontSize: '13px', color: '#6c757d' }}>
                                    Year {exam.course?.year} • Semester {exam.course?.semester}
                                  </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{
                                    padding: '4px 8px',
                                    backgroundColor: exam.isEligible ? '#d4edda' : '#f8d7da',
                                    color: exam.isEligible ? '#155724' : '#721c24',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    display: 'block',
                                    marginBottom: '5px'
                                  }}>
                                    {exam.isEligible ? '✅ Eligible' : '❌ Not Eligible'}
                                  </span>
                                  <span style={{
                                    padding: '3px 6px',
                                    backgroundColor: exam.Status === 'Proper' ? '#e3f2fd' : '#fff3e0',
                                    color: exam.Status === 'Proper' ? '#1976d2' : '#f57c00',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                  }}>
                                    {exam.Status}
                                  </span>
                                </div>
                              </div>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px', color: '#6c757d', marginBottom: '10px' }}>
                                <div><strong>📅 Date:</strong> {new Date(exam.date).toLocaleDateString()}</div>
                                <div><strong>🕐 Time:</strong> {exam.starttime} - {exam.endtime}</div>
                                <div><strong>📋 Category:</strong> {exam.examcategory}</div>
                                <div><strong>🎯 Status:</strong> {exam.Status}</div>
                                <div><strong>📍 Location:</strong> {exam.location?.location || 'TBD'}</div>
                                <div><strong>🏢 Venue ID:</strong> {exam.location?.vid || 'N/A'}</div>
                              </div>

                              {!exam.isEligible && (
                                <div style={{
                                  backgroundColor: '#f8d7da',
                                  border: '1px solid #f5c6cb',
                                  borderRadius: '6px',
                                  padding: '10px',
                                  fontSize: '13px',
                                  color: '#721c24'
                                }}>
                                  <strong>⚠️ Not eligible because {exam.Status === 'Repeat' ? 'repeat module' : 'semester'} payment is not completed</strong>
                                </div>
                              )}

                              {exam.isEligible && (
                                <div style={{
                                  backgroundColor: '#d4edda',
                                  border: '1px solid #c3e6cb',
                                  borderRadius: '6px',
                                  padding: '8px',
                                  fontSize: '12px',
                                  color: '#155724',
                                  marginTop: '10px'
                                }}>
                                  <strong>✅ Payment completed</strong>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                          <p style={{ fontSize: '16px', marginBottom: '10px' }}>📝 No exam information found</p>
                          <p style={{ fontSize: '14px', fontStyle: 'italic' }}>
                            Your exam schedule and results will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timetable Legend */}
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
                  <h5 style={{ marginBottom: '15px', color: '#495057' }}>📋 Legend</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#007bff', borderRadius: '3px' }}></div>
                      <span>Class Schedule</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#856404', borderRadius: '3px' }}></div>
                      <span>Exam Schedule</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '3px' }}></div>
                      <span>✅ Eligible for Exam (Payment Complete)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '3px' }}></div>
                      <span>❌ Not Eligible (Payment Incomplete)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#1976d2', borderRadius: '3px' }}></div>
                      <span>Proper Exam</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#f57c00', borderRadius: '3px' }}></div>
                      <span>Repeat Exam</span>
                    </div>
                  </div>
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