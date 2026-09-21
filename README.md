# AI Interview Prep Kit

Turn any job description into a personalised interview preparation kit in minutes.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Specified in brief; App Router for colocated loading/error states |
| Backend | Node.js + Express | Lightweight, simple SSE support |
| Database | MongoDB + Mongoose | Flexible document model suits the nested kit structure |
| LLM | Google Gemini 1.5 Flash | Free tier, fast, sufficient quality |
| Scraping | axios + cheerio + robots-parser | Lightweight, no headless browser needed for text extraction |
| Auth | JWT in HTTP-only cookie | Simple, stateless, XSS-resistant |
| Validation | Zod | Schema-first, great TypeScript support |
| Tests | Jest | Standard JS/TS test runner |

---

## Project Structure

```
/
├── backend/              # Express API + pipeline services
│   ├── src/
│   │   ├── app.js        # Express entry point
│   │   ├── routes/       # auth.js, kits.js
│   │   ├── models/       # User.js, Kit.js (Mongoose)
│   │   ├── services/
│   │   │   ├── crawler.js      # Site crawl + robots.txt
│   │   │   ├── researcher.js   # DuckDuckGo public discussion
│   │   │   ├── extractor.js    # LLM requirement extraction + company brief
│   │   │   ├── generator.js    # LLM question + flashcard generation
│   │   │   ├── scheduler.js    # Deterministic schedule allocation
│   │   │   ├── coverage.js     # Deterministic gap detection
│   │   │   └── pipeline.js     # Orchestrator with SSE progress
│   │   ├── middleware/   # auth.js (JWT)
│   │   └── utils/        # retry.js, jsonRepair.js, urlSanitise.js, kitValidator.js
│   └── evaluate.js       # Batch CLI entry point
├── frontend/             # Next.js 14 app
│   ├── app/
│   │   ├── login/        # Login page
│   │   ├── register/     # Register page
│   │   ├── dashboard/    # Kit list
│   │   ├── new/          # Create kit form
│   │   └── kit/[id]/     # Kit view + practice mode
│   ├── components/kit/   # CompanyBriefSection, QuestionsSection, etc.
│   └── lib/              # api.ts, AuthContext.tsx
└── tests/                # Jest unit tests
    ├── scheduler.test.js
    ├── coverage.test.js
    └── validation.test.js
```

---

## Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)
- Gemini API key from [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### Install

```bash
# Install all dependencies
cd backend && npm install
cd ../frontend && npm install
cd .. && npm install   # root Jest
```

### Configure

```bash
cp .env.example backend/.env
# Edit backend/.env and set:
#   GEMINI_API_KEY=your_key_here
#   JWT_SECRET=any_long_random_string
```

### Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Run Tests

```bash
npm test            # from root
# or
cd backend && npm test
```

### Batch CLI

```bash
npm run evaluate -- --input cases.json --output kits.json
```

**Input** (`cases.json`):
```json
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer\n\nWe are looking for ...",
    "company_url": "https://acme.com",
    "days": 5
  }
]
```

**Output** (`kits.json`) conforms to Appendix B of the spec.

The batch CLI:
- Does **not** require a running server or database — it runs the pipeline in-process
- Reads credentials from `backend/.env` (or environment variables)
- Continues after failures, records `status: "failed"` with an error code
- Works against local servers (e.g. `http://localhost:8099/acme/`) — URL sanitisation blocks private addresses only in `NODE_ENV=production`

---

## LLM Provider & Model

**Provider**: Google Gemini  
**Model**: `gemini-1.5-flash` (both fast and pro slots use flash for free-tier safety)

Rate limits are handled by:
- Exponential backoff with full jitter (base 1s, max 32s, up to 5 retries)
- A 1.5s delay between per-category question generation calls
- Detecting both HTTP 429 and `RESOURCE_EXHAUSTED` error messages

---

## Architecture — Pipeline Steps

The pipeline runs in 13 sequential steps. Each emits a Server-Sent Event so the frontend can show real progress:

| Step | What happens | LLM? |
|---|---|---|
| 1 | Validate + sanitise URL, hash JD for dedup | No |
| 2 | Fetch company homepage | No |
| 3 | Crawl site — extract + rank links by hiring/about keywords | No |
| 4 | Fetch best "about" page | No |
| 5 | Fetch best "hiring/careers" page (if found) | No |
| 6 | DuckDuckGo search for public interview discussion | No |
| 7 | Extract requirements from JD | **Yes** |
| 8 | Generate company brief using crawled content | **Yes** |
| 9 | Generate questions — one call per category (4 calls) | **Yes** |
| 10 | Generate flashcards | **Yes** |
| 11 | Coverage check pass 1 (deterministic) | No |
| 12 | Gap fill — generate questions for uncovered must-haves | **Yes** |
| 13 | Coverage check pass 2 (deterministic) | No |
| 14 | Build schedule (deterministic) | No |
| 15 | Validate kit structure (Zod) | No |

Pasted text needs no retrieval. A company homepage needs crawling before it is useful. A hiring page changes which questions make sense (a company that says "take-home then system design" generates different questions than one that says nothing). A requirement like "5 years React" generates technical questions; "mentoring junior engineers" generates behavioural ones — these come from separate prompts.

---

## Retrieval Approach

**Company site crawl:**
1. Fetch homepage, respect `robots.txt`
2. Extract all same-origin links from `<a>` tags
3. Score each link against two keyword sets:
   - **Hiring**: careers, jobs, hiring, join-us, open-positions, interview-process (score 6-10)
   - **About**: about-us, who-we-are, mission, team (score 4-8)
4. Fetch top 3 about candidates, then top 5 hiring candidates
5. Rate-limited with a 500ms delay between requests

A fixed list of paths (like `/careers`) is not sufficient — GitLab publishes their hiring process at `/handbook/hiring/`, PostHog at `/handbook/engineering/`, etc. The link-ranking approach discovers these.

**Public discussion:** DuckDuckGo HTML search (no API key). Extracts result snippets for `"<company>" interview process experience`. Text only — we do not fetch those external URLs.

**Sources used:** Company website only + DuckDuckGo HTML. Job boards are explicitly out of scope (they block automated access).

---

## Generated / Edited / Pinned State

Every question and flashcard carries a `_state` field: `"generated" | "edited" | "pinned"`.

- **generated** — came from the LLM; replaced on section regeneration
- **edited** — user modified it; survives regeneration of its category
- **pinned** — user explicitly locked it; never replaced under any circumstance

When regenerating a category:
1. Separate the category's questions into `preserved` (edited/pinned) and `generated`
2. Run a fresh LLM call for that category
3. Merge: `[other_categories] + preserved + new_generated`
4. Re-run coverage check and rebuild schedule

This ensures a user's edits are never lost by a regeneration.

---

## Schedule Allocation

Implemented in `backend/src/services/scheduler.js` — no LLM involved:

1. Sort requirements: `must` first, then `nice`; within each group, sort by average question difficulty (descending) so harder material lands on earlier days
2. Collect question IDs in this sorted order
3. Bin-pack question IDs into N days (soft cap 6 questions/day, overflow to next day)
4. Each day's `minutes = question_count × 10` (min 30, max 120, always integer)
5. Edge cases: 1-day puts all must-haves on day 1; 60-day spreads content early with review days after

Every must-have requirement appears in the schedule. The number of schedule days equals exactly `daysAvailable`.

---

## Coverage Passes

Two passes, then honest reporting:

- **Pass 1**: Check which must-have requirements have no question covering them
- **Gap fill**: Generate targeted questions only for uncovered requirement IDs
- **Pass 2**: Re-check; remaining gaps are recorded in `coverage.uncovered_requirement_ids`

Two passes is the right trade-off: a third pass rarely helps (if the LLM couldn't cover it in two attempts, the requirement may be too vague), while running indefinitely would risk rate-limit exhaustion. A kit ships with gaps reported honestly rather than invented coverage.

---

## Edge Cases

| Case | Handling |
|---|---|
| Company URL invalid / 404 / timeout | Crawl returns empty strings; kit continues with "No information available" brief |
| No hiring page found | `hiringText` is empty; noted honestly in company brief |
| Two-line JD | Extracts what little there is; requirements array will be small; kit says so |
| No public discussion found | `publicDiscussion` is empty string; not fatal |
| LLM returns invalid JSON | `jsonRepair.js` strips markdown fences, finds JSON bounds, removes trailing commas |
| LLM rate-limit | Exponential backoff with jitter, up to 5 retries |
| Same JD + URL submitted twice | Dedup by MD5 hash; returns existing kit with `duplicate: true` |
| 1-day schedule | All must-haves on day 1 |
| 60-day schedule | Content distributed early; remaining days are review days |

---

## Security

- External URLs validated before fetch — scheme must be http/https
- Private/loopback addresses blocked in `NODE_ENV=production` (localhost allowed for batch testing)
- Content-type and size limits enforced on all fetched pages (500KB max)
- Fetched page text is treated as data to process, never as instructions — prompts always frame external content as quoted material (`"""..."""`)
- JWT stored in HTTP-only cookie, not localStorage
- Passwords hashed with bcrypt (cost factor 12)

---

## Key Design Decisions

**Why separate LLM calls per question category?**  
Targeted prompts per category produce better questions (a behavioural prompt can reference STAR framework; a system-design prompt can reference scale considerations). Failures are isolated — if the system-design call fails, technical questions still exist. And it respects Gemini's tokens-per-minute limit better than one giant call.

**Why DuckDuckGo and not a Search API?**  
No API key required, consistent with "free tier only" constraint. Result snippets are sufficient for the purpose (finding interview process descriptions).

**Why MD5 for dedup and not something stronger?**  
We're not using this for security — it's a lookup key to prevent re-generating the same kit. MD5 is fast and collision risk for this use case is negligible.

**Why SSE and not WebSockets?**  
SSE is simpler (HTTP, no upgrade, works through proxies), unidirectional (server → client), and exactly right for progress updates. No bidirectional communication is needed here.

**Known limitations:**
- Gemini 1.5 Flash quality for complex system-design questions can be inconsistent
- DuckDuckGo scraping may stop working if they change their HTML structure
- The crawler does not execute JavaScript, so SPAs that render links client-side will appear to have fewer links
- Practice mode uses a simple confidence-weighted sort (not full spaced-repetition intervals) — defensible for the timebox
