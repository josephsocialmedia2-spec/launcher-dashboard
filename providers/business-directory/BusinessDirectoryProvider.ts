export type BusinessDirectoryCandidate={provider_id:string;website_url:string};
export interface BusinessDirectoryProvider{
 key:string;
 configured():boolean;
 search(textQuery:string):Promise<BusinessDirectoryCandidate[]>;
}
// I dati directory sono usati solo per discovery. Il database territoriale è alimentato dopo verifica su fonte primaria.
