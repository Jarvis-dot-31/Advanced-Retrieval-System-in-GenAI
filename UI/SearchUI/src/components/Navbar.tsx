import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { FiSun, FiMoon, FiSearch, FiLogOut, FiLogIn } from 'react-icons/fi';
import { Navbar as BsNavbar, Nav, Container, Button } from 'react-bootstrap';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <BsNavbar
      expand="lg"
      className="app-navbar py-2"
      sticky="top"
    >
      <Container>
        <BsNavbar.Brand as={Link} to="/" className="brand-logo d-flex align-items-center gap-2">
          <FiSearch size={22} className="brand-icon" />
          <span className="fw-bold">HybridSearch</span>
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="main-navbar" />

        <BsNavbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link
              as={Link}
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Home
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/search"
              className={location.pathname === '/search' ? 'active' : ''}
            >
              Search
            </Nav.Link>
          </Nav>

          <div className="d-flex align-items-center gap-3">
            <button
              id="theme-toggle"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="theme-icon-wrapper">
                {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
              </span>
            </button>

            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-2">
                <span className="user-greeting d-none d-md-inline">
                  Hi, {user?.name}
                </span>
                <Button
                  id="logout-btn"
                  variant="outline-danger"
                  size="sm"
                  onClick={handleLogout}
                  className="d-flex align-items-center gap-1"
                >
                  <FiLogOut size={14} />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                id="login-btn"
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                className="d-flex align-items-center gap-1 btn-accent"
              >
                <FiLogIn size={14} />
                Login
              </Button>
            )}
          </div>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}
