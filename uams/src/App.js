import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import About from "./components/About";
import Login from "./components/Login";

import ExamDashboard from "./components/exam/ExamDashboard";
import AcademicCordinatorDashboard from "./components/academic-cordinator/AcademicCordinatorDashboard";
import TimetableDashboard from "./components/timetable/TimetableDashboard";
import StudentDashboard from "./components/student/StudentDashboard";
import StudentControlDashboard from "./components/student-control/StudentControlDashboard";

import StudentRegistration from "./components/student-control/StudentRegistration";
import StudentRegistrationAndAccountCreation from "./components/student-control/StudentRegistrationAndAccountCreation";
import StudentAccountCreation from "./components/student-control/StudentAccountCreation";
import StudentEnrollmentManagement from "./components/student-control/StudentEnrollmentManagement";
import StudentInquiriesManagement from "./components/student-control/StudentInquiriesManagement";
import PaymentDetails from "./components/student/PaymentDetails";

import "./components/Dashboard.css";

import ExamResult from "./components/exam/ExamResult";
import ExamTimetable from "./components/exam/ExamTimetable";
import ExamAdmission  from "./components/exam/ExamAdmission";
import AddStudentIntoExam from "./components/exam/Exam";
//import ExamAttendance from "./components/exam/ExamAttendance";


import StudentDetails from "./components/academic-cordinator/StudentDetails";
import TimetableDisplay from './components/academic-cordinator/LectureTimeTable';
import ViewMyownTimetable from './components/academic-cordinator/ViewMyownTimetable';
import EDashboard from "./components/academic-cordinator/EDashboard";
import ExamAttendenceView from "./components/academic-cordinator/examattendenceview";

import AcademicConfirmAttendence from './components/academic-cordinator/AcademicConfirmAttendence';
import LectureAttendanceConfirm from './components/academic-cordinator/LectureAttendanceConfirm';
import ConfirmAttendence from "./components/academic-cordinator/confirmattendence";
import AcademicFullView from './components/academic-cordinator/AcademicFullView';


const ProtectedRoute = ({ children }) => {
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/exam-dashboard"
          element={
            <ProtectedRoute>
              <ExamDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-result"
          element={
            <ProtectedRoute>
              <ExamResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam"
          element={
            <ProtectedRoute>
              <AddStudentIntoExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-admission"
          element={
            <ProtectedRoute>
              <ExamAdmission />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam-timetable"
          element={
            <ProtectedRoute>
              <ExamTimetable />
            </ProtectedRoute>
          }
        />

     
        <Route
          path="/timetable-dashboard"
          element={
            <ProtectedRoute>
              <TimetableDashboard />
            </ProtectedRoute>
          }
        /> 
        <Route
          path="/student-control-dashboard"
          element={
            <ProtectedRoute>
              <StudentControlDashboard />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/student-registration" 
          element={
            <ProtectedRoute>
              <StudentRegistration />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-registration-and-account-creation" 
          element={
            <ProtectedRoute>
              <StudentRegistrationAndAccountCreation />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student-account-creation" 
          element={
            <ProtectedRoute>
              <StudentAccountCreation />
            </ProtectedRoute>
          } 
        />
         <Route 
          path="/student-enrollment" 
          element={
            <ProtectedRoute>
              <StudentEnrollmentManagement />
            </ProtectedRoute>
          } 
        />

         <Route 
          path="/student-inquiries-management" 
          element={
            <ProtectedRoute>
              <StudentInquiriesManagement />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/student-dashboard" 
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/payment-details" 
          element={
            <ProtectedRoute>
              <PaymentDetails />
            </ProtectedRoute>
          } 
        />
        <Route path="/student-details" 
          element={<StudentDetails />} />
     
        <Route path="/lecture-time-table"
          element={<TimetableDisplay />} />
        

         <Route 
                  path="/academic-coordinator-dashboard" 
                  element={
                    <ProtectedRoute>
                       <AcademicCordinatorDashboard />
                    </ProtectedRoute>
          } 
        />
        <Route path="/" element={<StudentDetails />} />
        <Route path="/view-my-own-timetable" element={<ViewMyownTimetable />} />
    
        
        <Route path="/academic-confirm-attendance" element={<AcademicConfirmAttendence />} />
        <Route path="/lecture-attendance-confirm/:lectureId" element={<LectureAttendanceConfirm />} />
        <Route path="/examattendenceview" element={<ExamAttendenceView />} />
        <Route path="/confirmattendence" element={<ConfirmAttendence />} />
        
        <Route path="/e-dashboard" element={<EDashboard />} />
        <Route path="/exam-attendence" element={<ExamAttendenceView />} />
        <Route path="/exam-attendence/download" element={<div style={{padding:20}}>Download page (implement)</div>} />
        <Route path="/exam-attendence/upload" element={<div style={{padding:20}}>Upload page (implement)</div>} />
        <Route path="/exam-attendence/confirm" element={<div style={{padding:20}}>Confirm page (implement)</div>} />
          <Route path="/academic-full-view" element={<AcademicFullView />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;