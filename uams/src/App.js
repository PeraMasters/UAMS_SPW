import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import About from "./components/About";
import Login from "./components/Login";
import ExamDashboard from "./components/exam/ExamDashboard";
import AcademicCordinatorDashboard from "./components/academic-cordinator/AcademicCordinatorDashboard";
import TimetableDashboard from "./components/timetable/TimetableDashboard";
import StudentControlDashboard from "./components/student-control/StudentControlDashboard";
import StudentDashboard from "./components/student/StudentDashboard";
import "./components/Dashboard.css";
import ExamResult from "./components/exam/ExamResult";
import ExamTimetable from "./components/exam/ExamTimetable";
import ExamAdmission  from "./components/exam/ExamAdmission";
import AddStudentIntoExam from "./components/exam/Exam";
import ExamAttendance from "./components/exam/ExamAttendance";

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
          path="/exam-attendance"
          element={
            <ProtectedRoute>
              <ExamAttendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/academic-cordinator-dashboard"
          element={
            <ProtectedRoute>
              <AcademicCordinatorDashboard />
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
          path="/student-dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;