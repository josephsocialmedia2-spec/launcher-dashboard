# F1 OS — Autodiagnosi notturna — 2026-09-19

HEAD iniziale verificato: `4e4d01ad14f43b85b3eca486ab94ee8b4f73d529`.

| Componente | Test reale | Esito | Errore / limite | Correzione applicata | Retest |
|---|---|---|---|---|---|
| Repository GitHub | accesso repo, main e tree | PASS | — | — | n/a |
| GitHub Pages | workflow Pages sul HEAD iniziale | PASS | deploy `success` | — | n/a |
| OGGI COSA FACCIO | richiesta `/oggi.html` durante QA Playwright | PASS | HTTP 200 nel runner | — | n/a |
| Sistema Acquisizione Venditori / Funnel | QA `F1 Seller Lead Engine QA` | FAIL | test ancora cercava vecchia label `F1 SELLER LEAD ENGINE`; test mobile cercava `#openSellerLeadEngine` non più presente | aggiornato `tests/seller-lead-engine.spec.js` alla denominazione corrente e navigazione corrente | NUOVO WORKFLOW NON ANCORA DISPONIBILE al momento del registro |
| Seller Engine Python | `py_compile scripts/seller_lead_engine.py` | PASS | — | — | n/a |
| Feed Seller pubblico | test assenza campi privati | PASS | — | — | n/a |
| Communication outbox | test assenza destinatari risolti | PASS | — | — | n/a |
| CRM | endpoint `/crm.html` incluso nel contratto QA Seller | PASS parziale | non eseguito CRUD autenticato E2E in questa diagnosi | — | n/a |
| Radar | endpoint `/seller-radar-unico.html` incluso nel contratto QA Seller | PASS parziale | non eseguita scansione esterna completa in questa diagnosi | — | n/a |
| App smartphone | `/territory-mobile.html` caricato dal QA | PASS parziale | dispositivo reale, installazione PWA, offline, microfono e LAN non testabili dal runner | — | BLOCCATO E2E |
| PWA | asset `pwa.js` richiesto con HTTP 200 nel QA mobile | PASS parziale | installazione/offline reale non verificati | — | BLOCCATO E2E |
| Database/cloud | asset Supabase caricati nel QA mobile | PASS parziale | autenticazione e ciclo CRUD cloud reale non verificati in questa diagnosi | — | BLOCCATO E2E |
| Role Play | ricerca nel default branch | BLOCCATO / NON IDENTIFICATO | nessun risultato canonico trovato con le query Role Play/role-play | — | — |
| Backup/restore | ricerca nel default branch | BLOCCATO / NON CERTIFICATO | nessun test reale di backup/restore eseguito | — | — |
| PC locale / localhost | runtime locale | BLOCCATO | richiede PC, servizi localhost e/o credenziali locali | — | — |

## Errore confermato
Il workflow `F1 Seller Lead Engine QA` run `35472760045` è fallito: 4 test browser falliti e 4 passati. Il job Python è PASS. I fallimenti browser sono dovuti a selettori/test rimasti sulla vecchia denominazione dopo la rinomina del modulo; il codice corrente mostra `F1 SISTEMA ACQUISIZIONE VENDITORI`.

## Correzione sicura
Aggiornato esclusivamente il test Playwright `tests/seller-lead-engine.spec.js`; nessuna modifica ai dati CRM, policy cloud o dati di produzione. Commit correzione: `5b544328a397b51e543b00ed0d8fe1d2723ae105`.

## Stato finale
NON CERTIFICATO end-to-end. Pages sul precedente HEAD è PASS; resta da osservare il nuovo workflow QA dopo il commit di correzione. Componenti che richiedono device/PC/localhost o operazioni cloud reali restano BLOCCATI e non sono dichiarati funzionanti.
