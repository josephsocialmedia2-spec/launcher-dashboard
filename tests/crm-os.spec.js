const { test, expect } = require('@playwright/test');

const leads = [
  {lead_id:'lead-mario',user_id:'u1',nome:'Mario',cognome:'Rossi',telefono:'+393331112233',email:'mario@example.test',comune:'Villar Dora',via:'Via Roma',civico:'10',source:'FSBO',source_type:'FSBO',status:'DA_CONTATTARE',lead_score:82,last_contact:'2026-09-10T08:00:00Z',next_action:'Richiamare proprietario',next_action_date:'2026-09-13T08:30:00Z',notes:'Possibile vendita',immobile_id:'prop-1',deleted:false,created_at:'2026-09-13T07:00:00Z',updated_at:'2026-09-13T07:00:00Z'},
  {lead_id:'lead-lucia',user_id:'u1',nome:'Lucia',cognome:'Bianchi',telefono:'+393339998877',email:'lucia@example.test',comune:'Avigliana',via:'Via Torino',civico:'2',source:'WEBSITE',source_type:'WEBSITE',status:'QUALIFICATO',lead_score:70,last_contact:'2026-09-12T09:00:00Z',next_action:'Inviare immobili',next_action_date:'2026-09-13T12:00:00Z',notes:'Ricerca trilocale',immobile_id:'',deleted:false,created_at:'2026-09-12T07:00:00Z',updated_at:'2026-09-12T07:00:00Z'}
];
const tasks = [
  {task_id:'task-call',user_id:'u1',lead_id:'lead-mario',property_id:'prop-1',task_type:'CALL',reason:'Richiamare Mario Rossi',priority:92,due_date:'2026-09-13T08:30:00Z',status:'OPEN',created_at:'2026-09-13T06:00:00Z',updated_at:'2026-09-13T06:00:00Z'},
  {task_id:'task-follow',user_id:'u1',lead_id:'lead-lucia',property_id:'',task_type:'FOLLOW_UP',reason:'Follow-up ricerca',priority:70,due_date:'2026-09-13T12:00:00Z',status:'OPEN',created_at:'2026-09-13T06:00:00Z',updated_at:'2026-09-13T06:00:00Z'}
];
const interactions = [{interaction_id:'i1',user_id:'u1',lead_id:'lead-mario',property_id:'prop-1',interaction_type:'CALL',direction:'OUTBOUND',occurred_at:'2026-09-10T08:00:00Z',outcome:'PARLATO',note:'Ha chiesto un ricontatto',created_at:'2026-09-10T08:00:00Z'}];
const roles = [
  {role_id:'r1',lead_id:'lead-mario',role_type:'PROPRIETARIO',role_status:'ACTIVE',pipeline_stage:'DA_CONTATTARE',is_primary:true,updated_at:'2026-09-13T07:00:00Z'},
  {role_id:'r2',lead_id:'lead-lucia',role_type:'ACQUIRENTE',role_status:'ACTIVE',pipeline_stage:'RICERCA_ATTIVA',is_primary:true,updated_at:'2026-09-13T07:00:00Z'}
];
const properties = [{property_id:'prop-1',user_id:'u1',tipologia:'Casa indipendente',comune:'Villar Dora',via:'Via Roma',civico:'10',zona:'Centro',status:'PROSPECT',deleted:false,updated_at:'2026-09-13T07:00:00Z'}];

