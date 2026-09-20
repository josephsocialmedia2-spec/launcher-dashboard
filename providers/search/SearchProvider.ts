export type SearchHit={url:string;title?:string};
export interface SearchProvider{
 key:string;
 configured():boolean;
 search(query:string):Promise<SearchHit[]>;
}
// I SearchHit sono discovery: non sono prova del dato. Il record F1 nasce solo dopo verifica della fonte primaria.
