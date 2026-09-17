const {test,expect}=require('@playwright/test');
const fs=require('fs');

function territoryState(){return{progress:{progress_id:'00000000-0000-4000-8000-000000000101',session_id:'00000000-0000-4000-8000-000000000102',comune:'Avigliana',zona:'Zona A',via:'Via Felice Goffi',civic_start:'28',civic_end:'30',last_civic:'',next_civic:'28',civic_sequence:['28','30'],status:'IN_CORSO'},summary:{civics:0,condominiums:0,activities:0,contacts:0,news:0,pending_crm:0},pending_news:[]}}

test('motore Notiziere emette un solo ordine civico senza usare uno schedule locale',async({page})=>{
  await page.setContent('<html><body></body></html>');
  await page.evaluate(s=>{window.F1StaffData={ready:()=>true,me:async()=>({user_id:'u1',role:'NOTIZIERE'}),rpc:async(name)=>name==='f1_territory_panel_state'?s:null,tasks:async()=>[]}},territoryState());
  await page.addScriptTag({path:'f1-notiziere-engine.js'});
  const i=await page.evaluate(async()=>{const s=await F1NotiziereEngine.load({force:true});return s.instruction});
  expect(i.kind).toBe('CIVIC');expect(i.title).toBe('VAI AL CIVICO 28');expect(i.href).toBe('territory-mobile.html#terr');
  const dashboard=fs.readFileSync('ricerca-territoriale.js','utf8');
  expect(dashboard).toContain('F1NotiziereEngine.load');
  expect(dashboard).not.toContain('function blockFor');
  expect(dashboard).not.toContain("at(9,0)");
  expect(dashboard).not.toContain("at(15,30)");
});

test('nessuna assegnazione: F1 non inventa Comune, Via o civico',async({page})=>{
  await page.setContent('<html><body></body></html>');
  await page.evaluate(()=>{window.F1StaffData={ready:()=>true,me:async()=>({user_id:'u1'}),rpc:async()=>({progress:null,summary:{},pending_news:[]}),tasks:async()=>[]}});
  await page.addScriptTag({path:'f1-notiziere-engine.js'});
  const i=await page.evaluate(async()=>{const s=await F1NotiziereEngine.load({force:true});return s.instruction});
  expect(i.kind).toBe('NO_ASSIGNMENT');expect(i.title).toBe('NESSUNA ATTIVITÀ ASSEGNATA');expect(i.detail).toContain('Non inventare');
});

test('interfaccia Notiziere nasconde N0–N6 e il CRM tecnico dal primo livello',async()=>{
  const area=fs.readFileSync('funzionario-notiziere.html','utf8');
  const civic=fs.readFileSync('notiziere-civico.html','utf8');
  expect(area).not.toMatch(/<option>N[0-6]<\/option>/);
  expect(area).not.toContain('name="next_action"');
  expect(area).toContain('HO UNA NOTIZIA');
  expect(civic).toContain('Non devi scegliere N0–N6');
  expect(civic).toContain('DA CLASSIFICARE');
  expect(civic).toContain('CIVICO COMPLETATO');
});

test('F1 Territory live integra CRM, notizie, lettere, FSBO e procedura 30 volantini',async()=>{
  const ui=fs.readFileSync('territory-mobile.html','utf8');
  expect(ui).toContain('I GRANDI AGENTI OTTENGONO APPUNTAMENTI. NON CONVERSAZIONI!');
  expect(ui).toContain("HAI PRESO L'APPUNTAMENTO?");
  expect(ui).toContain('CRM · TUTTO IL LAVORO SVOLTO');
  expect(ui).toContain('LETTERE DA IMBUCARE');
  expect(ui).toContain('FSBO · FOR SALE BY OWNER');
  expect(ui).toContain('HAI STAMPATO 30 VOLANTINI?');
  expect(ui).toContain('f1_territory_mobile_crm_v2');
  expect(ui).toContain('f1_territory_letter_create_v2');
  expect(ui).toContain('f1_territory_news_update_v2');
  expect(ui).not.toContain('HO TROVATO UN’ATTIVITÀ');
  expect(ui).not.toContain('localStorage.setItem');
});

