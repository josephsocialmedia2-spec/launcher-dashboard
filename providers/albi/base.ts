export type AlboNormalizedRecord = {
  nome:string; cognome:string; professione:string; ordine:string; comune:string;
  indirizzo:string; telefono:string; email:string; pec:string; sito:string;
  numero_iscrizione:string; fonte_url:string; stato_verifica:string;
};

export type AlboAdapterConfig = {
  key:string; professione:string; territorio:string; sourceUrlEnv:string;
};

export function adapterStatus(config:AlboAdapterConfig){
  const sourceUrl=Deno.env.get(config.sourceUrlEnv)||"";
  return {
    key:config.key,
    professione:config.professione,
    territorio:config.territorio,
    status:sourceUrl?"SOURCE_CONFIGURED":"SOURCE_CONFIGURATION_REQUIRED",
    sourceUrl
  };
}

export function emptyNormalized():AlboNormalizedRecord{
  return {nome:"",cognome:"",professione:"",ordine:"",comune:"",indirizzo:"",telefono:"",email:"",pec:"",sito:"",numero_iscrizione:"",fonte_url:"",stato_verifica:"DA_VERIFICARE"};
}

// Ogni albo ha schema e condizioni proprie. L'adapter specifico deve aggiungere il parser
// solo dopo verifica della fonte/API e non deve aggirare CAPTCHA, login o protezioni anti-bot.
