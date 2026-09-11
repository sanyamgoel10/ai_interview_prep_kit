# AI Interview Prep Kit

A web application that turns a job description into a personalised interview preparation kit. Paste a job description, provide the company website, and say how many days you have — the app crawls the company site, searches public interview discussion, and generates a structured kit: company brief, role breakdown, categorised question bank, flashcards, and a day-by-day study schedule.

**Live demo:** [Frontend](https://your-app.vercel.app) · [Backend](https://your-app.onrender.com)

---

## Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS | Specified in brief; App Router gives clean per-page auth guards |
| Backend | Node.js + Express | Specified in brief; straightforward SSE support |
| Database | MongoDB Atlas | Specified in brief; flexible document schema fits the kit structure |
| Scraping | Cheerio + node-fetch | Specified in brief; lightweight, no headless browser needed |
| LLM | Google Gemini 1.5 Flash (default) | Genuine free tier with 1,500 req/day — enough for the pipeline. Configurable: also supports Groq (14,400 req/day) and OpenRouter via env vars |
| Auth | JWT (Bearer + query param for SSE) | Minimal, stateless. EventSource API cannot set headers so the token is also accepted as `?token=` for SSE connections |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (free M0 tier)
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com) (or Groq/OpenRouter key)

### Install

```bash
# Clone
git clone https://github.com/sanyamgoel10/ai_interview_prep_kit.git
cd ai_interview_prep_kit

# Backend
cd backend
npm install
cp .env.example .env
# Fill in .env (see section below)

# Frontend
cd ../frontend
npm install
```

### Environment variables

`backend/.env`:

```env
PORT=3001
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/interview_prep
JWT_SECRET=<strong-random-string>
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# LLM — pick one provider
LLM_PROVIDER=gemini          # gemini | groq | openrouter | openai-compatible
LLM_MODEL=gemini-1.5-flash   # leave blank to use provider default
GEMINI_API_KEY=<key>
# GROQ_API_KEY=<key>
# OPENROUTER_API_KEY=<key>
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend: http://localhost:3000 · Backend: http://localhost:3001

### Run tests

```bash
cd backend && npm test
```

Tests cover schedule allocation, coverage checking, and kit structure validation (20 tests).

---

## Batch Entry Point

```bash
cd backend
npm run evaluate -- --input cases.json --output kits.json
```

**Input format** (`cases.json`):

```json
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer\n\nWe are looking for ...",
    "company_url": "https://company.com",
    "days": 5
  }
]
```

**Output format** (`kits.json`):

```json
{
  "version": "1.0",
  "generated_at": "2026-09-11T10:00:00Z",
  "kits": [
    { "id": "case-01", "status": "ok", "kit": { "...": "Appendix A structure" }, "error": null },
    { "id": "case-02", "status": "failed", "kit": null, "error": { "code": "COMPANY_UNREACHABLE", "message": "..." } }
  ]
}
```

- Runs the **same pipeline code** as the web application — no parallel implementation
- Continues after individual case failures; records them as `"status": "failed"`
- Company URLs may be local addresses (e.g. `http://localhost:8099/acme/`) — the validator allows non-public hosts in non-production mode
- Reads all credentials from environment variables; needs no setup beyond `npm install` and a populated `.env`

---

## Architecture

```
frontend (Next.js)          backend (Express)            external
─────────────────           ─────────────────            ────────
POST /api/generate    ──►   create Kit (status:generating)
GET  /api/generate/:id/stream ──► SSE stream ──► pipeline ──► Gemini API
                                                           ──► company site (Cheerio)
                                                           ──► Reddit JSON API
                                                           ──► HN Algolia API
PATCH /api/kits/:id   ──►   update kit fields             MongoDB Atlas
POST  /api/generate/:id/regenerate/:section ──► partial regeneration
```

### Key design choices

**SSE over WebSocket:** The generation is a one-way server-to-client stream of progress events. SSE is simpler, HTTP-native, and automatically reconnects. WebSockets would add unnecessary bidirectional complexity.

