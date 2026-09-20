export type InadRecord={nome:string;comune:string;domicilio_digitale:string;fonte_url:string;stato_verifica:string};
export const INAD_PUBLIC_URL="https://domiciliodigitale.gov.it/";
export function runtimeStatus(){return {provider:"INAD",status:"ACCESSO_NON_DISPONIBILE",mode:"PUBLIC_INTERACTIVE_OR_AUTHORIZED_CONNECTOR"}}
export function normalizeInad(input:Partial<InadRecord>):InadRecord{
 return {nome:String(input.nome||"").trim(),comune:String(input.comune||"").trim(),domicilio_digitale:String(input.domicilio_digitale||"").trim().toLowerCase(),fonte_url:String(input.fonte_url||INAD_PUBLIC_URL),stato_verifica:String(input.stato_verifica||"DA_VERIFICARE")};
}
// Le API/estrazioni multiple non vengono usate senza titolo di accesso conforme e credenziali autorizzate.
