'use client';

import Link from 'next/link';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import {
  FiSearch,
  FiTarget,
  FiShare2,
  FiMessageCircle,
  FiArrowRight,
  FiZap,
  FiLayers,
  FiCpu,
} from 'react-icons/fi';

const features = [
  {
    icon: <FiLayers size={28} />,
    title: 'Hybrid Retrieval',
    desc: 'Combines BM25 lexical search with dense semantic embeddings for best-of-both-worlds retrieval accuracy.',
  },
  {
    icon: <FiTarget size={28} />,
    title: 'Intent Detection',
    desc: 'Automatically classifies user intent and expands queries to capture broader relevant results.',
  },
  {
    icon: <FiShare2 size={28} />,
    title: 'Knowledge Graph',
    desc: 'Traverses entity relationships in Neo4j to discover contextually related documents and boost recall.',
  },
  {
    icon: <FiMessageCircle size={28} />,
    title: 'Explainable Results',
    desc: 'Every result comes with a human-readable explanation of why it was retrieved and how it was ranked.',
  },
];

const steps = [
  { num: '01', title: 'Query Input', desc: 'User submits a natural language search query.' },
  { num: '02', title: 'Intent Analysis', desc: 'System detects intent, entities, and expands the query.' },
  { num: '03', title: 'Hybrid Retrieval', desc: 'Parallel BM25 + semantic vector search across indexes.' },
  { num: '04', title: 'Re-Ranking', desc: 'Multi-stage neural re-ranking with Reciprocal Rank Fusion.' },
  { num: '05', title: 'Graph Traversal', desc: 'Knowledge graph enriches results with related entities.' },
  { num: '06', title: 'Explained Results', desc: 'Ranked results returned with clear explanations.' },
];

const techStack = [
  { name: 'FastAPI', icon: <FiZap /> },
  { name: 'PyTorch', icon: <FiCpu /> },
  { name: 'Elasticsearch', icon: <FiSearch /> },
  { name: 'Neo4j', icon: <FiShare2 /> },
  { name: 'FAISS', icon: <FiLayers /> },
  { name: 'Sentence-BERT', icon: <FiTarget /> },
  { name: 'RAGAS', icon: <FiMessageCircle /> },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center min-vh-75">
            <Col lg={8} className="mx-auto text-center">
              <div className="hero-badge mb-3">
                <FiZap size={14} />
                <span>Intent-Aware • Explainable • Hybrid</span>
              </div>
              <h1 className="hero-title">
                Search That <span className="text-accent">Understands</span> You
              </h1>
              <p className="hero-subtitle mt-3">
                A next-generation retrieval system that combines lexical precision,
                semantic understanding, and knowledge graph intelligence — delivering
                accurate, explainable results every time.
              </p>
              <div className="d-flex gap-3 justify-content-center mt-4">
                <Link
                  href="/search"
                  className="btn btn-lg btn-accent d-flex align-items-center gap-2"
                >
                  Try It Now
                  <FiArrowRight />
                </Link>
                <Button
                  as="a"
                  href="#how-it-works"
                  variant="outline-secondary"
                  size="lg"
                >
                  Learn More
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ─── Features ─────────────────────────────────────── */}
      <section className="features-section py-5" id="features">
        <Container>
          <div className="text-center mb-5">
            <h2 className="section-title">Core Capabilities</h2>
            <p className="section-subtitle">
              Four pillars that power intelligent, transparent search
            </p>
          </div>
          <Row className="g-4">
            {features.map((f, i) => (
              <Col md={6} lg={3} key={i}>
                <Card className="feature-card h-100 border-0">
                  <Card.Body className="text-center p-4">
                    <div className="feature-icon-wrapper mb-3">{f.icon}</div>
                    <Card.Title className="fw-semibold">{f.title}</Card.Title>
                    <Card.Text className="text-muted-custom">{f.desc}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ─── How It Works ─────────────────────────────────── */}
      <section className="how-it-works-section py-5" id="how-it-works">
        <Container>
          <div className="text-center mb-5">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              From query to explained results in six intelligent stages
            </p>
          </div>
          <Row className="g-4">
            {steps.map((s, i) => (
              <Col md={6} lg={4} key={i}>
                <div className="step-card p-4 h-100">
                  <span className="step-number">{s.num}</span>
                  <h5 className="fw-semibold mt-2">{s.title}</h5>
                  <p className="text-muted-custom mb-0">{s.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ─── Tech Stack ───────────────────────────────────── */}
      <section className="tech-section py-5" id="tech-stack">
        <Container>
          <div className="text-center mb-5">
            <h2 className="section-title">Built With</h2>
            <p className="section-subtitle">
              Industry-leading tools for production-grade retrieval
            </p>
          </div>
          <div className="tech-grid">
            {techStack.map((t, i) => (
              <div className="tech-badge" key={i}>
                {t.icon}
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="app-footer py-4">
        <Container>
          <div className="text-center text-muted-custom">
            <p className="mb-1">
              <strong>INSIGHT</strong> — Intent-Aware Neural Search with Integrated Graph and Hybrid Techniques
            </p>
            <p className="mb-0 small">
              Built for CS-671 HCLTech Hackathon &bull; 2026
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
