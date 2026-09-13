const { test, expect } = require('@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path'),XLSX=require('xlsx');
const REST='https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/';
function lead(id,nome,cognome,telefono,email=''){return{lead_id:id,pillar:1,source_type:'OTHER',source:'QA',source_url:'',created_at:'2026-01-01T09:00:00Z',first_seen:'2026-01-01T09:00:00Z',last_seen:'2026-01-01T09:00:00Z',nome,cognome,azienda:'',telefono,email,comune:'Avigliana',via:'',civico:'',zona:'',immobile_id:'',competitor_agency:'',lead_reason:'QA',lead_score:50,confidence:'MEDIUM',status:'DA_VERIFICARE',last_contact:null,next_action:'',next_action_date:null,assigned_to:'',notes:'',privacy_basis:'QA',do_not_contact:false,rpo_status:'DA_VERIFICARE',created_by:'qa',updated_at:'2026-01-01T09:00:00Z',deleted:false}}
function book(file,rows,type){const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Contatti');XLSX.writeFile(wb,file,{bookType:type})}
async function mapValue(page,header){const rows=page.locator('#importMapping tr');for(let i=0;i<await rows.count();i++){if((await rows.nth(i).locator('td').first().innerText()).trim()===header)return rows.nth(i).locator('select').inputValue()}return''}
function previewRow(page,text){return page.locator('#importPreviewBody tr').filter({hasText:text}).first()}
async function analyzeReady(page){await expect(page.locator('#importStatus')).toContainText('Analisi completata')}

test('XLSX XLS CSV -> preview -> dedupe -> unified CRM',async({page})=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'f1-crm-import-')),xlsx=path.join(dir,'test1.xlsx'),csv=path.join(dir,'test2.csv'),xls=path.join(dir,'test3.xls');
  book(xlsx,[['Nome','Cognome','Telefono','Email'],['Luca','Verdi','3330000001','luca@example.test'],['Anna','Blu','+39 333 000 0002','anna@example.test']],'xlsx');
  fs.writeFileSync(csv,'Nominativo;Cellulare;Paese;Annotazioni\nGiulia Neri;3330000003;Avigliana;Amica di famiglia\n','utf8');
  book(xls,[['Annotazioni','Paese','Numero','Nominativo','Email'],['Aggiornare','Avigliana','333 123 4567','Mario Rossi','mario.nuovo@example.test'],['Nuovo','Condove','3330000004','Paolo Gialli','paolo@example.test']],'biff8');
  const db={leads:[lead('mario','Mario','Rossi','+39 3331234567','mario.vecchio@example.test')],tasks:[],interactions:[],crm_import_log:[]};
  await page.addInitScript(()=>sessionStorage.setItem('f1SupabaseSession',JSON.stringify({access_token:'qa',refresh_token:'qa',expires_at:Date.now()+3600000,user:{id:'00000000-0000-4000-8000-000000000001'}})));
  await page.route('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(require.resolve('xlsx/dist/xlsx.full.min.js'),'utf8')}));
  await page.route(REST+'**',async r=>{const req=r.request(),u=new URL(req.url()),table=u.pathname.split('/').pop(),method=req.method();if(!(table in db))return r.fulfill({status:200,contentType:'application/json',body:'[]'});if(method==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db[table])});if(method==='POST'){let rows=JSON.parse(req.postData()||'[]');const id={leads:'lead_id',tasks:'task_id',interactions:'interaction_id',crm_import_log:'import_id'}[table];rows=rows.map(x=>({...x,[id]:x[id]||`${table}-${Date.now()}-${Math.random()}`,user_id:x.user_id||'00000000-0000-4000-8000-000000000001',imported_at:x.imported_at||(table==='crm_import_log'?new Date().toISOString():x.imported_at)}));for(const x of rows){const i=db[table].findIndex(y=>String(y[id])===String(x[id]));i>=0?db[table][i]={...db[table][i],...x}:db[table].push(x)}return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)})}if(method==='PATCH'){const patch=JSON.parse(req.postData()||'{}'),fields=['lead_id','task_id','interaction_id','import_id'],f=fields.find(x=>u.searchParams.has(x)),raw=f?u.searchParams.get(f):'',val=raw?.startsWith('eq.')?decodeURIComponent(raw.slice(3)):'';const changed=[];for(let i=0;i<db[table].length;i++)if(!f||String(db[table][i][f])===String(val)){db[table][i]={...db[table][i],...patch};changed.push(db[table][i])}return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(changed)})}return r.fulfill({status:200,contentType:'application/json',body:'[]'})});

  await page.goto('/crm.html');await expect(page.locator('#excelImportBtn')).toBeVisible();
  // Regressione esatta del bug segnalato: simula una vecchia F1AcquisitionData in cache senza requireCloud().
  await page.evaluate(()=>{if(window.F1AcquisitionData)delete window.F1AcquisitionData.requireCloud});
  await expect.poll(()=>page.evaluate(()=>typeof window.F1AcquisitionData?.requireCloud)).toBe('undefined');
  await page.click('#excelImportBtn');

  // TEST 1 .xlsx standard + second import.
  await page.setInputFiles('#importFile',xlsx);await page.selectOption('#importCategory','CENTRO_INFLUENZA');await page.check('#relationshipConfirm');await page.click('#analyzeImportBtn');await analyzeReady(page);
  await expect(page.locator('#impFound')).toHaveText('2');expect(await mapValue(page,'Telefono')).toBe('telefono');expect(await mapValue(page,'Email')).toBe('email');
  const start=db.leads.length;await page.click('#confirmImportBtn');await expect.poll(()=>db.leads.length).toBe(start+2);expect(db.leads.filter(x=>x.source_type==='COI').every(x=>x.rpo_status==='NON_APPLICABILE')).toBeTruthy();
  await page.setInputFiles('#importFile',xlsx);await page.click('#analyzeImportBtn');await analyzeReady(page);await expect(page.locator('#impDup')).toHaveText('2');const after=db.leads.length;await page.click('#confirmImportBtn');await expect.poll(()=>db.crm_import_log.length).toBe(2);expect(db.leads.length).toBe(after);

  // TEST 2 .csv synonyms.
  await page.setInputFiles('#importFile',csv);await page.selectOption('#importCategory','CLIENTI_PASSATI');await page.check('#relationshipConfirm');await page.click('#analyzeImportBtn');await analyzeReady(page);
  await expect(page.locator('#impFound')).toHaveText('1');expect(await mapValue(page,'Nominativo')).toBe('full_name');expect(await mapValue(page,'Cellulare')).toBe('telefono');expect(await mapValue(page,'Paese')).toBe('comune');expect(await mapValue(page,'Annotazioni')).toBe('note');
  await page.click('#confirmImportBtn');await expect.poll(()=>db.leads.some(x=>x.nome==='Giulia'&&x.cognome==='Neri'&&x.source_type==='PAST_CLIENT')).toBeTruthy();

  // TEST 3 .xls disordered + duplicate + compare/update.
  await page.setInputFiles('#importFile',xls);await page.selectOption('#importCategory','LEAD');await page.click('#analyzeImportBtn');await analyzeReady(page);await expect(page.locator('#impFound')).toHaveText('2');expect(await mapValue(page,'Numero')).toBe('telefono');await expect(page.locator('#impDup')).toHaveText('1');
  const mario=previewRow(page,'Mario Rossi');await expect(mario).toContainText('GIÀ PRESENTE');await mario.locator('.compare-btn').click();await expect(page.locator('#compareBody')).toContainText('mario.vecchio@example.test');await page.locator('#compareDlg [data-close="compareDlg"]').click();await mario.locator('.dup-action').selectOption('AGGIORNA');
  const before3=db.leads.length;await page.click('#confirmImportBtn');await expect.poll(()=>db.leads.find(x=>x.lead_id==='mario')?.email).toBe('mario.nuovo@example.test');await expect.poll(()=>db.leads.length).toBe(before3+1);expect(db.leads.filter(x=>x.nome==='Mario'&&x.cognome==='Rossi').length).toBe(1);expect(db.interactions.some(x=>x.lead_id==='mario'&&x.outcome==='IMPORT_EXCEL_AGGIORNATO')).toBeTruthy();
  await page.setInputFiles('#importFile',xls);await page.click('#analyzeImportBtn');await analyzeReady(page);await expect(page.locator('#impDup')).toHaveText('2');const finalCount=db.leads.length;await page.click('#confirmImportBtn');await expect.poll(()=>db.crm_import_log.length).toBe(5);expect(db.leads.length).toBe(finalCount);
});
