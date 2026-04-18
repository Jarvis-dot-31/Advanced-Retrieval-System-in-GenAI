import type { Metadata } from 'next';
import LoginPage from '@/views/LoginPage';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to access your INSIGHT dashboard',
};

export default function LoginRoute() {
  return <LoginPage />;
}
