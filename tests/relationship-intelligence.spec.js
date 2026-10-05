const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('albero-fonti-notizie.html','utf8');
const ri=fs.readFileSync('f1-relationship-intelligence.js','utf8');
const cloud=fs.readFileSync('f1-tree-cloud.js','utf8');
const today=fs.readFileSync('f1-os-today.js','utf8');
const todayHtml=fs.readFileSync('oggi.html','utf8');
const territory=fs.readFileSync('f1-territory-workspace.js','utf8');
const cfg=JSON.parse(fs.readFileSync('config/relationship-intelligence.json','utf8'));

for(const needle of ['relationshipIntelligenceBox','f1-relationship-intelligence.js','f1-relationship-intelligence.css','riEvidenceList']){
  assert(html.includes(needle),'Albero missing '+needle);
}
for(const needle of ['relationshipScore','signalLevel','shortestPath','reasonFor','publicIntelligence','source_url_required_for_verified_evidence']){
  if(needle==='source_url_required_for_verified_evidence') assert(cfg.rules[needle]===true,'Config missing verified-source rule');
  else assert(ri.includes(needle),'Engine missing '+needle);
}
assert(cloud.includes('...(p._treeMeta'),'Cloud sync must preserve existing tree_meta');
assert(cloud.includes('publicIntelligence:p.publicIntelligence'),'Cloud sync must persist public intelligence');
for(const id of ['rDue','rStale','rSignals','rEvidence']) assert(todayHtml.includes('id="'+id+'"'),'Today missing '+id);
assert(today.includes('followup_allowed'),'Today must respect follow-up permission');
assert(today.includes("channel!=='NESSUNO'"),'Today must respect authorized channel');
assert(territory.includes("URLSearchParams(location.search)"),'Territory deep link missing');
assert(cfg.rules.no_ownership_inference===true,'Ownership inference must remain disabled');
assert(cfg.rules.no_sale_intent_inference===true,'Sale intent inference must remain disabled');
console.log('PASS relationship intelligence contract');
