import React from "react";
import "./Home.css"; // Import CSS file from the same folder
import monashuBg from "./images/monashu.jpg"; // Import the image directly
import PublicNavBar from "./PublicNavBar";

const Home = () => {
  // Create a style object for the hero section background
  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${monashuBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: '450px',  // Increase the height of the hero section
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: '50px'  // Reduced margin to compensate for smaller navbar
  };

  // Style for the About Us section square container
  const aboutSectionStyle = {
    border: '2px solid #342D2D',  // Same dark gray as other elements
    padding: '30px',
    maxWidth: '800px',
    margin: '3rem auto',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',  // Light background
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'  // Subtle shadow
  };

  // Style for the About Us heading
  const aboutHeadingStyle = {
    color: '#342D2D',
    marginBottom: '1rem',
    fontSize: '1.8rem'
  };

  // Style for the About Us paragraph
  const aboutTextStyle = {
    color: '#555',
    lineHeight: '1.6',
    fontSize: '1.1rem'
  };

  // Style for the footer
  const footerStyle = {
    backgroundColor: '#342D2D',
    color: 'white',
    padding: '20px 0',
    textAlign: 'center',
    marginTop: '2rem'
  };

  return (
    <div className="home-page">
      {/* Use the PublicNavBar component */}
      <PublicNavBar />

      {/* Hero Section */}
      <header className="hero" style={heroStyle}>
        <h2>Welcome to the University Academic Management System</h2>
        <p>Manage students, courses, and faculty seamlessly.</p>
      </header>

    

      {/* About Us Section */}
      <section id="about-section" style={aboutSectionStyle}>
        <h2 style={aboutHeadingStyle}>About the University Management System</h2>
        <p style={aboutTextStyle}>This system is designed to manage students, courses, and faculty seamlessly, providing a comprehensive solution for academic management. Our University Academic Management System (UAMS) streamlines administrative processes, enhances communication between departments, and provides real-time data for informed decision-making.</p>
      </section>

      {/* Footer */}
      <footer className="footer" style={footerStyle}>
        <p>© 2025 University Management System. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
