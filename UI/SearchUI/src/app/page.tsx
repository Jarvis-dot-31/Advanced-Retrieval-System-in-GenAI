import type { Metadata } from 'next';
import LandingPage from '@/views/LandingPage';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to INSIGHT - Intelligent Semantic Search',
};

export default function HomePage() {
  return <LandingPage />;
}