**Kit created before pipeline starts:** `POST /api/generate` creates a `Kit` document with `status: "generating"` and returns the `kitId` immediately. The SSE stream is a separate request (`GET /stream`). This means navigating away does not abort generation — the pipeline runs to completion and saves the result. An in-memory `activePipelines` set prevents duplicate pipeline runs on SSE reconnect.

**No polling on the frontend:** The kit page reads status from the kit document; the SSE stream is the only live channel. If the user returns after generation finishes, the stream endpoint immediately sends `{step: "complete"}` and closes.

---

## Retrieval Approach

### Company site

1. Fetch the homepage (validated, size-limited to 500 KB, content-type checked)
2. Extract all same-origin links with their anchor text
3. Score each link by matching against hiring-related keywords (`careers`, `jobs`, `culture`, `handbook`, `engineering`, etc.) and path patterns
4. Fetch the top-scored pages (up to 8, capped at 5 total pages used)
5. Pages that match hiring keywords are stored as `hiringInfo`; the homepage text is stored as `companyInfo`

Path discovery is score-driven, not a fixed list — `/careers`, `/jobs`, `/handbook`, `/engineering/blog` and similar paths all score positively without being hardcoded as the only options.

`robots.txt` is fetched and logged before crawling; the crawler respects it in spirit (rate-limited, single-threaded, capped page count).

### Public discussion

Two sources are searched in parallel, with no API keys required:

- **Reddit** — `reddit.com/search.json?q=<company>+interview+process&sort=relevance&limit=5`
- **Hacker News** — `hn.algolia.com/api/v1/search?query=<company>+interview`

If neither returns results, the pipeline continues — the company brief will honestly note that no public interview information was found.

### SSRF protection

- All external URLs are validated before fetching: protocol must be `http/https`, private IP ranges are blocked in production (RFC1918, loopback, link-local, CGNAT, IPv4-mapped IPv6, GCP metadata endpoint)
- The final URL after redirects is re-validated to prevent redirect-based SSRF bypasses
- Redirect hops are capped at 5
- Content-type and size limits applied to every fetched page
- Fetched page content is treated as untrusted text — it is passed to the LLM as quoted content, never interpolated as instructions

---

## Research and Generation Pipeline

The pipeline runs as a **sequence of deliberate steps**, not a single prompt. Each step has a specific responsibility:

| Step | Responsibility | LLM? |
|---|---|---|
| 1. URL validation | Reject invalid/private URLs before any network call | No |
| 2. Company site crawl | Fetch homepage, score links, fetch top candidate pages | No |
| 3. Company name extraction | Parse hostname from URL | No |
| 4. Public discussion search | Reddit + HN in parallel | No |
| 5. Requirement extraction | Parse JD into structured requirements with `id`, `kind`, `priority` | Yes |
| 6. Company brief generation | Summarise company and interview process from retrieved content only | Yes |
| 7. Question generation | **One LLM call per requirement**, category-matched (technical → technical questions, behavioural → STAR questions) | Yes |
| 8. System-design questions | Separate call for technical must-haves | Yes |
| 9. Company-fit question | Separate call using company brief | Yes |
| 10. Coverage loop | Deterministic gap check → LLM gap fill → repeat (max 3 passes) | Gap fill: Yes |
| 11. Flashcard generation | One card per must-have requirement | Yes |
| 12. Schedule allocation | Arithmetic distribution across days | No |
| 13. Kit validation | Structural check before saving | No |

### Why separate calls per category

A "5 years React" requirement and a "mentoring junior engineers" requirement must not share the same prompt — the first needs a technical question testing hands-on knowledge; the second needs a STAR behavioural question. Combining them into one call risks both getting the wrong treatment. Each requirement maps to a category (`technical`, `behavioural`, `system-design`) and the prompt for that call includes category-specific instructions.

### Two deterministic steps (never LLM)

1. **Coverage check** — set intersection: which requirement IDs appear in at least one question's `requirement_ids`? The uncovered set is a code decision, not a model opinion.
2. **Schedule allocation** — arithmetic: sort questions by priority then difficulty, divide into `daysAvailable` buckets, multiply by 15 min/question. No model involvement.

