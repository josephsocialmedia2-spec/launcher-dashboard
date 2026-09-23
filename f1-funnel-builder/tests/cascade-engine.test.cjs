const assert=require('assert');
const engine=require('../cascade-engine.js');

function allCovered(g){
  const covered=new Set();
  for(const n of g.essentialNodes)for(const id of n.sourceIds||[])covered.add(id);
  return g.sources.every(s=>covered.has(s.id));
}
function testOne(){
  const g=engine.analyze('Telefonare ogni giorno per ottenere una notizia.');
  assert.equal(g.metrics.input,1);
  assert.equal(g.metrics.analyzed,1);
  assert(allCovered(g));
}
function testTen(){
  const rows=[
    'Mentalità e disciplina sono la base.',
    'Definisci obiettivi e numeri della settimana.',
    'La rubrica contiene amici parenti e conoscenti.',
    'Lavora la zona e il territorio.',
    'I centri di influenza includono barista e commercialista.',
    'Usa il telefono per chiamare i contatti.',
    'Preparazione e role play prima delle chiamate.',
    'Ascolto e domande aiutano a capire.',
    'La notizia porta a un appuntamento.',
    'L appuntamento può portare a un incarico.'
  ];
  const g=engine.analyze(rows.join('\n'));
  assert.equal(g.metrics.input,10);
  assert(g.metrics.clusters<=12);
  assert(allCovered(g));
  assert(g.essentialEdges.some(e=>e.type==='LEADS_TO'||e.type==='RELATED'));
}
function test41(){
  const rows=[];
  const bank=[
    'Mentalità disciplina costanza nel lavoro.',
    'Obiettivi e KPI della settimana.',
    'Rubrica amici parenti conoscenti.',
    'Zona territorio proprietari.',
    'Centro di influenza barista commercialista.',
    'Telefono chiamate contatti.',
    'Preparazione role play.',
    'Ascolto domande comprensione.',
    'Notizia segnalazione immobiliare.',
    'Appuntamento con proprietario.',
    'Incarico immobiliare.'
  ];
  for(let i=0;i<41;i++)rows.push(bank[i%bank.length]+' Elemento '+(i+1));
  const g=engine.analyze(rows.join('\n'));
  assert.equal(g.metrics.input,41);
  assert.equal(g.metrics.analyzed,41);
  assert(g.metrics.clusters<41);
  assert(allCovered(g));
}
function test100(){
  const rows=[];
  for(let i=0;i<100;i++)rows.push((i%2?'Telefono e chiamate ai contatti ':'Rubrica relazioni e conoscenti ')+(i+1));
  const g=engine.analyze(rows.join('\n'));
  assert.equal(g.metrics.input,100);
  assert(g.metrics.clusters<100);
  assert(allCovered(g));
}
function testEconomy(){
  const txt=[
    'Una compravendita da 200.000 euro è in realtà due transazioni.',
    'Provvigione 3% lato venditore.',
    'Provvigione 3% lato acquirente.',
    '12.000 euro di fatturato complessivo.'
  ].join('\n');
  const g=engine.analyze(txt);
  const labels=g.essentialNodes.map(n=>n.label); console.log('ECON_LABELS',labels);
  assert(labels.some(x=>x.includes('200.000')&&x.includes('IMMOBILE')));
  assert(labels.some(x=>x.includes('6.000')&&x.includes('VENDITORE')));
  assert(labels.some(x=>x.includes('6.000')&&x.includes('ACQUIRENTE')));
  assert(labels.some(x=>x.includes('12.000')&&x.includes('FATTURATO')));
  assert(g.essentialEdges.filter(e=>e.type==='SUMS_TO').length>=2);
  assert(g.essentialEdges.some(e=>e.type==='SPLITS_INTO'));
}
function testTraceability(){
  const txt='Telefono e chiamate generano una notizia.\nLa notizia porta a un appuntamento.';
  const g=engine.analyze(txt);
  for(const n of g.essentialNodes)assert(Array.isArray(n.sourceIds)&&n.sourceIds.length>0);
  for(const e of g.essentialEdges)assert(Array.isArray(e.sourceIds)&&e.sourceIds.length>0);
}
testOne();
testTen();
test41();
test100();
testEconomy();
testTraceability();
console.log('CASCADE_ENGINE_TESTS_OK');
