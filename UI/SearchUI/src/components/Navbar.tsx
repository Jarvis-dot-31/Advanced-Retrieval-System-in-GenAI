'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { FiSun, FiMoon, FiSearch, FiLogOut, FiLogIn, FiUserPlus, FiUploadCloud } from 'react-icons/fi';
import { Navbar as BsNavbar, Nav, Container, Button, Badge } from 'react-bootstrap';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const dashboardPath = user?.role === 'recruiter' ? '/search' : '/upload';
  const roleLabel = user?.role === 'recruiter' ? 'Recruiter' : 'Job Seeker';

  return (
    <BsNavbar
      expand="lg"
      className="app-navbar py-2"
      sticky="top"
    >
      <Container>
        <BsNavbar.Brand as={Link} href="/" className="brand-logo d-flex align-items-center gap-2">
          <FiSearch size={22} className="brand-icon" />
          <span className="fw-bold">INSIGHT</span>
        </BsNavbar.Brand>

        <BsNavbar.Toggle aria-controls="main-navbar" />

        <BsNavbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link
              as={Link}
              href="/"
              className={pathname === '/' ? 'active' : ''}
            >
              Home
            </Nav.Link>
            {isAuthenticated && user?.role === 'recruiter' && (
              <Nav.Link
                as={Link}
                href="/search"
                className={pathname === '/search' ? 'active' : ''}
              >
                <FiSearch size={14} className="me-1" />
                Search
              </Nav.Link>
            )}
            {isAuthenticated && user?.role === 'user' && (
              <Nav.Link
                as={Link}
                href="/upload"
                className={pathname === '/upload' ? 'active' : ''}
              >
                <FiUploadCloud size={14} className="me-1" />
                Upload Resume
              </Nav.Link>
            )}
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
                <span className="user-greeting d-none d-md-inline d-flex align-items-center gap-2">
                  Hi, {user?.name}
                  <Badge className="role-badge" bg="none">
                    {roleLabel}
                  </Badge>
                </span>
                <Button
                  id="dashboard-btn"
                  variant="outline-primary"
                  size="sm"
                  onClick={() => router.push(dashboardPath)}
                  className="d-flex align-items-center gap-1 btn-signup-nav d-lg-none"
                >
                  {user?.role === 'recruiter' ? <FiSearch size={14} /> : <FiUploadCloud size={14} />}
                  Dashboard
                </Button>
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
              <>
                <Button
                  id="signup-nav-btn"
                  variant="outline-primary"
                  size="sm"
                  onClick={() => router.push('/signup')}
                  className="d-flex align-items-center gap-1 btn-signup-nav"
                >
                  <FiUserPlus size={14} />
                  Sign Up
                </Button>
                <Button
                  id="login-btn"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="d-flex align-items-center gap-1 btn-accent"
                >
                  <FiLogIn size={14} />
                  Login
                </Button>
              </>
            )}
          </div>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}
