import type { Metadata } from 'next';
import SignUpPage from '@/views/SignUpPage';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a new account for INSIGHT',
};

export default function SignUpRoute() {
  return <SignUpPage />;
}
