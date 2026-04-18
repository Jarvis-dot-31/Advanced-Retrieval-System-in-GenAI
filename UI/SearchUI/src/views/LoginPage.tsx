'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle, isAuthenticated, user, loading: authLoading } = useAuth();
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
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.ok) {
        // Session will update and useEffect will redirect
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center">
      <Container style={{ maxWidth: 440 }}>
        <Card className="login-card border-0 shadow-lg">
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="login-icon-wrapper mb-3"><FiLogIn size={28} /></div>
              <h2 className="fw-bold mb-1">Welcome Back</h2>
              <p className="text-muted-custom">Sign in to access INSIGHT</p>
            </div>
            {error && (<Alert variant="danger" className="py-2 small" id="login-error">{error}</Alert>)}

            {/* Google Sign In */}
            <Button
              onClick={handleGoogleLogin}
              className="w-100 btn-google d-flex align-items-center justify-content-center gap-2 mb-3"
              size="lg"
              disabled={googleLoading}
              id="login-google"
            >
              {googleLoading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <FcGoogle size={20} />
                  Sign in with Google
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="auth-divider mb-3">
              <span>or</span>
            </div>

            {/* Email/Password Form */}
            <Form onSubmit={handleSubmit} id="login-form">
              <Form.Group className="mb-3" controlId="login-email">
                <Form.Label className="small fw-medium">Email address</Form.Label>
                <div className="input-icon-wrapper">
                  <FiMail className="input-icon" size={16} />
                  <Form.Control type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="ps-5" autoFocus />
                </div>
              </Form.Group>
              <Form.Group className="mb-4" controlId="login-password">
                <Form.Label className="small fw-medium">Password</Form.Label>
                <div className="input-icon-wrapper">
                  <FiLock className="input-icon" size={16} />
                  <Form.Control type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="ps-5" />
                </div>
              </Form.Group>
              <Button type="submit" className="w-100 btn-accent d-flex align-items-center justify-content-center gap-2" size="lg" disabled={loading} id="login-submit">
                {loading ? (<span className="spinner-border spinner-border-sm" />) : (<><FiLogIn size={18} /> Sign In</>)}
              </Button>
            </Form>
            <div className="text-center mt-4">
              <span className="text-muted-custom small">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-accent fw-medium">Sign Up</Link>
              </span>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
