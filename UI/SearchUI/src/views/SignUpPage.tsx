'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { FiMail, FiLock, FiUser, FiUserPlus, FiUploadCloud, FiSearch } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, loginWithGoogle, isAuthenticated, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      if (!user.role) {
        router.replace('/select-role');
      } else {
        const redirectTo = user.role === 'recruiter' ? '/search' : '/upload';
        router.replace(redirectTo);
      }
    }
  }, [isAuthenticated, user, authLoading, router]);

  if (authLoading || (isAuthenticated && user)) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const result = await signup(name, email, password, role);
      if (result.ok) {
        const redirectTo = role === 'recruiter' ? '/search' : '/upload';
        router.replace(redirectTo);
      } else {
        setError(result.error || 'Sign up failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setError('Google sign-up failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center">
      <Container style={{ maxWidth: 480 }}>
        <Card className="login-card border-0 shadow-lg">
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="login-icon-wrapper mb-3"><FiUserPlus size={28} /></div>
              <h2 className="fw-bold mb-1">Create Account</h2>
              <p className="text-muted-custom">Sign up to get started with INSIGHT</p>
            </div>
            {error && (<Alert variant="danger" className="py-2 small" id="signup-error">{error}</Alert>)}

            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignUp}
              className="w-100 btn-google d-flex align-items-center justify-content-center gap-2 mb-3"
              size="lg"
              disabled={googleLoading}
              id="signup-google"
            >
              {googleLoading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <FcGoogle size={20} />
                  Sign up with Google
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="auth-divider mb-3">
              <span>or</span>
            </div>

            <Form onSubmit={handleSubmit} id="signup-form">
              <div className="role-selector-group mb-4" id="role-selector">
                <Form.Label className="small fw-medium d-block mb-2">I am a…</Form.Label>
                <div className="role-toggle-wrapper">
                  <button type="button" className={`role-toggle-btn ${role === 'user' ? 'active' : ''}`} onClick={() => setRole('user')} id="role-user-btn">
                    <FiUploadCloud size={20} />
                    <span className="role-label">Job Seeker</span>
                    <span className="role-desc">Upload your resume</span>
                  </button>
                  <button type="button" className={`role-toggle-btn ${role === 'recruiter' ? 'active' : ''}`} onClick={() => setRole('recruiter')} id="role-recruiter-btn">
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
                  <Form.Control type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="ps-5" autoFocus />
                </div>
              </Form.Group>
              <Form.Group className="mb-3" controlId="signup-email">
                <Form.Label className="small fw-medium">Email address</Form.Label>
                <div className="input-icon-wrapper">
                  <FiMail className="input-icon" size={16} />
                  <Form.Control type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="ps-5" />
                </div>
              </Form.Group>
              <Form.Group className="mb-3" controlId="signup-password">
                <Form.Label className="small fw-medium">Password</Form.Label>
                <div className="input-icon-wrapper">
                  <FiLock className="input-icon" size={16} />
                  <Form.Control type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="ps-5" />
                </div>
              </Form.Group>
              <Form.Group className="mb-4" controlId="signup-confirm-password">
                <Form.Label className="small fw-medium">Confirm Password</Form.Label>
                <div className="input-icon-wrapper">
                  <FiLock className="input-icon" size={16} />
                  <Form.Control type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="ps-5" />
                </div>
              </Form.Group>
              <Button type="submit" className="w-100 btn-accent d-flex align-items-center justify-content-center gap-2" size="lg" disabled={loading} id="signup-submit">
                {loading ? (<span className="spinner-border spinner-border-sm" />) : (<><FiUserPlus size={18} /> Create Account</>)}
              </Button>
            </Form>
            <div className="text-center mt-4">
              <span className="text-muted-custom small">
                Already have an account?{' '}
                <Link href="/login" className="text-accent fw-medium">Sign In</Link>
              </span>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
