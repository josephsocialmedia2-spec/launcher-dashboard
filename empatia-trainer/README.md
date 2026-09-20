# Empatia Trainer

PWA mobile-first per allenare ascolto attivo, validazione emotiva e domande aperte tramite role-play vocale AI.

## URL
GitHub Pages: https://josephsocialmedia2-spec.github.io/launcher-dashboard/empatia-trainer/

## Architettura
- Frontend: GitHub Pages / PWA.
- Auth, database, Storage, RAG: Supabase.
- Backend: Supabase Edge Function `empatia-api`.
- RAG: `pgvector` 384 dimensioni + ricerca lessicale `pg_trgm`.
- Embedding: `gte-small` integrato in Supabase Edge Runtime.
- Voce: Web Speech API + speechSynthesis, con fallback testuale.
- PDF: PDF.js; OCR fallback Tesseract.js.
- AI generativa: provider OpenAI-compatible server-side.

## Tabelle isolate
`et_documents`, `et_document_pages`, `et_document_chunks`, `et_scenarios`, `et_sessions`, `et_messages`, `et_session_scores`, `et_daily_training`, `et_user_progress`.

Tutte le tabelle utente hanno RLS owner-only. Il bucket `empatia-documents` è privato.

## Configurazione AI generativa
La Edge Function accetta una delle seguenti configurazioni server-side:

### Vercel AI Gateway
```
AI_GATEWAY_API_KEY=
AI_MODEL=openai/gpt-5.6-sol
```

### Provider OpenAI-compatible
```
AI_API_KEY=
AI_BASE_URL=https://...
AI_MODEL=...
```

### OpenAI-compatible diretto
```
OPENAI_API_KEY=
AI_MODEL=...
```

Non inserire mai queste chiavi nel frontend.

## Endpoint logico
La Edge Function usa un endpoint unico e azioni JSON:
- `health`
- `embedding_selftest`
- `ingest_batch`
- `retrieve`
- `scenario_generate`
- `session_start`
- `session_message`
- `session_finish`

Le azioni private richiedono un JWT Supabase valido.

## Stato
Database, RLS, storage privato, RAG, embedding, frontend, PWA, PDF/OCR, voce, storico e Coach sono implementati. Il role-play generativo diventa operativo appena viene configurata la credenziale AI server-side.