async function mockCloud(page, duplicate=false) {
  await page.route(/supabase-config\.js/, route => route.fulfill({contentType:'application/javascript', body:`window.F1_SUPABASE={url:'https://example.test',anonKey:'pk-test'};`}));
  await page.route(/supabase-sync\.js/, route => route.fulfill({contentType:'application/javascript', body:`window.F1Sync={configured:()=>true,ready:()=>true,ensureSession:async()=>true,authToken:async()=> 'token',signOut:async()=>true};`}));
  await page.route(/f1-staff-data\.js/, route => route.fulfill({contentType:'application/javascript', body:`
    window.__qa={writes:[]};
    window.F1StaffData={
      me:async()=>({user_id:'u1',first_name:'Marco',last_name:'Funzionario',role:'FUNZIONARIO',status:'ACTIVE'}),
      rest:async(path,opt={})=>{
        if(opt.method){window.__qa.writes.push({path,opt}); return [];}
        if(path.startsWith('leads?')) return ${JSON.stringify(leads)};
        if(path.startsWith('tasks?')) return ${JSON.stringify(tasks)};
        if(path.startsWith('interactions?')) return ${JSON.stringify(interactions)};
        if(path.startsWith('f1_contact_roles?')) return ${JSON.stringify(roles)};
        if(path.startsWith('properties?')) return ${JSON.stringify(properties)};
        return [];
      },
      rpc:async(name,payload)=> name==='f1_find_duplicate_candidates' && ${duplicate?'true':'false'} ? [{lead_id:'lead-mario',display_name:'Mario Rossi',comune:'Villar Dora',status:'DA_CONTATTARE',matched_by:['TELEFONO']}] : [],
      createOrLinkLead:async()=>({action:'DUPLICATE_LINKED',lead_id:'lead-mario'})
    };
  `}));
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-13T10:00:00+02:00') });
});

test('desktop: OGGI, agenda, ricerca, scheda 360 e pipeline sono operative', async ({ page }) => {
  await mockCloud(page);
  await page.goto('/f1-crm-os.html');
  await expect(page.locator('#mainTitle')).toHaveText('OGGI');
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('.rightbar')).toBeVisible();
  await expect(page.locator('#agendaList')).toContainText('Mario Rossi');
  await expect(page.locator('#mainBody')).toContainText('TELEFONATE');

  await page.locator('#globalSearch').fill('Mario');
  await expect(page.locator('#searchResults')).toContainText('Mario Rossi');
  await page.locator('.search-hit').filter({hasText:'Mario Rossi'}).click();
  await expect(page.locator('#mainBody')).toContainText('SCHEDA CONTATTO 360°');
  await expect(page.locator('#mainBody')).toContainText('PROPRIETARIO');
  await expect(page.locator('#mainBody')).toContainText('PARLATO');
  await expect(page.locator('#mainBody')).toContainText('Casa indipendente');

  await page.getByRole('button',{name:'PIPELINE PROPRIETARI'}).click();
  await expect(page.locator('#mainTitle')).toContainText('PIPELINE PROPRIETARIO');
  await expect(page.locator('.kanban')).toContainText('Mario Rossi');
});

test('desktop: quick action blocca duplicato e offre le tre decisioni', async ({ page }) => {
  await mockCloud(page,true);
  await page.goto('/f1-crm-os.html');
  await page.locator('#quickOpen').click();
  await page.locator('#qNome').fill('Mario');
  await page.locator('#qCognome').fill('Rossi');
  await page.locator('#qTelefono').fill('+393331112233');
  await page.locator('#qComune').fill('Villar Dora');
  await page.locator('#quickForm button[type=submit]').click();
  await expect(page.locator('#duplicateBox')).toContainText('POSSIBILE DUPLICATO');
  await expect(page.locator('#duplicateBox')).toContainText('APRI ESISTENTE');
  await expect(page.locator('#duplicateBox')).toContainText("UNISCI NELL'ESISTENTE");
  await expect(page.locator('#duplicateBox')).toContainText('CREA COMUNQUE');
  const writes = await page.evaluate(()=>window.__qa.writes);
  expect(writes.filter(x=>x.path==='leads').length).toBe(0);
});

test('mobile: navigazione primaria e quick action restano usabili senza sidebar desktop', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'mobile-only assertion');
  await mockCloud(page);
  await page.goto('/f1-crm-os.html');
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.rightbar')).toBeHidden();
  await expect(page.locator('.mobile-nav')).toBeVisible();
  await expect(page.locator('.mobile-nav')).toContainText('OGGI');
  await expect(page.locator('.mobile-nav')).toContainText('CHIAMA');
  await expect(page.locator('.mobile-nav')).toContainText('MAPPA');
  await expect(page.locator('#quickOpen')).toBeVisible();
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBe(false);
});
