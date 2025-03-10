import { useState } from "react";
import { Link } from "react-router-dom";

const Login = () => {
  const [showLogin, setShowLogin] = useState(true); // State to show/hide login form

  return (
    <div className="min-h-screen flex items-center justify-center">
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

      {showLogin ? (
        <div className="login-form">
          <h2 className="text-3xl font-bold">Login Page</h2>
          <form>
            <label>Username:</label>
            <input type="name" placeholder="Enter your username" required />

            <label>Password:</label>
            <input type="password" placeholder="Enter your password" required />

            <button type="submit">Login</button>
          </form>
          <p>
            Want to sign up? <button onClick={() => setShowLogin(false)}>Sign Up</button>
          </p>
        </div>
      ) : (
        <div className="login-form">
          <h2 className="text-3xl font-bold">Sign Up Page</h2>
          <form>
            <label>Email:</label>
            <input type="email" placeholder="Enter your email" required />

            <label>Password:</label>
            <input type="password" placeholder="Enter your password" required />

            <button type="submit">Sign Up</button>
          </form>
          <p>
            Already have an account? <button onClick={() => setShowLogin(true)}>Login</button>
          </p>
        </div>
      )}
    </div>
  );
};

export default Login;
  