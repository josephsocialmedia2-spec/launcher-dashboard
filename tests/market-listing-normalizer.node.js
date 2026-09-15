const assert=require('assert');
const Parser=require('../market-listing-parser.js');
const Research=require('../market-listing-research.js');
const raw=`350 mq
10 Locali
Su più livelli
3 Bagni

Descrizione:
Proponiamo in vendita una villa trifamiliare indipendente composta da tre unità abitative.
AL PIANO TERRA si trova un appartamento trilocale da ristrutturare con cucina abitabile, una camera, un bagno e accesso al giardino.
IL PRIMO PIANO ospita un appartamento quadrilocale ristrutturato nel 2010 circa, infissi in PVC con doppio vetro, due camere, un bagno e due balconi.
AL SECONDO PIANO è presente un appartamento parzialmente mansardato in buone condizioni, due camere, un bagno e due balconi.
Completano la proprietà un ampio giardino e cortile esterno di circa 450 mq, un'autorimessa doppia e quattro posti auto.
Il riscaldamento è autonomo a gas GPL con possibilità di allaccio alla rete del metano.
I render sono indicativi e non seguono un progetto.
Ogni agenzia ha un proprio titolare ed è autonoma.
Le presenti informazioni non costituiscono elemento contrattuale.
Non voglio essere contattato da agenzie o telemarketing`;
const d=Parser.normalize(raw,{comune:'Villar Dora',source:'Subito.it',via:'INDIRIZZO DA VERIFICARE'});
assert.equal(d.property_type_raw.toLowerCase(),'villa trifamiliare indipendente');
assert.equal(d.property_type_normalized,'VILLA_TRIFAMILIARE');
assert.equal(d.property_category,'RESIDENZIALE');
assert.equal(d.independent,true);
assert.equal(d.housing_units,3);
assert.equal(d.commercial_sqm,350);
assert.equal(d.rooms,10);
assert.equal(d.bathrooms,3);
assert.equal(d.floor_configuration,'MULTILIVELLO');
assert.equal(d.building_levels,3);
assert.deepEqual(d.floors_present,['PIANO_TERRA','PRIMO_PIANO','SECONDO_PIANO']);
assert.equal(d.garden,true);
assert.equal(d.garden_sqm,null);
assert.equal(d.garden_courtyard_sqm,450);
assert.equal(d.garden_courtyard_sqm_estimated,true);
assert.equal(d.garage,true);
assert.equal(d.garage_type,'DOPPIO');
assert.equal(d.garage_spaces,2);
assert.equal(d.parking_spaces,4);
assert.equal(d.heating_type,'AUTONOMO');
assert.equal(d.heating_fuel,'GPL');
assert.equal(d.methane_connection_possible,true);
assert.equal(d.agency_detected,true);
assert.equal(d.agency_name,null);
assert.equal(d.advertiser_type,'REAL_ESTATE_AGENCY');
assert.equal(d.classification,'COMPETITOR_LISTING');
assert.equal(d.status,'MONITORAGGIO_CONCORRENZA');
assert.equal(d.verification_confidence,'HIGH');
assert.equal(d.next_action,'IDENTIFICA AGENZIA PUBBLICATRICE');
assert.match(d.classification_evidence,/Ogni agenzia ha un proprio titolare ed è autonoma/i);
assert.match(d.contact_preference_raw,/telemarketing/i);
assert.notEqual(d.classification,'FSBO_VERIFIED');
assert.equal(d.reference_code,null);
assert.equal(d.external_listing_id,null);
assert.equal(d.street,'');
assert.equal(d.address_raw,'');
assert.equal(d.units.length,3);
assert.deepEqual(d.units[0],{floor:'PIANO_TERRA',rooms_type:'TRILOCALE',condition:'DA_RISTRUTTURARE',kitchen:'CUCINA_ABITABILE',bedrooms:1,bathrooms:1,garden_access:true,renovated:false,renovation_year_approx:null,window_material:null,window_glass:null,partially_attic:false,balconies:null});
assert.equal(d.units[1].rooms_type,'QUADRILOCALE');
assert.equal(d.units[1].renovated,true);
assert.equal(d.units[1].renovation_year_approx,2010);
assert.equal(d.units[1].window_material,'PVC');
assert.equal(d.units[1].window_glass,'DOPPIO_VETRO');
assert.equal(d.units[1].bedrooms,2);
assert.equal(d.units[1].bathrooms,1);
assert.equal(d.units[1].balconies,2);
assert.equal(d.units[2].partially_attic,true);
assert.equal(d.units[2].condition,'BUONE_CONDIZIONI');
assert.equal(d.units[2].bedrooms,2);
assert.equal(d.units[2].bathrooms,1);
assert.equal(d.units[2].balconies,2);
const qs=Research.queries(d);
assert(qs.some(x=>x.label==='CERCA STESSO ANNUNCIO'));
assert(qs.some(x=>x.label==='CERCA AGENZIA PUBBLICATRICE'));
assert(qs.some(x=>x.label==='CERCA FRASE DESCRIZIONE'));
assert(!qs.some(x=>x.label==='CERCA CODICE ANNUNCIO'));
assert(!qs.some(x=>x.label==='CERCA INDIRIZZO'));
assert(!qs.some(x=>/INDIRIZZO DA VERIFICARE/i.test(x.q)));
assert(!qs.some(x=>/^\"?amiliare\"?$/i.test(x.q)));
const links=Research.links(d);
assert(!links.some(([l])=>l==='CERCA CODICE ANNUNCIO'));
assert(!links.some(([l])=>l==='CERCA INDIRIZZO'));
const clone={...d,source_url:'https://example.test/other',agency_name:'Agenzia Test'};
assert.equal(Research.compareCandidate(d,clone).status,'POSSIBILE_STESSO_IMMOBILE');
assert.equal(Parser.strictReferenceCode('Rif.: ABC123'),'ABC123');
assert.equal(Parser.strictReferenceCode('EK-111886863'),'EK-111886863');
assert.equal(Parser.strictReferenceCode('testo immobiliare e amiliare'),null);
console.log('PASS market listing hierarchy/classification/dork regression');
