const {test,expect}=require('@playwright/test');

const leads=[
 {lead_id:'l1',nome:'Lucia',cognome:'Bianchi',azienda:'',telefono:'+391111',email:'lucia@test.invalid',comune:'Avigliana',status:'QUALIFICATO',updated_at:'2026-09-13T10:00:00Z'},
 {lead_id:'l2',nome:'Mario',cognome:'Rossi',azienda:'',telefono:'+392222',email:'',comune:'Villar Dora',status:'DA_CONTATTARE',updated_at:'2026-09-13T09:00:00Z'}
];
const requests=[{request_id:'req1',user_id:'u1',lead_id:'l1',comune:'Avigliana',zone:['Centro'],tipologia:'appartamento',budget_min:150000,budget_max:220000,mq_min:80,camere:2,bagni:1,piano:'',ascensore:null,box:true,posto_auto:null,giardino:null,terrazzo:true,stato_immobile:'',mutuo:'SI',urgenza:'ALTA',note:'Ricerca attiva',request_status:'ACTIVE',updated_at:'2026-09-13T10:00:00Z'}];
const properties=[{property_id:'p1',comune:'Avigliana',via:'Via Roma 10',civico:'',zona:'Centro',tipologia:'appartamento',status:'OSSERVATO'}];
const explanation={score:85,coverage_pct:90,criteria:[{key:'comune',label:'Comune',weight:25,status:'PASS',points:25,detail:'Comune corretto: Avigliana'},{key:'budget',label:'Budget',weight:20,status:'PASS',points:20,detail:'Prezzo compatibile'},{key:'terrazzo',label:'Terrazzo',weight:2.5,status:'UNKNOWN',points:0,detail:'Dato terrazzo non disponibile'}]};
const priorities=[{lead_id:'l1',score:82,explanation:{components:[{key:'intenzione',label:'Intenzione',points:20,max:20,reason:'Ruolo attivo e pipeline avanzata'},{key:'recenza',label:'Recenza contatto',points:15,max:15,reason:'Ultimo contatto 1 giorno fa'}]}},{lead_id:'l2',score:55,explanation:{components:[{key:'intenzione',label:'Intenzione',points:10,max:20,reason:'Ruolo commerciale attivo'}]}}];

async function mockCloud(page,{geo=[]}={}){
 await page.route(/supabase-config\.js/,r=>r.fulfill({contentType:'application/javascript',body:`window.F1_SUPABASE={url:'https://example.test',anonKey:'pk-test'};`}));
 await page.route(/supabase-sync\.js/,r=>r.fulfill({contentType:'application/javascript',body:`window.F1Sync={configured:()=>true,ensureSession:async()=>true,ready:()=>true,authToken:async()=> 'token'};`}));
 await page.route(/f1-staff-data\.js/,r=>r.fulfill({contentType:'application/javascript',body:`
 window.__p2writes=[];
 window.F1StaffData={
  me:async()=>({user_id:'u1',first_name:'QA',last_name:'P2',role:'TITOLARE'}),
  rest:async(path,opt={})=>{if(opt.method){window.__p2writes.push({path,opt});return opt.method==='POST'?[{request_id:'req-new'}]:[{}]}
   if(path.startsWith('leads?'))return ${JSON.stringify(leads)};
   if(path.startsWith('f1_crm_requests?'))return ${JSON.stringify(requests)};
   if(path.startsWith('properties?'))return ${JSON.stringify(properties)};
   if(path.startsWith('f1_match_results?'))return [{request_id:'req1',property_id:'p1',score:85,coverage_pct:90}];
   return[]},
  rpc:async(name,payload)=>{if(name==='f1_contact_priority_batch')return ${JSON.stringify(priorities)};
   if(name==='f1_top_properties_for_request')return [{property_id:'p1',score:85,coverage_pct:90,explanation:${JSON.stringify(explanation)},comune:'Avigliana',via:'Via Roma 10',tipologia:'appartamento',asking_price:200000,surface_mq:90}];
   if(name==='f1_top_requests_for_property')return [{request_id:'req1',lead_id:'l1',client_name:'Lucia Bianchi',score:85,coverage_pct:90,explanation:${JSON.stringify(explanation)},comune:'Avigliana',tipologia:'appartamento',budget_min:150000,budget_max:220000}];
   if(name==='f1_map_points')return ${JSON.stringify(geo)};return[]}
 };
 `}));
}

test('P2 priority, requests and explainable match use backend data',async({page})=>{
 await mockCloud(page);await page.goto('/f1-crm-intelligence.html');
 await expect(page.locator('#status')).toContainText('P2 connesso a Supabase');
 await expect(page.locator('#body')).toContainText('Lucia Bianchi');
 await expect(page.locator('#body')).toContainText('82/100');
 await page.getByRole('button',{name:'RICHIESTE'}).click();
 await expect(page.locator('#body')).toContainText('Ricerca attiva');
 await page.getByRole('button',{name:'VEDI MATCH'}).click();
 await expect(page.locator('#matchRequest')).toHaveValue('req1');
 await expect(page.locator('#matchResults')).toContainText('85.0%');
 await expect(page.locator('#matchResults')).toContainText('Comune corretto: Avigliana');
 await expect(page.locator('#matchResults')).toContainText('copertura 90%');
});

test('P2 new request persists through canonical Supabase table with tri-state criteria',async({page})=>{
 await mockCloud(page);await page.goto('/f1-crm-intelligence.html?view=requests');
 await page.getByRole('button',{name:'+ NUOVA RICHIESTA'}).click();
 await page.locator('#leadId').selectOption('l2');
 await page.locator('#comune').fill('Villar Dora');await page.locator('#tipologia').fill('villa');
 await page.locator('#budgetMax').fill('350000');await page.locator('#box').selectOption('true');await page.locator('#giardino').selectOption('');
 await page.getByRole('button',{name:'SALVA RICHIESTA'}).click();
 await expect.poll(async()=>await page.evaluate(()=>window.__p2writes.length)).toBeGreaterThan(0);
 const write=await page.evaluate(()=>window.__p2writes.find(x=>x.path==='f1_crm_requests'));
 expect(write).toBeTruthy();const body=JSON.parse(write.opt.body)[0];expect(body.lead_id).toBe('l2');expect(body.box).toBe(true);expect(body.giardino).toBe(null);expect(body.metadata.origin).toBe('F1_CRM_OS_P2');
});

test('P2 map refuses fake markers when backend has no real coordinates',async({page})=>{
 await mockCloud(page,{geo:[]});
 await page.route('https://unpkg.com/**',r=>r.fulfill({status:200,contentType:r.request().url().endsWith('.css')?'text/css':'application/javascript',body:''}));
 await page.goto('/f1-crm-map.html');
 await expect(page.locator('#status')).toContainText('0 PUNTI GEO REALI');
 await expect(page.locator('#emptyOverlay')).toBeVisible();
 await expect(page.locator('#emptyOverlay')).toContainText('Nessun punto viene inventato');
 await expect(page.locator('#filters')).toContainText('IMMOBILI');await expect(page.locator('#filters')).toContainText('RICHIESTE');await expect(page.locator('#filters')).toContainText('OPPORTUNITÀ');
});
