// ─── API Configuration ───────────────────────────────────────────────
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Resume Upload API (placeholder — replace with real endpoint) ────
export const RESUME_UPLOAD_API_URL = 'http://localhost:8000/api';

// ─── Types ───────────────────────────────────────────────────────────

export type RetrievalMode = 'lexical' | 'semantic' | 'hybrid';

export interface SearchRequest {
  query: string;
  mode: RetrievalMode;
  top_k: number;
}

export interface Explanation {
  keyword_matches: string[];
  semantic_score: number;
  graph_path: string[];
  reasoning: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
  retrieval_method: RetrievalMode;
  explanation: Explanation;
}

export interface IntentAnalysis {
  original_query: string;
  detected_intent: string;
  expanded_query: string;
  confidence: number;
  entities: string[];
}

export interface SearchMetrics {
  precision_at_k: number;
  recall_at_k: number;
  ndcg: number;
  map: number;
}

export interface SearchResponse {
  results: SearchResult[];
  intent: IntentAnalysis;
  metrics: SearchMetrics;
  total_results: number;
  retrieval_time_ms: number;
}

// ─── API Functions ───────────────────────────────────────────────────

export async function searchQuery(
  query: string,
  mode: RetrievalMode,
  topK: number
): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, mode, top_k: topK } satisfies SearchRequest),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getIntentAnalysis(query: string): Promise<IntentAnalysis> {
  const response = await fetch(`${API_BASE_URL}/api/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Intent analysis failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getKnowledgeGraph(query: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge-graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Knowledge graph request failed: ${response.statusText}`);
  }

  return response.json();
}

// ─── Resume Upload ───────────────────────────────────────────────────

export interface ResumeUploadResponse {
  success: boolean;
  message: string;
  resume_id?: string;
}

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetch(RESUME_UPLOAD_API_URL, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — the browser will set it with the boundary
  });

  if (!response.ok) {
    throw new Error(`Resume upload failed: ${response.statusText}`);
  }

  return response.json();
}

// ─── Mock Data (used when backend is unavailable) ────────────────────

export function getMockSearchResponse(query: string, mode: RetrievalMode, topK: number): SearchResponse {
  const mockResults: SearchResult[] = Array.from({ length: topK }, (_, i) => ({
    id: `doc-${i + 1}`,
    title: `${getRandomTitle(i)} — Match for "${query}"`,
    snippet: getRandomSnippet(i, query),
    score: Math.round((0.95 - i * 0.07 + Math.random() * 0.03) * 1000) / 1000,
    retrieval_method: mode === 'hybrid' ? (['lexical', 'semantic', 'hybrid'] as RetrievalMode[])[i % 3] : mode,
    explanation: {
      keyword_matches: getRandomKeywords(query),
      semantic_score: Math.round((0.85 - i * 0.05) * 100) / 100,
      graph_path: [`Entity: ${query.split(' ')[0]}`, 'related_to', `Topic: ${getRandomTopic(i)}`],
      reasoning: getRandomReasoning(i, mode),
    },
  }));

  return {
    results: mockResults,
    intent: {
      original_query: query,
      detected_intent: getRandomIntent(query),
      expanded_query: `${query} ${getRandomExpansion(query)}`,
      confidence: Math.round((0.82 + Math.random() * 0.15) * 100) / 100,
      entities: query.split(' ').filter(w => w.length > 3),
    },
    metrics: {
      precision_at_k: Math.round((0.78 + Math.random() * 0.2) * 100) / 100,
      recall_at_k: Math.round((0.85 + Math.random() * 0.13) * 100) / 100,
      ndcg: Math.round((0.80 + Math.random() * 0.18) * 100) / 100,
      map: Math.round((0.75 + Math.random() * 0.2) * 100) / 100,
    },
    total_results: 150 + Math.floor(Math.random() * 500),
    retrieval_time_ms: 45 + Math.floor(Math.random() * 200),
  };
}

function getRandomTitle(index: number): string {
  const titles = [
    'Advanced Neural Retrieval Techniques',
    'Understanding Semantic Search Pipelines',
    'Knowledge Graph Construction Methods',
    'BM25 and Beyond: Modern Lexical Search',
    'Hybrid Information Retrieval Systems',
    'Query Intent Classification in Practice',
    'Explainable AI for Search Systems',
    'Dense Passage Retrieval with Transformers',
    'Cross-Encoder Re-Ranking Strategies',
    'Evaluating Retrieval Quality with RAGAS',
  ];
  return titles[index % titles.length];
}

function getRandomSnippet(index: number, query: string): string {
  const snippets = [
    `This document explores techniques for combining lexical and semantic signals to improve search relevance for queries like "${query}". The proposed approach uses...`,
    `A comprehensive study of intent-aware retrieval systems that adapt to complex user queries. The authors demonstrate significant improvements in precision when...`,
    `We present a novel framework for explainable search that provides human-readable justifications for each retrieved document. By leveraging knowledge graphs and...`,
    `Recent advances in dense vector representations have enabled semantic search systems to capture nuanced meanings. This work extends these approaches by integrating...`,
    `The paper introduces a multi-stage retrieval pipeline combining BM25 scoring with neural re-ranking using Reciprocal Rank Fusion. Experimental results on standard benchmarks...`,
  ];
  return snippets[index % snippets.length];
}

function getRandomKeywords(query: string): string[] {
  const words = query.toLowerCase().split(' ').filter(w => w.length > 2);
  return [...words, 'retrieval', 'search'].slice(0, 4);
}

function getRandomTopic(index: number): string {
  const topics = ['Information Retrieval', 'NLP', 'Machine Learning', 'Knowledge Graphs', 'Search Systems'];
  return topics[index % topics.length];
}

function getRandomReasoning(index: number, mode: RetrievalMode): string {
  const reasons: Record<RetrievalMode, string[]> = {
    lexical: [
      'Matched via BM25 scoring with high term frequency overlap.',
      'Strong keyword match with TF-IDF weighted terms from the query.',
    ],
    semantic: [
      'High cosine similarity (0.92) between query and document embeddings using Sentence-BERT.',
      'Dense vector retrieval identified semantic alignment despite different terminology.',
    ],
    hybrid: [
      'Combined BM25 lexical score and semantic embedding similarity via Reciprocal Rank Fusion.',
      'Keyword match boosted by semantic re-ranking and knowledge graph entity linkage.',
    ],
  };
  return reasons[mode][index % 2];
}

function getRandomIntent(query: string): string {
  const intents = ['informational', 'comparative', 'exploratory', 'specific_lookup'];
  return query.length > 20 ? intents[2] : intents[Math.floor(Math.random() * intents.length)];
}

function getRandomExpansion(query: string): string {
  const expansions = [
    'information retrieval techniques methods',
    'search ranking algorithms evaluation',
    'natural language processing embeddings',
    'document retrieval neural networks',
  ];
  return expansions[query.length % expansions.length];
}
