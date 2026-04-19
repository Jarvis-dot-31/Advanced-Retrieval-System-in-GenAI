// ─── API Configuration ───────────────────────────────────────────────
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.153.78.58:8001';

// ─── Resume Upload API (placeholder — replace with real endpoint) ────
export const RESUME_UPLOAD_API_URL = API_BASE_URL + '/add-candidate';

// ─── Resume Search API (placeholder — replace with real endpoint) ────
export const RESUME_SEARCH_API_URL = API_BASE_URL + '/query';

// ─── Types ───────────────────────────────────────────────────────────

export interface SearchRequest {
  query: string;
  k: number;
}

export interface Candidate {
  id: number;
  name: string;
  core_skills: string;
  secondary_skills: string;
  soft_skills: string | null;
  skill_summary: string;
  potential_roles: string;
  years_of_experience: number;
}

export interface CandidateSearchResult {
  candidate: Candidate;
  rank_score: number;
  reason: string;
}

export type SearchResponse = CandidateSearchResult[];

// ─── API Functions ───────────────────────────────────────────────────

export async function searchQuery(
  query: string,
  topK: number
): Promise<SearchResponse> {
  const response = await fetch(`${RESUME_SEARCH_API_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, k: topK } satisfies SearchRequest),
  });

  const res = await response.json();

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  // Handle common wrapper formats silently
  if (!Array.isArray(res)) {
    if (res.results && Array.isArray(res.results)) {
      return res.results as SearchResponse;
    } else if (res.data && Array.isArray(res.data)) {
      return res.data as SearchResponse;
    } else if (res.candidates && Array.isArray(res.candidates)) {
      return res.candidates as SearchResponse;
    } else {
      // Show snippet of response format in UI so we know what they actually returned
      throw new Error(`API returned an unexpected format: ${JSON.stringify(res).slice(0, 100)}...`);
    }
  }

  return res as SearchResponse;
}

// export async function getIntentAnalysis(query: string): Promise<IntentAnalysis> {
//   const response = await fetch(`${API_BASE_URL}/api/intent`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ query }),
//   });

//   if (!response.ok) {
//     throw new Error(`Intent analysis failed: ${response.statusText}`);
//   }

//   return response.json();
// }

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

  console.log(response);

  if (!response.ok) {
    throw new Error(`Resume upload failed: ${response.statusText}`);
  }

  return response.json();
}

