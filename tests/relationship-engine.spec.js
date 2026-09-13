const { test, expect } = require('@playwright/test');

function lead(id,type,name,phone,rpo='NON_APPLICABILE',dnc=false){
  const [nome,...rest]=name.split(' ');
  return {lead_id:id,pillar:2,source_type:type,source:'CRM_TEST',source_url:'',created_at:'2025-01-10T09:00:00Z',first_seen:'2025-01-10T09:00:00Z',last_seen:'2025-01-10T09:00:00Z',nome,cognome:rest.join(' '),azienda:'',telefono:phone,email:'',comune:'Avigliana',via:'Via Roma',civico:id.replace(/\D/g,'')||'1',zona:'',immobile_id:'',competitor_agency:'',lead_reason:type,lead_score:60,confidence:'HIGH',status:dnc?'NON_CONTATTARE':'CONTATTATO',last_contact:null,next_action:'',next_action_date:null,assigned_to:'',notes:'',privacy_basis:'CRM',do_not_contact:dnc,rpo_status:rpo,created_by:'qa',updated_at:'2025-01-10T09:00:00Z',deleted:false};
}

for (const view of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]) {
  test(`clienti passati + COI end-to-end ${view.name}`, async ({ page }) => {
    await page.setViewportSize({width:view.width,height:view.height});
    const sourceLeads=[
      lead('pc-1','PAST_CLIENT','Mario Rossi','3331000001'),lead('pc-2','PAST_CLIENT','Anna Verdi','3331000002'),lead('pc-3','PAST_CLIENT','Luca Blu','3331000003'),
      lead('coi-1','COI','Giulia Neri','3331000004'),lead('coi-2','COI','Paolo Bianchi','3331000005'),lead('coi-3','COI','Sara Gialli','3331000006'),
      lead('pc-4','PAST_CLIENT','Marco Viola','3331000007'),lead('coi-4','COI','Elena Rosa','3331000008')
    ];
    const db={
      leads:[...sourceLeads,lead('dnc-1','PAST_CLIENT','No Contact','3331999999','NON_APPLICABILE',true)],
      interactions:[{interaction_id:'00000000-0000-4000-8000-000000000901',lead_id:'coi-4',property_id:'',task_id:null,interaction_type:'CALL',direction:'OUTBOUND',occurred_at:new Date().toISOString(),outcome:'PARLATO',note:'già lavorato oggi',next_action:'',next_action_date:null,metadata:{origin:'PAST_CLIENT_COI_DAILY'},created_at:new Date().toISOString()}],
      tasks:[{task_id:'00000000-0000-4000-8000-000000000801',lead_id:'pc-1',property_id:'',event_id:null,pillar:2,task_type:'CALL',reason:'Ricontatto scaduto',priority:90,due_date:'2026-09-10T09:00:00Z',assigned_to:'',status:'OPEN',created_at:'2026-09-01T09:00:00Z',completed_at:null,outcome:'',metadata:{origin:'QA'},updated_at:'2026-09-01T09:00:00Z'}],
      referrals:[]
    };
    await page.addInitScript(() => {
      sessionStorage.setItem('f1SupabaseSession', JSON.stringify({access_token:'qa-token',refresh_token:'qa-refresh',expires_at:Date.now()+3600000,user:{id:'00000000-0000-4000-8000-000000000001'}}));
    });
    await page.route('https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/**', async route => {
      const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').pop(),method=req.method();
      if(!db[table]) return route.fulfill({status:404,contentType:'application/json',body:'[]'});
      if(method==='GET') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db[table])});
      if(method==='POST'){
        const rows=JSON.parse(req.postData()||'[]'),idField=table==='leads'?'lead_id':table==='tasks'?'task_id':table==='interactions'?'interaction_id':'referral_id';
        for(const row of rows){const i=db[table].findIndex(x=>String(x[idField])===String(row[idField]));if(i>=0)db[table][i]={...db[table][i],...row};else db[table].push({...row})}
        return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});
      }
      if(method==='PATCH'){
        const patch=JSON.parse(req.postData()||'{}'),fields=['lead_id','task_id','interaction_id','referral_id'];
        const f=fields.find(k=>u.searchParams.has(k)),raw=f?u.searchParams.get(f):'',v=raw?.startsWith('eq.')?decodeURIComponent(raw.slice(3)):'';
        const changed=[];for(let i=0;i<db[table].length;i++){if(!f||String(db[table][i][f])===String(v)){db[table][i]={...db[table][i],...patch};changed.push(db[table][i])}}
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(changed)});
      }
      return route.fulfill({status:405,contentType:'application/json',body:'[]'});
    });

    await page.goto('/index.html');
    await expect(page.locator('a[href="clienti-passati-coi.html"]')).toHaveCount(1);
    await page.goto('/clienti-passati-coi.html');
    await expect(page.locator('.contact')).toHaveCount(7);
    await expect(page.locator('#todayTitle')).toContainText('CONTATTI DA FARE OGGI: 7');
    await expect(page.locator('#kDone')).toHaveText('1');
    await expect(page.locator('.contact').first()).toContainText('ti devo delle scuse');
    await expect(page.locator('.contact').first()).toContainText('comprare o vendere casa');
    await expect(page.locator('text=No Contact')).toHaveCount(0);
    await expect(page.locator('text=Elena Rosa')).toHaveCount(0);

    const beforeLeads=db.leads.length;
    await page.locator('.contact').first().locator('button[data-out]').click();
    await page.selectOption('#outcome','SEGNALAZIONE_RICEVUTA');
    await page.fill('#outcomeNote','Mario segnala Luigi Bianchi');
    await page.click('#saveOutcome');
    await expect(page.locator('#referralDlg')).toBeVisible();
    const sourceId='pc-1';
    expect(db.interactions.some(i=>i.lead_id===sourceId&&i.interaction_type==='CALL'&&i.outcome==='SEGNALAZIONE_RICEVUTA')).toBeTruthy();
    expect(db.tasks.some(t=>t.lead_id===sourceId&&t.status==='OPEN'&&t.metadata?.origin==='PAST_CLIENT_COI_DAILY')).toBeTruthy();

    await page.fill('#rNome','Luigi');await page.fill('#rCognome','Bianchi');await page.fill('#rTelefono','333 999 8888');await page.fill('#rEmail','luigi.qa@example.test');await page.fill('#rComune','Avigliana');await page.fill('#rVia','Via Torino 10');
    await page.selectOption('#rIntro','AUTORIZZATO_CONTATTO');
    await page.click('#convertReferral');
    await expect.poll(()=>db.leads.length).toBe(beforeLeads+1);
    const generated=db.leads.find(l=>l.telefono==='333 999 8888');
    expect(generated).toBeTruthy();
    expect(generated.source).toBe('SEGNALAZIONE — CLIENTE PASSATO / CENTRO DI INFLUENZA');
    expect(generated.notes).toContain('Segnalato da: Mario Rossi');
    expect(db.tasks.some(t=>t.lead_id===generated.lead_id&&t.status==='OPEN')).toBeTruthy();
    expect(db.referrals.some(r=>r.lead_id===sourceId&&r.outcome===`LEAD:${generated.lead_id}`)).toBeTruthy();

    await page.evaluate(id=>window.F1RelationshipReferrals.open(id),sourceId);
    await page.fill('#rNome','Luigi');await page.fill('#rCognome','Bianchi');await page.fill('#rTelefono','333 999 8888');await page.fill('#rComune','Avigliana');await page.fill('#rVia','Via Torino 10');
    await page.click('#convertReferral');
    await expect.poll(()=>db.referrals.length).toBe(2);
    expect(db.leads.length).toBe(beforeLeads+1);
    expect(db.referrals.filter(r=>r.outcome===`LEAD:${generated.lead_id}`).length).toBe(2);
  });
}
