# LAMBERTIQ

**Learn Smarter. Think Better. Achieve More.**

Real Multi-AI Academic Learning Platform — Next.js 14, TypeScript, Node 24 built-in SQLite (zero native deps). English + Kiswahili. Environmental Engineering focus.

## Architecture
```
Student → LAMBERTIQ AI Router → Provider Manager → {Gemini, Groq, OpenRouter, Mistral, HF, Cloudflare}
→ Response Collector → Analyzer → Synthesizer → Final Answer (+ deterministic calc/validation layer)
```

## Quick start
```bash
npm install
copy .env.example → .env.local   # add free-tier keys (server-side only)
npm run dev                       # http://localhost:3000
```
Demo accounts (seeded on first run):
- Student: `student@lambertiq.education` / `student123`
- Admin:  `admin@lambertiq.education` / `admin123`  (change via `ADMIN_PASSWORD`)

## Features built
- **Multi-AI engine** (`lib/ai/`) — 6 provider adapters, extension point `registerProvider()`, quota-aware router (1 model simple, 2–4 complex/important), fallback Gemini→Groq→OpenRouter→Mistral/HF, synthesizer (agreements/contradictions/uncertainty; never majority-wins; document-priority).
- **Engineering Solver** (`lib/ai/calculator.ts`) — deterministic HRT/OLR/flow with Given→Formula→Substitution→Units→Answer→Explanation; `/api/calc`.
- **Auth** — NextAuth credentials + bcrypt, register/login, middleware-protected pages, admin gating.
- **Database** — `lib/db.ts` on `node:sqlite` (`data/lambertiq.db`). 20 tables incl. users, departments, subjects, topics, conversations, documents+chunks, ai_providers, ai_requests/responses, synthesized_answers, quizzes, quiz_attempts, study_progress, question_bank, system_settings. Auto-seeded with 12 departments, full Env Eng taxonomy, providers, question bank.
- **Document Analyzer** — PDF (pdf-parse), DOCX (mammoth), PPTX (jszip XML), TXT. Semantic chunking + keyword retrieval with overlap. Offline answer="According to your document" when models are unavailable; online answer via Document Q&A mode with document-priority synthesis.
- **Quiz engine** — generate from subject/topic/difficulty (question bank or AI), MCQ/TF/short-answer, deterministic grading, attempts + study_progress recorded, admin question-bank CRUD.
- **Smart study dashboard** — questions asked, streak, avg score, weak topics → recommended topics (e.g. Water Treatment → Coagulation, Filtration, Disinfection).
- **Admin** — provider enable/disable, priority, daily limits, model names, request counters — persisted to DB, applied on next request. Keys remain in env only.

## Key paths
- `lib/ai/providers/adapters.ts` — add a provider by implementing `AIProviderAdapter` + `registerProvider()`
- `lib/ai/router.ts` / `synthesizer.ts` — routing & synthesis intelligence
- `lib/engine.ts` — shared chat pipeline (`/api/chat` + document Q&A), usage logging
- `lib/db.ts` — schema, seeding, CRUD; `lib/parsers.ts` — file extraction/chunking/retrieval
- `data/curriculum.ts` — departments + Environmental Engineering taxonomy + recommendations

## Safety
Keys via env + server routes only; never sent to the browser. Friendly errors (no stacks/keys). Rate limiting + response caching + request dedup. Engineering answers always flagged for verification; no fabricated citations.

## Phases
1–4 Foundation (UI, DB, auth, providers) · 5 Router · 6 Synthesis · 7 Env subjects · 8 Document Analyzer · 9 Quiz + bank · 10 Calc solver · 11 Student dashboard · 12 Admin · 13 Tested via `/api` e2e · 14 Deploy (`next build` ready)