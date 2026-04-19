'use client';

import { useState, type FormEvent } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Badge,
  Accordion,
  Spinner,
} from 'react-bootstrap';
import {
  FiSearch,
  FiDatabase,
  FiInfo,
} from 'react-icons/fi';
import {
  type SearchResponse,
  type CandidateSearchResult,
  searchQuery,
} from '../services/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const data = await searchQuery(query, topK);
      setResponse(data);
    } catch (err) {
      console.error('Search failed:', err);
      setResponse(null);
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page py-4">
      <Container>
        {/* ─── Header ─────────────────────────────────────── */}
        <div className="text-center mb-4">
          <h1 className="fw-bold mb-1">
            <FiSearch className="me-2" />
            Candidate Search
          </h1>
          <p className="text-muted-custom">
            Find the best candidates using our hybrid retrieval pipeline
          </p>
        </div>

        {/* ─── Search Bar ─────────────────────────────────── */}
        <Card className="search-bar-card border-0 shadow-sm mb-4" id="search-bar">
          <Card.Body className="p-3 p-md-4">
            <Form onSubmit={handleSearch}>
              <Row className="g-3 align-items-end">
                <Col lg={8}>
                  <Form.Group controlId="search-query">
                    <Form.Label className="small fw-medium">Search Query</Form.Label>
                    <div className="input-icon-wrapper">
                      <FiSearch className="input-icon" size={16} />
                      <Form.Control
                        type="text"
                        placeholder="e.g. machine learning engineer with Python experience"
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
                  <Form.Group controlId="top-k-slider">
                    <Form.Label className="small fw-medium">
                      No. of results: <strong>{topK}</strong>
                    </Form.Label>
                    <Form.Range
                      min={1}
                      max={5}
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

        {/* ─── Error State ──────────────────────────────── */}
        {!loading && error && (
          <div className="text-center py-4">
            <div className="alert alert-danger d-inline-flex align-items-center gap-2 px-4" role="alert">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* ─── Results ────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" className="text-accent" />
            <p className="mt-2 text-muted-custom">Searching across indexes…</p>
          </div>
        )}

        {!loading && response && (
          <Row className="g-4">
            <Col lg={12}>
              <div className="d-flex justify-content-between align-items-center mb-3 small text-muted-custom">
                <span>
                  <FiDatabase size={14} className="me-1" />
                  {response.length} candidates found
                </span>
              </div>
              <div className="results-list">
                {response.map((result, index) => (
                  <ResultCard key={result.candidate.id} result={result} index={index} />
                ))}
              </div>
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
              Try a different query or adjust the number of results.
            </p>
          </div>
        )}

        {/* ─── Empty State ────────────────────────────────── */}
        {!loading && !hasSearched && (
          <div className="empty-state text-center py-5">
            <FiSearch size={48} className="text-accent mb-3 empty-icon" />
            <h5 className="fw-semibold">Start Searching</h5>
            <p className="text-muted-custom">
              Enter a query above to search candidates using our hybrid retrieval pipeline.
              <br />
              Try: <em>"full stack developer with React experience"</em>
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function ResultCard({ result, index }: { result: CandidateSearchResult; index: number }) {
  const candidate = result.candidate;

  return (
    <Card className="result-card border-0 shadow-sm mb-3" id={`result-${candidate.id}`}>
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="result-rank">#{index + 1}</span>
            <h6 className="fw-semibold mb-0">{candidate.name}</h6>
            <Badge bg="secondary" className="ms-2">{candidate.years_of_experience} yrs exp</Badge>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <Badge bg="dark" className="score-badge">Score: {result.rank_score.toFixed(3)}</Badge>
          </div>
        </div>

        <p className="small text-muted-custom mb-2">
          <strong>Potential Roles:</strong> {candidate.potential_roles}
        </p>
        <p className="small mb-2">{candidate.skill_summary}</p>

        <Accordion className="mt-3">
          <Accordion.Item eventKey="0" className="explanation-accordion">
            <Accordion.Header>
              <span className="small d-flex align-items-center gap-1">
                <FiInfo size={13} />
                Why was this retrieved?
              </span>
            </Accordion.Header>
            <Accordion.Body className="small py-2">
              <div className="mb-2">
                <strong>Reasoning:</strong> {result.reason}
              </div>
              <div className="mb-2">
                <strong>Core Skills:</strong> {candidate.core_skills}
              </div>
              <div className="mb-2">
                <strong>Secondary Skills:</strong> {candidate.secondary_skills}
              </div>
              {candidate.soft_skills && (
                <div>
                  <strong>Soft Skills:</strong> {candidate.soft_skills}
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
  );
}
