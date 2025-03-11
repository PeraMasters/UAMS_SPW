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
      // Query the Login table
      const { data, error } = await supabase
        .from("Login")
        .select("*")
        .eq("user_name", loginFormData.username)
        .eq("password", loginFormData.password)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Route based on user role
        redirectBasedOnRole(data.role);
      } else {
        setErrorMessage("Invalid username or password");
      }
    } catch (error) {
      console.error("Error during login:", error.message);
      setErrorMessage("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to redirect based on user role
  const redirectBasedOnRole = (role) => {
    switch (role) {
      case "exam":
        navigate("/exam-dashboard");
        break;
      case "academic cordinator":
        navigate("/academic-cordinator-dashboard");
        break;
      case "timetable":
        navigate("/timetable-dashboard");
        break;
      case "student controll":
        navigate("/student-control-dashboard");
        break;
      case "student":
        navigate("/student-dashboard");
        break;
      default:
        // If role is not recognized, redirect to home
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
  