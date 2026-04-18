'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { Container, Card, Button } from 'react-bootstrap';
import { FiUploadCloud, FiSearch, FiArrowRight } from 'react-icons/fi';

export default function SelectRolePage() {
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user, needsRoleSelection, setRole: saveRole, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // If user already has a role, redirect to their dashboard
    if (user && user.role && !needsRoleSelection) {
      const redirectTo = user.role === 'recruiter' ? '/search' : '/upload';
      router.replace(redirectTo);
    }
  }, [isAuthenticated, user, needsRoleSelection, authLoading, router]);

  if (authLoading || !isAuthenticated || (user?.role && !needsRoleSelection)) {
    return null;
  }

  const handleContinue = async () => {
    setLoading(true);
    try {
      const success = await saveRole(role);
      if (success) {
        const redirectTo = role === 'recruiter' ? '/search' : '/upload';
        router.replace(redirectTo);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center">
      <Container style={{ maxWidth: 520 }}>
        <Card className="login-card border-0 shadow-lg">
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="login-icon-wrapper mb-3">
                <FiArrowRight size={28} />
              </div>
              <h2 className="fw-bold mb-1">Almost There!</h2>
              <p className="text-muted-custom">
                Welcome, {user?.name}! How will you use INSIGHT?
              </p>
            </div>

            <div className="role-selector-group mb-4">
              <div className="role-toggle-wrapper">
                <button
                  type="button"
                  className={`role-toggle-btn ${role === 'user' ? 'active' : ''}`}
                  onClick={() => setRole('user')}
                  id="select-role-user-btn"
                >
                  <FiUploadCloud size={24} />
                  <span className="role-label">Job Seeker</span>
                  <span className="role-desc">Upload your resume and get discovered</span>
                </button>
                <button
                  type="button"
                  className={`role-toggle-btn ${role === 'recruiter' ? 'active' : ''}`}
                  onClick={() => setRole('recruiter')}
                  id="select-role-recruiter-btn"
                >
                  <FiSearch size={24} />
                  <span className="role-label">Recruiter</span>
                  <span className="role-desc">Search for the perfect candidates</span>
                </button>
              </div>
            </div>

            <Button
              onClick={handleContinue}
              className="w-100 btn-accent d-flex align-items-center justify-content-center gap-2"
              size="lg"
              disabled={loading}
              id="select-role-submit"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <FiArrowRight size={18} /> Continue
                </>
              )}
            </Button>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
