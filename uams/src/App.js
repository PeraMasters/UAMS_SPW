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

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  // In a real app, you would check if the user is authenticated
  // For now, we'll just render the children
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes for different roles */}
        <Route 
          path="/exam-dashboard" 
          element={
            <ProtectedRoute>
              <ExamDashboard />
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
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
