import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const NavBar = ({ showHomeAbout = false, showLogin = false }) => {
  const navigate = useNavigate();
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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
    fontSize: '27px',  // Font size
    margin: 0          // Remove default margin
  };

  // Style for the navigation links
  const navLinkStyle = {
    color: '#342D2D',  // Dark gray color for nav links
    fontSize: '16px',
    fontWeight: '500',
    textDecoration: 'none'
  };

  // Style for the button - changes based on hover state
  const buttonStyle = {
    backgroundColor: isButtonHovered ? '#342D2D' : 'transparent',
    border: '1px solid #342D2D',
    color: isButtonHovered ? '#E6BB0C' : '#342D2D',
    padding: '4px 8px',  // Reduced padding to make button smaller
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.3s ease'  // Smooth transition for hover effect
  };

  // Style for the button text - changes based on hover state
  const buttonTextStyle = {
    color: isButtonHovered ? '#E6BB0C' : '#342D2D',
    textDecoration: 'none',
    fontSize: '16px',
    transition: 'all 0.3s ease'  // Smooth transition for hover effect
  };

  // Style for nav list items
  const navItemStyle = {
    display: 'inline-block',
    margin: '0 10px'
  };

  // Style for the navbar container
  const navbarContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 20px',  // Reduced vertical padding
    maxWidth: '1200px',
    margin: '0 auto'
  };

  return (
    <nav className="navbar" style={navbarStyle}>
      <div className="navbar-container" style={navbarContainerStyle}>
        <h1 style={uamsStyle}>UAMS</h1>
        <ul style={{ display: 'flex', alignItems: 'center', listStyle: 'none', margin: 0, padding: 0 }}>
          {showHomeAbout && (
            <>
              <li style={navItemStyle}><Link to="/" style={navLinkStyle}>Home</Link></li>
              <li style={navItemStyle}><span style={navLinkStyle} onClick={scrollToAbout}>About</span></li>
            </>
          )}
          <li style={navItemStyle}>
            <button 
              className="btn" 
              style={buttonStyle}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              onClick={showLogin ? () => navigate('/login') : handleSignOut}
            >
              {showLogin ? (
                <span style={buttonTextStyle}>Login</span>
              ) : (
                <span style={buttonTextStyle}>Sign Out</span>
              )}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default NavBar; 