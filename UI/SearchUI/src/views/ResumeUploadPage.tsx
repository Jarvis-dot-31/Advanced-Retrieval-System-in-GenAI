'use client';

import { useState, useRef, useCallback, type DragEvent } from 'react';
import {
  Container,
  Card,
  Button,
  Spinner,
} from 'react-bootstrap';
import {
  FiUploadCloud,
  FiFile,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiUser,
  FiFileText,
  FiShield,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { uploadResume } from '../services/api';

export default function ResumeUploadPage() {
  const { user } = useAuth();

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File Handlers ─────────────────────────────────────────

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are accepted.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be under 10 MB.';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadStatus('error');
      setUploadMessage(error);
      return;
    }
    setResumeFile(file);
    setUploadStatus('idle');
    setUploadMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleUpload = async () => {
    if (!resumeFile) return;

    setUploading(true);
    setUploadStatus('idle');
    setUploadMessage('');

    try {
      const result = await uploadResume(resumeFile);
      setUploadStatus('success');
      setUploadMessage(result.message || 'Resume uploaded successfully!');
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(
        err instanceof Error ? err.message : 'Upload failed. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setResumeFile(null);
    setUploadStatus('idle');
    setUploadMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="upload-page py-4">
      <Container style={{ maxWidth: 720 }}>
        {/* ─── Header ──────────────────────────────────── */}
        <div className="text-center mb-4">
          <div className="upload-page-icon-wrapper mb-3">
            <FiUser size={32} />
          </div>
          <h1 className="fw-bold mb-1">
            Welcome, {user?.name || 'there'}!
          </h1>
          <p className="text-muted-custom">
            Upload your resume to make yourself discoverable by recruiters
          </p>
        </div>

        {/* ─── Upload Card ─────────────────────────────── */}
        <Card className="resume-upload-card border-0 shadow-sm mb-4" id="resume-upload">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="resume-icon-wrapper">
                <FiUploadCloud size={22} />
              </div>
              <div>
                <h5 className="fw-semibold mb-0">Upload Resume</h5>
                <span className="small text-muted-custom">
                  PDF format, max 10 MB
                </span>
              </div>
            </div>

            <div
              className={`resume-dropzone ${dragActive ? 'drag-active' : ''} ${resumeFile ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !resumeFile && fileInputRef.current?.click()}
              id="resume-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleInputChange}
                className="d-none"
                id="resume-file-input"
              />

              {!resumeFile ? (
                <div className="dropzone-content text-center">
                  <FiUploadCloud size={42} className="text-accent mb-2" />
                  <p className="fw-medium mb-1">
                    Drag &amp; drop your resume here
                  </p>
                  <span className="small text-muted-custom">
                    or <span className="text-accent" style={{ cursor: 'pointer' }}>browse files</span>
                  </span>
                </div>
              ) : (
                <div className="d-flex align-items-center justify-content-between w-100">
                  <div className="d-flex align-items-center gap-3">
                    <div className="file-icon-wrapper">
                      <FiFile size={20} />
                    </div>
                    <div>
                      <p className="fw-medium mb-0 small">{resumeFile.name}</p>
                      <span className="text-muted-custom" style={{ fontSize: '0.75rem' }}>
                        {(resumeFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-clear-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    title="Remove file"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Upload button & status */}
            <div className="d-flex align-items-center gap-3 mt-3">
              <Button
                className="btn-accent d-flex align-items-center gap-2"
                onClick={handleUpload}
                disabled={!resumeFile || uploading}
                id="resume-upload-btn"
              >
                {uploading ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <FiUploadCloud size={16} />
                    Upload Resume
                  </>
                )}
              </Button>

              {uploadStatus === 'success' && (
                <span className="upload-status-msg success d-flex align-items-center gap-1 small">
                  <FiCheckCircle size={15} />
                  {uploadMessage}
                </span>
              )}
              {uploadStatus === 'error' && (
                <span className="upload-status-msg error d-flex align-items-center gap-1 small">
                  <FiAlertCircle size={15} />
                  {uploadMessage}
                </span>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* ─── Info Cards ──────────────────────────────── */}
        <div className="upload-info-grid">
          <Card className="upload-info-card border-0 shadow-sm">
            <Card.Body className="p-3 d-flex align-items-start gap-3">
              <div className="upload-info-icon">
                <FiFileText size={20} />
              </div>
              <div>
                <h6 className="fw-semibold mb-1">Parsed Automatically</h6>
                <p className="small text-muted-custom mb-0">
                  Your resume is processed and indexed using our hybrid retrieval pipeline so recruiters can find you.
                </p>
              </div>
            </Card.Body>
          </Card>
          <Card className="upload-info-card border-0 shadow-sm">
            <Card.Body className="p-3 d-flex align-items-start gap-3">
              <div className="upload-info-icon">
                <FiShield size={20} />
              </div>
              <div>
                <h6 className="fw-semibold mb-1">Private &amp; Secure</h6>
                <p className="small text-muted-custom mb-0">
                  Your data is encrypted and only shared with verified recruiters on the platform.
                </p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
}
