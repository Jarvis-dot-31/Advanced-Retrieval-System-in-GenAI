import { useState, type FormEvent } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { FiMail, FiLock, FiUser, FiUserPlus, FiUploadCloud, FiSearch } from 'react-icons/fi';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect based on role
  if (isAuthenticated && user) {
    const redirectTo = user.role === 'recruiter' ? '/search' : '/upload';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const success = await signup(name, email, password, role);
      if (success) {
        const redirectTo = role === 'recruiter' ? '/search' : '/upload';
        navigate(redirectTo, { replace: true });
      } else {
        setError('Sign up failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center">
      <Container style={{ maxWidth: 480 }}>
        <Card className="login-card border-0 shadow-lg">
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="login-icon-wrapper mb-3">
                <FiUserPlus size={28} />
              </div>
              <h2 className="fw-bold mb-1">Create Account</h2>
              <p className="text-muted-custom">Sign up to get started with INSIGHT</p>
            </div>

            {error && (
              <Alert variant="danger" className="py-2 small" id="signup-error">
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit} id="signup-form">
              {/* ─── Role Selector ──────────────────────── */}
              <div className="role-selector-group mb-4" id="role-selector">
                <Form.Label className="small fw-medium d-block mb-2">I am a…</Form.Label>
                <div className="role-toggle-wrapper">
                  <button
                    type="button"
                    className={`role-toggle-btn ${role === 'user' ? 'active' : ''}`}
                    onClick={() => setRole('user')}
                    id="role-user-btn"
                  >
                    <FiUploadCloud size={20} />
                    <span className="role-label">Job Seeker</span>
                    <span className="role-desc">Upload your resume</span>
                  </button>
                  <button
                    type="button"
                    className={`role-toggle-btn ${role === 'recruiter' ? 'active' : ''}`}
                    onClick={() => setRole('recruiter')}
                    id="role-recruiter-btn"
                  >
                    <FiSearch size={20} />
                    <span className="role-label">Recruiter</span>
                    <span className="role-desc">Search for candidates</span>
                  </button>
                </div>
              </div>

              <Form.Group className="mb-3" controlId="signup-name">
                <Form.Label className="small fw-medium">Full Name</Form.Label>
                <div className="input-icon-wrapper">
                  <FiUser className="input-icon" size={16} />
                  <Form.Control
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="ps-5"
                    autoFocus
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3" controlId="signup-email">
                <Form.Label className="small fw-medium">Email address</Form.Label>
                <div className="input-icon-wrapper">
                  <FiMail className="input-icon" size={16} />
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ps-5"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3" controlId="signup-password">
                <Form.Label className="small fw-medium">Password</Form.Label>
                <div className="input-icon-wrapper">
                  <FiLock className="input-icon" size={16} />
                  <Form.Control
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ps-5"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4" controlId="signup-confirm-password">
                <Form.Label className="small fw-medium">Confirm Password</Form.Label>
                <div className="input-icon-wrapper">
                  <FiLock className="input-icon" size={16} />
                  <Form.Control
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="ps-5"
                  />
                </div>
              </Form.Group>

              <Button
                type="submit"
                className="w-100 btn-accent d-flex align-items-center justify-content-center gap-2"
                size="lg"
                disabled={loading}
                id="signup-submit"
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <>
                    <FiUserPlus size={18} />
                    Create Account
                  </>
                )}
              </Button>
            </Form>

            <div className="text-center mt-4">
              <span className="text-muted-custom small">
                Already have an account?{' '}
                <Link to="/login" className="text-accent fw-medium">
                  Sign In
                </Link>
              </span>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
