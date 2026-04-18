import type { Metadata } from 'next';
import ProtectedRoute from '@/components/ProtectedRoute';
import ResumeUploadPage from '@/views/ResumeUploadPage';

export const metadata: Metadata = {
  title: 'Upload Resume',
  description: 'Upload your resume to be discovered by recruiters',
};

export default function UploadRoute() {
  return (
    <ProtectedRoute allowedRole="user">
      <ResumeUploadPage />
    </ProtectedRoute>
  );
}
