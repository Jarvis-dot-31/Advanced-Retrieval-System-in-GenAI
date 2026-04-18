import ProtectedRoute from '@/components/ProtectedRoute';
import ResumeUploadPage from '@/views/ResumeUploadPage';

export default function UploadRoute() {
  return (
    <ProtectedRoute allowedRole="user">
      <ResumeUploadPage />
    </ProtectedRoute>
  );
}
