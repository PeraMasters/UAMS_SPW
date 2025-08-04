import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import "./Login.css";
import PublicNavBar from "./PublicNavBar";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  
  // Login form state
  const [loginFormData, setLoginFormData] = useState({
    username: "",
    password: "",
  });

  // Button styles for the login form submit button
  const buttonStyle = {
    backgroundColor: '#E6BB0C', // Yellow background
    color: '#342D2D',           // Dark text
    width: '100%',
    padding: '10px',
    border: '2px solid #342D2D', // Added border
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'all 0.3s ease',
    // Show dark color (#342D2D) when hovered/active
    ...(isButtonHovered && {
      backgroundColor: '#342D2D', // Dark color (specified as "brown")
      color: '#ffffff'            // White text for better contrast
    })
  };

  // Button styles for disabled state
  const disabledButtonStyle = {
    backgroundColor: '#cccccc',
    color: '#666666',
    width: '100%',
    padding: '10px',
    border: '2px solid #999999', // Added border for disabled state
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'not-allowed',
    marginTop: '1rem'
  };

  const handleLoginInputChange = (e) => {
    setLoginFormData({
      ...loginFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      console.log("Attempting login with:", { username: loginFormData.username }); // Debug log
      
      // Query the Login table
      const { data, error } = await supabase
        .from("login")
        .select("*")
        .eq("user_name", loginFormData.username)
        .eq("password", loginFormData.password)
        .single();

      console.log("Supabase response:", { data, error }); // Debug log

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (data) {
        console.log("Login successful, user data:", data); // Debug log
        
        // Store user session data in localStorage
        localStorage.setItem('userSession', JSON.stringify({
          id: data.id,
          username: data.user_name,
          role: data.role,
          loginTime: new Date().toISOString()
        }));
        
        // Route based on user role
        redirectBasedOnRole(data.role);
      } else {
        setErrorMessage("Invalid username or password");
      }
    } catch (error) {
      console.error("Error during login:", error.message);
      if (error.message.includes("JWT")) {
        setErrorMessage("Database connection error. Please check your Supabase configuration.");
      } else if (error.message.includes("relation") || error.message.includes("does not exist")) {
        setErrorMessage("Table 'login' not found. Please check your database setup.");
      } else {
        setErrorMessage("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to redirect based on user role
  const redirectBasedOnRole = (role) => {
    console.log("User role from database:", role); // Debug log
    switch (role) {
      case "Exam Unit":
        navigate("/exam-dashboard");
        break;
      case "Academic Unit":
        navigate("/academic-cordinator-dashboard");
        break;
      case "Timetable Unit":
        navigate("/timetable-dashboard");
        break;
      case "Student controll Unit":
        navigate("/student-control-dashboard");
        break;
      case "Student":
        navigate("/student-dashboard");
        break;
      default:
        // If role is not recognized, redirect to home
        console.log("Unrecognized role:", role);
        setErrorMessage(`Unrecognized role: ${role}`);
        navigate("/");
        break;
    }
  };

  return (
    <div className="login-container">
      {/* Use the PublicNavBar component */}
      <PublicNavBar />

      <div className="form-container" style={{ marginTop: '60px' }}>
        <div className="login-form">
          <h2>Login</h2>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={loginFormData.username}
                onChange={handleLoginInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={loginFormData.password}
                onChange={handleLoginInputChange}
                required
              />
            </div>

            <button 
              type="submit" 
              style={isLoading ? disabledButtonStyle : buttonStyle} 
              disabled={isLoading}
              onMouseDown={() => setIsButtonHovered(true)}
              onMouseUp={() => setIsButtonHovered(false)}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
          <p className="login-info">
            Please contact an administrator for account creation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
  