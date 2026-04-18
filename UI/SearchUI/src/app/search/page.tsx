import type { Metadata } from 'next';
import ProtectedRoute from '@/components/ProtectedRoute';
import SearchPage from '@/views/SearchPage';

export const metadata: Metadata = {
  title: 'Candidate Search',
  description: 'Search for candidates using hybrid retrieval',
};

export default function SearchRoute() {
  return (
    <ProtectedRoute allowedRole="recruiter">
      <SearchPage />
    </ProtectedRoute>
  );
}
