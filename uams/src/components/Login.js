import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Login form state
  const [loginFormData, setLoginFormData] = useState({
    username: "",
    password: "",
  });

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
      <nav className="navbar">
        <div className="navbar-container">
          <h1>University Management</h1>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/#about-section">About</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>
      </nav>

      <div className="form-container">
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

            <button type="submit" disabled={isLoading}>
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
  