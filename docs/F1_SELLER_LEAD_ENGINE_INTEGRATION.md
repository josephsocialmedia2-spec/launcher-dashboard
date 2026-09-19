# F1 Seller Lead Engine — Integration map

Audit aggiornato sul branch `main` il 2026-09-19.

## Componenti individuati

- Seller Radar: `seller-radar-unico.html`, `seller-radar-cloud-archive.js`, `centrale-seller-bridge.js`, `data/acquisition-public.json`.
- CRM canonico: `crm.html`, `crm-unified-app.js`, `f1-acquisition-data.js`, Supabase (`leads`, `interactions`, `tasks` e tabelle immobiliari correlate).
- Microzone/territorio: `config/territory.json`, `data/neighborhood_intelligence.json`, `scripts/neighborhood_intelligence_v4.py`, `windows-bridge/f1_microzone_directory_v3.py`.
- Pipeline Acquisition: `scripts/acquisition_daily.py`, `.github/workflows/f1-acquisition-daily.yml`, `f1-acquisition-core.js`.
- Just Listed/Sold: `just-listed-sold.html`, `just-listed-sold.js`, `.github/workflows/f1-just-listed-sold-qa.yml`.
- Follow-up: regole in `docs/FOLLOWUP_RULES.md`; orchestrazione pubblica nel Seller Lead Engine.
- Scheduler comunicazioni: `data/communication-outbox.json`, generato da `scripts/seller_lead_engine.py`; nessun recapito personale viene pubblicato.
- WhatsApp: nessuna implementazione Seller canonica di invio automatico trovata nel main. Esistono riferimenti storici e un modulo `career-pilot/engine/whatsapp.py` che non appartiene alla pipeline immobiliare canonica. Il Seller Lead Engine prepara la coda con stato `WHATSAPP_MANUAL_REQUIRED` finché il CRM autenticato non fornisce eleggibilità e un trasporto autorizzato.
- Email: nessun motore email Seller canonico trovato nel main. Esiste `career-pilot/engine/email_digest.py`, non parte del CRM immobiliare F1. Il Seller Lead Engine prepara la coda con stato `EMAIL_MANUAL_REQUIRED`.
- Postiz: nessun file, branch o commit con Postiz è stato individuato nel repository. `data/postiz-outbox.json` contiene bozze non sensibili pronte per l'integrazione quando l'installazione Postiz esistente sarà tecnicamente individuabile.

## Decisione architetturale

Il Seller Lead Engine è un orchestratore non distruttivo. Non sostituisce `oggi.html`, non sostituisce `crm.html`, non pubblica PII e non duplica Seller Radar.

Flusso:

`Seller Radar / Acquisition → microzona v4 → Seller Lead Engine → lead scoring → communication outbox / Postiz outbox → CRM autenticato per destinatari e gate canale`.

## Microzona canonica

`config/territory.json` definisce una microzona quadrata con `half_side_m=1000`.

Il fast sync è stato riallineato a `scripts/neighborhood_intelligence_v4.py` e a `F1_NEIGHBORHOOD_HALF_SIDE=1000`, eliminando il vecchio percorso v3/500 m che poteva sovrascrivere il feed notturno.

## Comunicazioni

`data/communication-outbox.json` contiene solo:

- priorità e tipo campagna;
- Comune/via del segnale immobiliare;
- finestra operativa della giornata;
- testo e CTA;
- stato email/WhatsApp;
- regola di lookup destinatario nel CRM autenticato.

Non contiene destinatari, telefoni o email.

## Valutazione

CTA centrale:

`VALUTAZIONE PROFESSIONALE GRATUITA`

https://www.agentpricing.com/j.malafronte

## QA

`.github/workflows/f1-seller-lead-engine-qa.yml` esegue su push a `main`:

1. test Python;
2. test browser desktop/mobile;
3. smoke test del deployment GitHub Pages dopo il completamento dei primi due job.
