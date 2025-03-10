import { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css"; // Import CSS file from the same folder

const Home = () => {
  const [showLogin, setShowLogin] = useState(false); // State to show/hide login form

  const toggleLoginForm = () => {
    setShowLogin(!showLogin);
  };

  const scrollToAbout = () => {
    const aboutSection = document.getElementById('about-section');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <h1>University Management</h1>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li onClick={scrollToAbout}>About</li>
            <li>
              <button className="login-button"><Link to="/login">Login</Link></button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <h2>Welcome to the University Academic Management System</h2>
        <p>Manage students, courses, and faculty seamlessly.</p>
      </header>

      {/* MIddle Section */}
      <section id="middle-section" className="middle-section">
        <h2>middle middle middlemiddlemiddlemiddlemiddle</h2>
        <p>middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
        middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
        middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
        middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
        middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
        middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
        middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
        middlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddlemiddle
         system is designed to manage students, courses, and faculty seamlessly, providing a comprehensive solution for academic management.</p>
      </section>



      {/* About Us Section */}
      <section id="about-section" className="about-section">
        <h2>About the University Management System</h2>
        <p>This system is designed to manage students, courses, and faculty seamlessly, providing a comprehensive solution for academic management.</p>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 University Management System. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
