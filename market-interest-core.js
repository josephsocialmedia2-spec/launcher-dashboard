(function(root){
'use strict';
const VERSION='20260914-research1';
const DEFAULT_PORTALS=['immobiliare.it','idealista.it','casa.it','subito.it'];
const c=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>c(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const quote=v=>{const x=c(v).replace(/"/g,'');return x?'"'+x+'"':''};
function canonicalUrl(value){try{const u=new URL(c(value));u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|ref|source)$/i.test(k))u.searchParams.delete(k);const q=u.searchParams.toString();return (u.origin+u.pathname+(q?'?'+q:'')).replace(/\/$/,'').toLowerCase()}catch(_){return c(value).replace(/#.*$/,'').replace(/\/$/,'').toLowerCase()}}
function normalizePhone(value){let d=c(value).replace(/\D/g,'');if(d.startsWith('0039'))d=d.slice(4);if(d.startsWith('39')&&d.length>10)d=d.slice(2);return d}
function normalizeEmail(value){return c(value).toLowerCase()}
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function seedFromLead(lead){const m=lead?.market_data&&typeof lead.market_data==='object'?lead.market_data:{};return{
  market_listing_id:c(lead?.lead_id),source_url:c(m.source_url||lead?.source_url),source_portal:c(m.source_portal||lead?.source),external_listing_id:c(m.external_listing_id),reference_code:c(m.reference_code),listing_updated_at:c(m.listing_updated_at),property_type_normalized:c(m.property_type_normalized),property_category:c(m.property_category),transaction_type:c(m.transaction_type),street:c(m.street||lead?.via),street_number:c(m.street_number||lead?.civico),fraction:c(m.fraction),municipality:c(m.municipality||lead?.comune),zone:c(m.zone||lead?.zona),price:m.price??null,commercial_sqm:m.commercial_sqm??null,advertiser_name:c(m.advertiser_name),agency_name:c(m.agency_name||lead?.competitor_agency),classification:c(m.classification||lead?.lead_reason),portal_domains:Array.isArray(m.portal_domains)?m.portal_domains.filter(Boolean):[]
}}
function addQuery(out,seen,stage,priority,query,kind='SEARCH'){query=c(query);if(!query)return;const key=norm(query);if(seen.has(key))return;seen.add(key);out.push({id:'q-'+hash(stage+'|'+key),stage,priority,kind,query,status:'PENDING'})}
function buildQueries(seed={},opts={}){const out=[],seen=new Set(),s={...seed};const person=c(s.advertiser_name),municipality=c(s.municipality||s.comune),street=c(s.street||s.via||s.fraction),number=c(s.street_number||s.civico),exactAddress=c([street,number].filter(Boolean).join(' ')),reference=c(s.reference_code),listingId=c(s.external_listing_id),portals=[...new Set([...(Array.isArray(opts.portalDomains)?opts.portalDomains:[]),...(Array.isArray(s.portal_domains)?s.portal_domains:[]),...DEFAULT_PORTALS].map(x=>c(x).replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'')).filter(Boolean))];
  if(person){
    addQuery(out,seen,'REFERENTE',10,`${quote(person)} immobiliare`);
    if(municipality)addQuery(out,seen,'REFERENTE',20,`${quote(person)} ${quote(municipality)}`);
    if(street)addQuery(out,seen,'REFERENTE',30,`${quote(person)} ${quote(street)}`);
    addQuery(out,seen,'REFERENTE',32,quote(person));
    addQuery(out,seen,'REFERENTE',33,`${quote(person)} agenzia`);
    addQuery(out,seen,'REFERENTE',34,`${quote(person)} ${quote('agenzia immobiliare')}`);
    addQuery(out,seen,'REFERENTE',35,`${quote(person)} ${quote('agente immobiliare')}`);
  }
  if(reference)addQuery(out,seen,'ANNUNCIO',40,quote(reference));
  if(listingId)addQuery(out,seen,'ANNUNCIO',41,quote(listingId));
  if(exactAddress&&municipality){
    addQuery(out,seen,'IMMOBILE',50,`${quote(exactAddress)} ${quote(municipality)}`);
    addQuery(out,seen,'IMMOBILE',51,`${quote(exactAddress)} vendita`);
    addQuery(out,seen,'IMMOBILE',52,`${quote(exactAddress)} immobiliare`);
  }
  if(street&&municipality){
    addQuery(out,seen,'IMMOBILE',53,`${quote(street)} ${quote(municipality)}`);
    addQuery(out,seen,'IMMOBILE',54,`${quote(street)} ${quote(municipality)} vendita`);
    for(const domain of portals)addQuery(out,seen,'PORTALI',60,`site:${domain} ${quote(street)} ${quote(municipality)}`);
  }
  if(person){
    addQuery(out,seen,'SOCIAL',70,`${quote(person)} site:linkedin.com`);
    addQuery(out,seen,'SOCIAL',71,`${quote(person)} site:facebook.com`);
    addQuery(out,seen,'SOCIAL',72,`${quote(person)} site:instagram.com`);
  }
  if(street&&municipality){
    for(const term of ['attività','geometra','impresa','immobili','agenzia'])addQuery(out,seen,'TERRITORIO',80,`${quote(street)} ${quote(municipality)} ${term}`,'TERRITORY');
  }
  out.sort((a,b)=>a.priority-b.priority||a.query.localeCompare(b.query,'it'));
  const max=Math.max(1,Number(opts.maxQueries)||28);
  return out.slice(0,max)
}
function buildAgencyQueries(seed={},agency='',domain=''){const out=[],seen=new Set(),name=c(agency),person=c(seed.advertiser_name),municipality=c(seed.municipality||seed.comune),host=c(domain).replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'');if(!name)return out;
  addQuery(out,seen,'AGENZIA',5,quote(name),'CASCADE');
  if(municipality)addQuery(out,seen,'AGENZIA',6,`${quote(name)} ${quote(municipality)}`,'CASCADE');
  if(person)addQuery(out,seen,'AGENZIA',7,`${quote(person)} ${quote(name)}`,'CASCADE');
  if(host&&person)addQuery(out,seen,'AGENZIA',8,`site:${host} ${quote(person)}`,'CASCADE');
  for(const term of ['telefono','email','Instagram','Facebook'])addQuery(out,seen,'AGENZIA',9,`${quote(name)} ${term}`,'CASCADE');
  return out
}
function csvEscape(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
function entitiesCsv(seed,entities=[],results=[]){const header=['IMMOBILE','INDIRIZZO','COMUNE','NOME','COGNOME','RUOLO','AGENZIA','TELEFONO','EMAIL','PEC','SITO','FACEBOOK','INSTAGRAM','LINKEDIN','FONTE','URL_FONTE','QUERY_GOOGLE','STATO_VERIFICA'];const address=[c(seed.street||seed.via),c(seed.street_number||seed.civico)].filter(Boolean).join(' '),property=c(seed.property_type_normalized||seed.property_category),resultByUrl=new Map(results.map(r=>[canonicalUrl(r.url),r]));const rows=(entities.length?entities:[{}]).map(x=>{const full=c(x.name),parts=full.split(' ').filter(Boolean),isPerson=String(x.entity_type||'').toUpperCase()==='PERSON',surname=isPerson&&parts.length>1?parts.pop():'',first=isPerson?parts.join(' '):full,sources=Array.isArray(x.source_urls)?x.source_urls:[],src=sources[0]||'',r=resultByUrl.get(canonicalUrl(src))||{};return[property,address,c(seed.municipality||seed.comune),first,surname,c(x.role),c(x.organization),c(x.phone_raw||x.phone_normalized),c(x.email),c(x.pec),c(x.website),c(x.facebook_url),c(x.instagram_url),c(x.linkedin_url),c(r.domain),src,c(r.query),c(x.verification_status||'DA_VERIFICARE')]});return [header,...rows].map(row=>row.map(csvEscape).join(',')).join('\r\n')}
const api={version:VERSION,DEFAULT_PORTALS,clean:c,norm,quote,canonicalUrl,normalizePhone,normalizeEmail,seedFromLead,buildQueries,buildAgencyQueries,entitiesCsv};root.F1MarketInterestCore=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
