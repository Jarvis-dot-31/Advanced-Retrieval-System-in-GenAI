import ProtectedRoute from '@/components/ProtectedRoute';
import SearchPage from '@/views/SearchPage';

export default function SearchRoute() {
  return (
    <ProtectedRoute allowedRole="recruiter">
      <SearchPage />
    </ProtectedRoute>
  );
}
