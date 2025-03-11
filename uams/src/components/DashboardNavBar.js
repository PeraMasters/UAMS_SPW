import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const DashboardNavBar = () => {
  const navigate = useNavigate();
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
    fontSize: '27px',  // Font size - must match PublicNavBar
    margin: 0          // Remove default margin
  };

  // Style for the sign out button - changes based on hover state
  const buttonStyle = {
    backgroundColor: isButtonHovered ? '#342D2D' : 'transparent',
    border: '1px solid #342D2D',
    color: isButtonHovered ? '#E6BB0C' : '#342D2D',
    padding: '4px 8px',  // Same padding as PublicNavBar button
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',    // Same font size as PublicNavBar button
    fontWeight: '500',
    transition: 'all 0.3s ease',  // Smooth transition for hover effect
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative', // For positioning adjustments
    top: '-10px'          // Shift button slightly upward
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
    margin: '0 10px',
    position: 'relative', // For positioning adjustments
    top: '-2px'          // Shift list item slightly upward
  };

  // Style for the navbar container
  const navbarContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 20px',  // Exact same padding as PublicNavBar
    maxWidth: '1200px',
    margin: '0 auto',
    height: '44px'        // Explicitly set height to match PublicNavBar
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
          <li style={navItemStyle}>
            <button 
              className="sign-out-btn" 
              style={buttonStyle}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              onClick={handleSignOut}
            >
              <span style={buttonTextStyle}>Sign Out</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default DashboardNavBar; 