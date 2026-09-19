# F1 Seller Lead Engine — Integration map

Audit eseguito sul branch `main` e sulla cronologia Git disponibile.

## Componenti individuati

- Seller Radar: `seller-radar-unico.html`, `seller-radar-cloud-archive.js`, `centrale-seller-bridge.js`, `data/acquisition-public.json`.
- CRM canonico: `crm.html`, `crm-unified-app.js`, `f1-acquisition-data.js`, Supabase (`leads`, `interactions`, `tasks` e tabelle immobiliari correlate).
- Microzone/territorio: `config/territory.json`, `data/neighborhood_intelligence.json`, `scripts/neighborhood_intelligence.py`, `windows-bridge/f1_microzone_directory_v3.py`.
- Pipeline Acquisition: `scripts/acquisition_daily.py`, `.github/workflows/f1-acquisition-daily.yml`, `f1-acquisition-core.js`.
- Just Listed/Sold: `just-listed-sold.html`, `just-listed-sold.js`, `.github/workflows/f1-just-listed-sold-qa.yml`.
- WhatsApp: nessuna implementazione F1 Seller canonica trovata nel main. Esistono riferimenti storici e un modulo `career-pilot/engine/whatsapp.py` non appartenente alla pipeline immobiliare canonica.
- Email: nessun motore email Seller canonico trovato nel main. Esiste `career-pilot/engine/email_digest.py`, non parte del CRM immobiliare F1.
- Postiz: nessun file, branch o commit con Postiz trovato nel repository; anche la ricerca GitHub nell'owner non ha restituito un'integrazione F1 individuabile.

## Decisione architetturale

Il Seller Lead Engine viene aggiunto come orchestratore non distruttivo. Non sostituisce `oggi.html`, non sostituisce `crm.html`, non pubblica PII e non duplica Seller Radar. Produce un feed pubblico di priorità e una `postiz-outbox.json` di sole bozze finché Postiz non è tecnicamente mappato.

## Microzona

`config/territory.json` è la fonte canonica e definisce già una microzona di 1 km attorno all'immobile geocodificato. Il nuovo motore riusa questa regola.

## Valutazione

CTA centrale: `VALUTAZIONE PROFESSIONALE GRATUITA` → https://www.agentpricing.com/j.malafronte
