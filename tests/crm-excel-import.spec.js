const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');

const SUPABASE='https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/';
function baseLead(id,nome,cognome,telefono,email=''){
  return {lead_id:id,pillar:1,source_type:'OTHER',source:'CRM_TEST',source_url:'',created_at:'2026-01-01T09:00:00Z',first_seen:'2026-01-01T09:00:00Z',last_seen:'2026-01-01T09:00:00Z',nome,cognome,azienda:'',telefono,email,comune:'Avigliana',via:'',civico:'',zona:'',immobile_id:'',competitor_agency:'',lead_reason:'TEST',lead_score:50,confidence:'MEDIUM',status:'DA_VERIFICARE',last_contact:null,next_action:'',next_action_date:null,assigned_to:'',notes:'',privacy_basis:'TEST',do_not_contact:false,rpo_status:'DA_VERIFICARE',created_by:'qa',updated_at:'2026-01-01T09:00:00Z',deleted:false};
}
function writeBook(file,rows,bookType){
  const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Contatti');
  XLSX.writeFile(wb,file,{bookType});
}
function rowByText(page,text){return page.locator('#importPreviewBody tr').filter({hasText:text}).first()}
function mapRow(page,text){return page.locator('#importMapping tr').filter({hasText:text}).first()}

for(const viewport of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]){
  test(`CRM Excel importer end-to-end ${viewport.name}`, async ({page})=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'f1-import-'));
    const f1=path.join(tmp,'test1.xlsx'),f2=path.join(tmp,'test2.csv'),f3=path.join(tmp,'test3.xls');
    writeBook(f1,[['Nome','Cognome','Telefono','Email'],['Luca','Verdi','3330000001','luca@example.test'],['Anna','Blu','+39 333 000 0002','anna@example.test']],'xlsx');
    fs.writeFileSync(f2,'Nominativo;Cellulare;Paese;Annotazioni\nGiulia Neri;3330000003;Avigliana;Amica di famiglia\n','utf8');
    writeBook(f3,[['Annotazioni','Paese','Numero','Nominativo','Email'],['Aggiornare email','Avigliana','333 123 4567','Mario Rossi','mario.nuovo@example.test'],['Nuovo prospect','Condove','3330000004','Paolo Gialli','paolo@example.test']],'biff8');

    const db={leads:[baseLead('existing-mario','Mario','Rossi','+39 3331234567','mario.vecchio@example.test')],tasks:[],interactions:[],crm_import_log:[]};
    await page.addInitScript(()=>sessionStorage.setItem('f1SupabaseSession',JSON.stringify({access_token:'qa-token',refresh_token:'qa-refresh',expires_at:Date.now()+3600000,user:{id:'00000000-0000-4000-8000-000000000001'}})));
    await page.route('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(require.resolve('xlsx/dist/xlsx.full.min.js'),'utf8')}));
    await page.route(SUPABASE+'**',async route=>{
      const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').pop(),method=req.method();
      if(!(table in db))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
      if(method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db[table])});
      if(method==='POST'){
        let rows=JSON.parse(req.postData()||'[]');
        const idField={leads:'lead_id',tasks:'task_id',interactions:'interaction_id',crm_import_log:'import_id'}[table];
        rows=rows.map(r=>({...r,[idField]:r[idField]||`${table}-${Date.now()}-${Math.random()}`,user_id:r.user_id||'00000000-0000-4000-8000-000000000001',imported_at:r.imported_at||(table==='crm_import_log'?new Date().toISOString():r.imported_at)}));
        for(const row of rows){const i=db[table].findIndex(x=>String(x[idField])===String(row[idField]));if(i>=0)db[table][i]={...db[table][i],...row};else db[table].push(row)}
        return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});
      }
      if(method==='PATCH'){
        const patch=JSON.parse(req.postData()||'{}'),fields=['lead_id','task_id','interaction_id','import_id'];
        const field=fields.find(f=>u.searchParams.has(f)),raw=field?u.searchParams.get(field):'',value=raw?.startsWith('eq.')?decodeURIComponent(raw.slice(3)):'';
        const changed=[];for(let i=0;i<db[table].length;i++){if(!field||String(db[table][i][field])===String(value)){db[table][i]={...db[table][i],...patch};changed.push(db[table][i])}}
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(changed)});
      }
      return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    });

    await page.goto('/crm.html');
    await expect(page.locator('#excelImportBtn')).toBeVisible();
    await page.click('#excelImportBtn');

    // TEST 1: XLSX standard columns -> COI -> import and repeat without duplicates.
    await page.setInputFiles('#importFile',f1);
    await page.selectOption('#importCategory','CENTRO_INFLUENZA');
    await page.check('#relationshipConfirm');
    await page.click('#analyzeImportBtn');
    await expect(page.locator('#impFound')).toHaveText('2');
    await expect(page.locator('#impDup')).toHaveText('0');
    await expect(mapRow(page,'Telefono').locator('select')).toHaveValue('telefono');
    await expect(mapRow(page,'Email').locator('select')).toHaveValue('email');
    const before1=db.leads.length;
    await page.click('#confirmImportBtn');
    await expect.poll(()=>db.leads.length).toBe(before1+2);
    expect(db.leads.filter(x=>x.source_type==='COI').length).toBe(2);
    expect(db.leads.filter(x=>x.source_type==='COI').every(x=>x.rpo_status==='NON_APPLICABILE')).toBeTruthy();
    expect(db.crm_import_log.length).toBe(1);

    await page.setInputFiles('#importFile',f1);
    await page.click('#analyzeImportBtn');
    await expect(page.locator('#impDup')).toHaveText('2');
    const afterFirst=db.leads.length;
    await page.click('#confirmImportBtn');
    await expect.poll(()=>db.crm_import_log.length).toBe(2);
    expect(db.leads.length).toBe(afterFirst);
    expect(db.crm_import_log.at(-1).duplicates).toBe(2);

    // TEST 2: CSV synonyms -> automatic mapping Nominativo/Cellulare/Paese/Annotazioni.
    await page.setInputFiles('#importFile',f2);
    await page.selectOption('#importCategory','CLIENTI_PASSATI');
    await page.check('#relationshipConfirm');
    await page.click('#analyzeImportBtn');
    await expect(mapRow(page,'Nominativo').locator('select')).toHaveValue('full_name');
    await expect(mapRow(page,'Cellulare').locator('select')).toHaveValue('telefono');
    await expect(mapRow(page,'Paese').locator('select')).toHaveValue('comune');
    await expect(mapRow(page,'Annotazioni').locator('select')).toHaveValue('note');
    await page.click('#confirmImportBtn');
    await expect.poll(()=>db.leads.some(x=>x.nome==='Giulia'&&x.cognome==='Neri')).toBeTruthy();
    const giulia=db.leads.find(x=>x.nome==='Giulia'&&x.cognome==='Neri');
    expect(giulia.source_type).toBe('PAST_CLIENT');
    expect(giulia.comune).toBe('Avigliana');

    // TEST 3: XLS legacy, colonne disordinate e contatto già presente.
    await page.setInputFiles('#importFile',f3);
    await page.selectOption('#importCategory','LEAD');
    await page.click('#analyzeImportBtn');
    await expect(mapRow(page,'Numero').locator('select')).toHaveValue('telefono');
    await expect(page.locator('#impDup')).toHaveText('1');
    const mario=rowByText(page,'Mario Rossi');
    await expect(mario).toContainText('GIÀ PRESENTE');
    await mario.locator('.compare-btn').click();
    await expect(page.locator('#compareDlg')).toBeVisible();
    await expect(page.locator('#compareBody')).toContainText('mario.vecchio@example.test');
    await page.locator('#compareDlg [data-close="compareDlg"]').click();
    await mario.locator('.dup-action').selectOption('AGGIORNA');
    const before3=db.leads.length;
    await page.click('#confirmImportBtn');
    await expect.poll(()=>db.leads.find(x=>x.lead_id==='existing-mario')?.email).toBe('mario.nuovo@example.test');
    expect(db.leads.length).toBe(before3+1);
    expect(db.leads.filter(x=>x.nome==='Mario'&&x.cognome==='Rossi').length).toBe(1);
    expect(db.interactions.some(x=>x.lead_id==='existing-mario'&&x.outcome==='IMPORT_EXCEL_AGGIORNATO')).toBeTruthy();

    await page.setInputFiles('#importFile',f3);
    await page.click('#analyzeImportBtn');
    await expect(page.locator('#impDup')).toHaveText('2');
    const beforeRepeat=db.leads.length;
    await page.click('#confirmImportBtn');
    await expect.poll(()=>db.crm_import_log.length).toBe(5);
    expect(db.leads.length).toBe(beforeRepeat);
  });
}