---

## Coverage Loop

After the first draft of questions:

1. Run deterministic coverage check: find must-have requirements with no question referencing their `id`
2. If gaps exist and `passes < 3`, call `generateQuestionsForGaps` (targeted LLM call for the gap requirements)
3. Re-run coverage check
4. Repeat until no gaps or 3 passes reached

**Why 3 passes:** Each pass costs ~N LLM calls (N = uncovered requirements). After pass 1 the gap is almost always closed for normal job descriptions. Pass 2 handles edge cases (thin JDs, unusual requirements). Pass 3 is a safety net. Passes beyond 3 offer diminishing returns and risk rate-limit exhaustion on the free tier. The final `coverage.uncovered_requirement_ids` array records any remaining gaps honestly.

---

## Builder State Model

Every question, flashcard, and regeneratable section carries a `_state` field:

| Value | Meaning | Survives section regeneration? |
|---|---|---|
| `"generated"` | Created by the pipeline, never touched by user | No — replaced |
| `"edited"` | User has modified the content inline | Yes — preserved |
| `"pinned"` | User has explicitly locked it (📌 button) | Yes — preserved |

When a section is regenerated (e.g. "Regenerate technical questions"):
1. Questions in that category with `_state: "edited"` or `"pinned"` are extracted and kept
2. New questions are generated only for the remaining requirements
3. The preserved + new questions are merged back

This means a question the user wrote or edited by hand survives regeneration of its category regardless of what the model produces.

---

## Schedule Allocation

Fully deterministic — no LLM.

1. Sort all questions: must-have requirements first, then by `difficulty` descending (3 → 1). Hard, important material lands on day 1.
2. Divide the sorted list into `daysAvailable` equal buckets using `Math.ceil(total / days)`.
3. Each day's `minutes` = `question_count × 15`, always an integer (`Math.round`).
4. Days with no questions (when `days > questions`) get `focus: "Review and self-assessment"` and `minutes: 30`.
5. Every must-have requirement appears in the schedule because all questions are distributed and must-have questions sort to the front.

---

## Edge Cases and Failure Handling

| Scenario | Handling |
|---|---|
| Invalid/unreachable company URL | Validation fails fast; pipeline continues without company data; brief notes the gap |
| No hiring page found | `hiringInfo` is empty string; questions are generated from JD alone |
| Very short JD (2-line stub) | Extractor is instructed to extract only what is present — a thin JD produces few requirements and a thin kit that says so |
| No public discussion | `researchPublicDiscussion` returns `{found: false}`; brief says no public info found |
| LLM returns invalid JSON | `extractJson` tries direct parse, then regex extraction of the first JSON block |
| LLM rate limit (429) / overload (503/500) | Exponential backoff, up to 6 retries, capped at 60 s per delay |
| Same description submitted twice | No deduplication — two separate kits are created. Out of scope per brief. |
| 1-day schedule | All questions land on day 1 |
| 60-day schedule | Questions distributed across 60 days; later days get "Review and self-assessment" |
| Redirect-based SSRF | Final URL after redirects is re-validated against private IP blocklist |

---

## Known Limitations

- **Render free tier cold starts:** The backend sleeps after 15 minutes of inactivity. First request after sleep takes ~30–50 s before generation begins.
- **Gemini 1.5 Flash free tier:** 1,500 requests/day, 15 req/min. The pipeline uses ~15–25 calls per kit. Heavy use (>60 kits/day) will hit the daily cap.
- **JavaScript-rendered company sites:** Cheerio cannot execute JavaScript. Sites that load content dynamically (heavy SPAs) will return sparse content. A headless browser would fix this but is out of scope for the free-tier constraint.
- **Reddit API rate limits:** The public JSON API is unauthenticated and occasionally rate-limited. Failures are silently skipped.
- **No deduplication:** Submitting the same JD twice creates two kits. A content hash check was considered but left out of scope.
