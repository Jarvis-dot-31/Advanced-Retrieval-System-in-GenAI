import { useState, useRef, useCallback, type FormEvent, type DragEvent } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Badge,
  Accordion,
  ProgressBar,
  Spinner,
} from 'react-bootstrap';
import {
  FiSearch,
  FiSliders,
  FiClock,
  FiDatabase,
  FiTarget,
  FiTrendingUp,
  FiInfo,
  FiUploadCloud,
  FiFile,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
} from 'react-icons/fi';
import {
  type SearchResponse,
  type RetrievalMode,
  type SearchResult,
  uploadResume,
} from '../services/api';

// Uncomment the line below when the backend is ready:
// import { searchQuery } from '../services/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<RetrievalMode>('hybrid');
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // ── Replace with real API call when backend is ready ──
      // const data = await searchQuery(query, mode, topK);
      await new Promise((r) => setTimeout(r, 600)); // simulate latency
      // No mock data — show empty results until backend is connected
      setResponse(null);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Resume Upload Handlers ─────────────────────────────────────────

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
    <div className="search-page py-4">
      <Container>
        {/* ─── Header ─────────────────────────────────────── */}
        <div className="text-center mb-4">
          <h1 className="fw-bold mb-1">
            <FiSearch className="me-2" />
            Hybrid Search
          </h1>
          <p className="text-muted-custom">
            Combine lexical, semantic &amp; knowledge-graph retrieval in one query
          </p>
        </div>

        {/* ─── Resume Upload Card ─────────────────────────── */}
        <Card className="resume-upload-card border-0 shadow-sm mb-4" id="resume-upload">
          <Card.Body className="p-3 p-md-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="resume-icon-wrapper">
                <FiUploadCloud size={22} />
              </div>
              <div>
                <h5 className="fw-semibold mb-0">Upload Resume</h5>
                <span className="small text-muted-custom">
                  Upload your resume (PDF, max 10 MB) to enable personalized search
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
                  <FiUploadCloud size={36} className="text-accent mb-2" />
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

        {/* ─── Search Bar ─────────────────────────────────── */}
        <Card className="search-bar-card border-0 shadow-sm mb-4" id="search-bar">
          <Card.Body className="p-3 p-md-4">
            <Form onSubmit={handleSearch}>
              <Row className="g-3 align-items-end">
                <Col lg={6}>
                  <Form.Group controlId="search-query">
                    <Form.Label className="small fw-medium">Search Query</Form.Label>
                    <div className="input-icon-wrapper">
                      <FiSearch className="input-icon" size={16} />
                      <Form.Control
                        type="text"
                        placeholder="e.g. neural retrieval techniques for knowledge graphs"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="ps-5 search-input"
                        size="lg"
                        autoFocus
                      />
                    </div>
                  </Form.Group>
                </Col>

                <Col sm={6} lg={2}>
                  <Form.Group controlId="retrieval-mode">
                    <Form.Label className="small fw-medium d-flex align-items-center gap-1">
                      <FiSliders size={13} /> Mode
                    </Form.Label>
                    <Form.Select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as RetrievalMode)}
                    >
                      <option value="intent_aware">Intent Aware</option>
                      <option value="lexical">Lexical (BM25)</option>
                      <option value="semantic">Semantic</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col sm={6} lg={2}>
                  <Form.Group controlId="top-k-slider">
                    <Form.Label className="small fw-medium">
                      No. of results: <strong>{topK}</strong>
                    </Form.Label>
                    <Form.Range
                      min={1}
                      max={20}
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                    />
                  </Form.Group>
                </Col>

                <Col lg={2}>
                  <Button
                    type="submit"
                    className="w-100 btn-accent d-flex align-items-center justify-content-center gap-2"
                    size="lg"
                    disabled={loading || !query.trim()}
                    id="search-submit"
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <FiSearch size={18} />
                        Search
                      </>
                    )}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        {/* ─── Results ────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" className="text-accent" />
            <p className="mt-2 text-muted-custom">Searching across indexes…</p>
          </div>
        )}

        {!loading && response && (
          <Row className="g-4">
            {/* ── Left: Results ──────────────────────── */}
            <Col lg={8}>
              {/* Intent Analysis */}
              <Card className="intent-card border-0 shadow-sm mb-4" id="intent-panel">
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <FiTarget size={18} className="text-accent" />
                    <strong>Intent Analysis</strong>
                    <Badge bg="info" className="ms-auto">
                      {Math.round(response.intent.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="intent-details">
                    <div className="d-flex flex-wrap gap-3 small">
                      <span>
                        <strong>Intent:</strong>{' '}
                        <Badge bg="secondary">{response.intent.detected_intent}</Badge>
                      </span>
                      <span>
                        <strong>Original:</strong> {response.intent.original_query}
                      </span>
                    </div>
                    <div className="mt-2 small">
                      <strong>Expanded Query:</strong>{' '}
                      <span className="text-muted-custom">{response.intent.expanded_query}</span>
                    </div>
                    {response.intent.entities.length > 0 && (
                      <div className="mt-2 d-flex gap-1 flex-wrap">
                        {response.intent.entities.map((e, i) => (
                          <Badge key={i} bg="outline-accent" className="entity-badge">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>

              {/* Meta */}
              <div className="d-flex justify-content-between align-items-center mb-3 small text-muted-custom">
                <span>
                  <FiDatabase size={14} className="me-1" />
                  {response.total_results} total results
                </span>
                <span>
                  <FiClock size={14} className="me-1" />
                  {response.retrieval_time_ms}ms
                </span>
              </div>

              {/* Result Cards */}
              <div className="results-list">
                {response.results.map((result, index) => (
                  <ResultCard key={result.id} result={result} index={index} />
                ))}
              </div>
            </Col>

            {/* ── Right: Metrics ─────────────────────── */}
            <Col lg={4}>
              <Card className="metrics-card border-0 shadow-sm sticky-top" id="metrics-panel" style={{ top: '80px' }}>
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <FiTrendingUp size={18} className="text-accent" />
                    <strong>Retrieval Metrics</strong>
                  </div>

                  <MetricBar label="Precision@K" value={response.metrics.precision_at_k} />
                  <MetricBar label="Recall@K" value={response.metrics.recall_at_k} />
                  <MetricBar label="nDCG" value={response.metrics.ndcg} />
                  <MetricBar label="MAP" value={response.metrics.map} />

                  <hr />

                  <div className="small text-muted-custom">
                    <FiInfo size={13} className="me-1" />
                    Metrics computed over the top-{topK} results using the <strong>{mode}</strong> retrieval mode.
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* ─── No Results State (after search, no backend) ──── */}
        {!loading && hasSearched && !response && (
          <div className="no-results-state text-center py-5">
            <div className="no-results-icon-wrapper mb-3">
              <FiSearch size={48} className="no-results-icon" />
            </div>
            <h5 className="fw-semibold mb-2">No results found</h5>
            <p className="text-muted-custom">
              We couldn't find any results for <strong>"{query}"</strong>.
              <br />
              Please try a different query or upload your resume to enable contextual search.
            </p>
          </div>
        )}

        {/* ─── Empty State ────────────────────────────────── */}
        {!loading && !hasSearched && (
          <div className="empty-state text-center py-5">
            <FiSearch size={48} className="text-accent mb-3 empty-icon" />
            <h5 className="fw-semibold">Start Searching</h5>
            <p className="text-muted-custom">
              Enter a query above to search using our hybrid retrieval pipeline.
              <br />
              Try: <em>"semantic search with knowledge graphs"</em>
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const modeColors: Record<RetrievalMode, string> = {
    lexical: 'warning',
    semantic: 'info',
    hybrid: 'success',
  };

  return (
    <Card className="result-card border-0 shadow-sm mb-3" id={`result-${result.id}`}>
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="result-rank">#{index + 1}</span>
            <h6 className="fw-semibold mb-0">{result.title}</h6>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <Badge bg={modeColors[result.retrieval_method]}>{result.retrieval_method}</Badge>
            <Badge bg="dark" className="score-badge">{result.score.toFixed(3)}</Badge>
          </div>
        </div>

        <p className="small text-muted-custom mb-2">{result.snippet}</p>

        <Accordion flush>
          <Accordion.Item eventKey="0" className="explanation-accordion">
            <Accordion.Header>
              <span className="small d-flex align-items-center gap-1">
                <FiInfo size={13} />
                Why was this retrieved?
              </span>
            </Accordion.Header>
            <Accordion.Body className="small py-2">
              <div className="mb-2">
                <strong>Reasoning:</strong> {result.explanation.reasoning}
              </div>
              <div className="mb-2">
                <strong>Semantic Score:</strong>{' '}
                <Badge bg="info">{result.explanation.semantic_score.toFixed(2)}</Badge>
              </div>
              {result.explanation.keyword_matches.length > 0 && (
                <div className="mb-2">
                  <strong>Keyword Matches:</strong>{' '}
                  {result.explanation.keyword_matches.map((kw, i) => (
                    <Badge key={i} bg="secondary" className="me-1">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
              <div>
                <strong>Graph Path:</strong>{' '}
                <span className="text-muted-custom">
                  {result.explanation.graph_path.join(' → ')}
                </span>
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const variant = pct >= 90 ? 'success' : pct >= 75 ? 'info' : pct >= 60 ? 'warning' : 'danger';

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span className="fw-medium">{label}</span>
        <span className="fw-bold">{pct}%</span>
      </div>
      <ProgressBar
        now={pct}
        variant={variant}
        className="metric-progress"
        style={{ height: 6 }}
      />
    </div>
  );
}
