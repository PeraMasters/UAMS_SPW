import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const PublicNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  
  // Check if we're on the login page (we'll keep this check for future use if needed)
  const isLoginPage = location.pathname === '/login';

  const scrollToAbout = () => {
    const aboutSection = document.getElementById('about-section');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Style for the navigation bar
  const navbarStyle = {
    backgroundColor: 'rgba(230, 187, 12, 0.85)',  // Semi-transparent yellow
    color: 'white',
    position: 'fixed',  // Fixed position
    top: 0,             // Stick to top
    left: 0,            // Start from left edge
    width: '100%',      // Full width
    zIndex: 1000,       // Ensure it stays on top of other content
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',  // Add subtle shadow
    backdropFilter: 'blur(5px)'  // Add blur effect to background
  };

  // Style for the UAMS text
  const uamsStyle = {
    color: '#342D2D',  // Dark gray color for UAMS text
    fontSize: '27px',  // Font size - matched with DashboardNavBar
    margin: 0          // Remove default margin
  };

  // Style for the navigation links
  const navLinkStyle = {
    color: '#342D2D',  // Dark gray color for nav links
    fontSize: '16px',
    fontWeight: '500',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    height: '100%'
  };

  // Style for the login button - changes based on hover state
  const loginButtonStyle = {
    backgroundColor: isLoginHovered ? '#342D2D' : 'transparent',
    border: '1px solid #342D2D',
    color: isLoginHovered ? '#E6BB0C' : '#342D2D',
    padding: '4px 8px',  // Same padding as DashboardNavBar button
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',    // Same font size as DashboardNavBar button
    fontWeight: '500',
    transition: 'all 0.3s ease',  // Smooth transition for hover effect
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: '-2px'          // Match the vertical positioning of the dashboard nav
  };

  // Style for active (current page) login button
  const activeLoginButtonStyle = {
    ...loginButtonStyle,
    backgroundColor: '#342D2D',
    color: '#E6BB0C',
    cursor: 'default'
  };

  // Style for the login link inside the button - changes based on hover state
  const loginLinkStyle = {
    color: isLoginHovered ? '#E6BB0C' : '#342D2D',
    textDecoration: 'none',
    fontSize: '16px',
    transition: 'all 0.3s ease'  // Smooth transition for hover effect
  };

  // Style for active login link
  const activeLoginLinkStyle = {
    color: '#E6BB0C',
    textDecoration: 'none',
    fontSize: '16px'
  };

  // Style for nav list items
  const navItemStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    margin: '0 10px',
    height: '100%',
    position: 'relative',
    top: '-2px'          // Match the vertical positioning of the dashboard nav
  };

  // Style for the navbar container
  const navbarContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 20px',  // Exact same padding as DashboardNavBar
    maxWidth: '1200px',
    margin: '0 auto',
    height: '44px'        // Explicitly set height to match DashboardNavBar
  };

  // Style for ul container to center vertically
  const ulStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    listStyle: 'none', 
    margin: 0, 
    padding: 0,
    height: '100%'
  };

  return (
    <nav className="navbar" style={navbarStyle}>
      <div className="navbar-container" style={navbarContainerStyle}>
        <h1 style={uamsStyle}>UAMS</h1>
        <ul style={ulStyle}>
          <li style={navItemStyle}><Link to="/" style={navLinkStyle}>Home</Link></li>
          <li style={navItemStyle}><span style={navLinkStyle} onClick={scrollToAbout}>About</span></li>
          <li style={navItemStyle}>
            {isLoginPage ? (
              <button 
                className="login-button" 
                style={activeLoginButtonStyle}
              >
                <span style={activeLoginLinkStyle}>Login</span>
              </button>
            ) : (
              <button 
                className="login-button" 
                style={loginButtonStyle}
                onMouseEnter={() => setIsLoginHovered(true)}
                onMouseLeave={() => setIsLoginHovered(false)}
                onClick={() => navigate('/login')}
              >
                <span style={loginLinkStyle}>Login</span>
              </button>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default PublicNavBar; 