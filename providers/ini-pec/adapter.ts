export type IniPecRecord={denominazione:string;comune:string;pec:string;fonte_url:string;stato_verifica:string};
export const INI_PEC_PUBLIC_URL="https://www.inipec.gov.it/";
export function runtimeStatus(){return {provider:"INI_PEC",status:"ACCESSO_NON_DISPONIBILE",mode:"PUBLIC_INTERACTIVE_OR_AUTHORIZED_CONNECTOR"}}
export function normalizeIniPec(input:Partial<IniPecRecord>):IniPecRecord{
 return {denominazione:String(input.denominazione||"").trim(),comune:String(input.comune||"").trim(),pec:String(input.pec||"").trim().toLowerCase(),fonte_url:String(input.fonte_url||INI_PEC_PUBLIC_URL),stato_verifica:String(input.stato_verifica||"PEC_DA_VERIFICARE")};
}
// Nessun fetch automatizzato: aggiungerlo solo quando F1 dispone di modalità/API autorizzata documentata.
