# CareerPilot Retail — GitHub edition

Questa versione usa GitHub Pages per la dashboard e GitHub Actions per la scansione.

Il curriculum generato è un CV normale, lineare e ATS-friendly: una sola versione per offerta, nessuna variante Elite o Ultra.

I dati personali del curriculum NON vanno salvati nel repository pubblico. Il profilo va inserito nei GitHub Secrets come `CAREERPILOT_PROFILE_B64` oppure `CAREERPILOT_PROFILE_JSON`.

Per WhatsApp Cloud API configurare `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TO`, `WA_GRAPH_VERSION`. I PDF vengono generati nel workflow, inviati via WhatsApp se configurato e conservati come artifact del run; non vengono pubblicati su Pages.

Il workflow è schedulato ogni 5 minuti. Non tenta di aggirare CAPTCHA, login o protezioni anti-bot dei portali.