async function mockCivicApp(page){
  let state=territoryState();
  await page.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.F1_SUPABASE={};'}));
  await page.route('**/supabase-sync.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.F1Sync={configured:()=>true,ready:()=>true,ensureSession:async()=>true};'}));
  await page.route('**/f1-staff-data.js*',r=>r.fulfill({contentType:'application/javascript',body:`window.__calls=[];window.F1StaffData={ready:()=>true,me:async()=>({user_id:'u1',first_name:'Neo',last_name:'Assunto',role:'NOTIZIERE'}),tasks:async()=>[],createOrLinkLead:async p=>{window.__calls.push(['lead',p]);return{action:'CREATED',lead_id:'l1'}},rpc:async(n,p)=>{window.__calls.push([n,p]);if(n==='f1_territory_panel_state')return ${JSON.stringify(state)};if(n==='f1_territory_guided_add_observation')return{observation_id:'o1',...p};if(n==='f1_territory_guided_register_contact')return{ok:true};if(n==='f1_territory_guided_pause')return{ok:true,status:'PARZIALE',current_civic:'28'};if(n==='f1_territory_guided_complete_civic')return{ok:true,completed_civic:'28',next_civic:'30',status:'IN_CORSO',sequence_configured:true};return null}};`}));
  await page.goto('/notiziere-civico.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await expect(page.locator('#civic')).toHaveText('28');
}

test('civico guidato: notizia naturale salva DA_CLASSIFICARE senza chiedere N-level',async({page})=>{
  await mockCivicApp(page);
  await page.locator('#newsBtn').click();
  await page.selectOption('#newsForm [name="event_type"]','INFORMAZIONE_INDIRETTA');
  await page.fill('#newsForm [name="source"]','Commerciante della via');
  await page.fill('#newsForm [name="detail"]','Mi riferisce che una persona della zona sta pensando di trasferirsi.');
  await page.locator('#newsForm button[type="submit"]').click();
  await expect(page.locator('#status')).toContainText('DA CLASSIFICARE');
  const call=await page.evaluate(()=>window.__calls.find(x=>x[0]==='f1_territory_guided_add_observation'&&x[1].p_status==='DA_INSERIRE_CRM'));
  expect(call[1].p_news_type).toBe('DA_CLASSIFICARE');
  expect(call[1].p_observation_type).toBe('NOTIZIA_IMMOBILIARE');
});

test('civico guidato: persona produce stato e prossima azione senza campi tecnici',async({page})=>{
  await mockCivicApp(page);
  await page.locator('#personBtn').click();
  await page.fill('#personForm [name="nome"]','Mario');
  await page.selectOption('#personForm [name="outcome"]','CALLBACK');
  await expect(page.locator('#callbackWrap')).toBeVisible();
  await page.fill('#personForm [name="callback_date"]','2026-09-20');
  await page.locator('#personForm button[type="submit"]').click();
  await expect(page.locator('#status')).toContainText('RICHIAMA IL 2026-09-20');
  const lead=await page.evaluate(()=>window.__calls.find(x=>x[0]==='lead'));
  expect(lead[1].status).toBe('RICHIAMO');expect(lead[1].next_action).toBe('RICHIAMA IL 2026-09-20');
});

test('CIVICO COMPLETATO richiede esito minimo e mostra il prossimo civico configurato',async({page})=>{
  await mockCivicApp(page);
  await page.locator('#completeBtn').click();
  await expect(page.locator('#completeDlg')).toBeVisible();
  await page.selectOption('#completeForm [name="outcome"]','NESSUNA_NOVITA');
  await page.locator('#completeForm button[type="submit"]').click();
  await expect(page.locator('#status')).toContainText('ORA PASSA AL CIVICO 30');
  await expect(page.locator('#navNext')).toBeEnabled();
  await expect(page.locator('#navNext')).toContainText('CIVICO 30');
  const complete=await page.evaluate(()=>window.__calls.filter(x=>x[0]==='f1_territory_guided_complete_civic'));
  expect(complete).toHaveLength(1);expect(complete[0][1].p_expected_civic).toBe('28');
});

test('smartphone: azioni principali restano nel viewport senza overflow orizzontale',async({page,isMobile})=>{
  await mockCivicApp(page);
  const dims=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
  expect(dims.sw).toBeLessThanOrEqual(dims.w+1);
  if(isMobile){await expect(page.locator('#completeBtn')).toBeVisible();await expect(page.locator('#pauseBtn')).toBeVisible()}
});
