# F1 Email Radar — Adapter Albi

Gli adapter degli Albi producono sempre lo stesso formato normalizzato:

```json
{
  "nome": "",
  "cognome": "",
  "professione": "",
  "ordine": "",
  "comune": "",
  "indirizzo": "",
  "telefono": "",
  "email": "",
  "pec": "",
  "sito": "",
  "numero_iscrizione": "",
  "fonte_url": "",
  "stato_verifica": "DA_VERIFICARE"
}
```

Regole:
- usare soltanto fonti pubbliche e modalità/API autorizzate;
- non aggirare CAPTCHA, login o protezioni anti-bot;
- non dedurre email da pattern;
- PEC ed email ordinaria restano campi distinti;
- se un Albo non offre una modalità automatizzabile conforme, lo stato resta `ACCESSO_NON_DISPONIBILE` o `CREDENTIALS_REQUIRED`;
- i dati estratti devono mantenere URL fonte e data di verifica.

Gli adapter previsti sono definiti in `providers.json`. La presenza nel manifest non equivale a dichiarare la fonte automatizzata.
