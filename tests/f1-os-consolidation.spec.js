const { test, expect } = require('@playwright/test');

async function installTerritoryMocks(page,{role='TITOLARE',auth=true}={}){
  await page.route('**/supabase-config.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:"window.F1_SUPABASE={url:'https://qa.supabase.test',anonKey:'qa'};"}));
  await page.route('**/supabase-sync.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`
    window.F1Sync={
      configured:()=>true,ready:()=>true,ensureSession:async()=>${auth?'true':'false'},
      clearSession:()=>{},authToken:async()=>'qa-token',session:()=>({access_token:'qa-token'}),
      currentUser:async()=>({ok:true,user:{id:'00000000-0000-4000-8000-000000000001'}})
    };`}));
  await page.route('**/f1-staff-data.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`
    window.__contacts=[];
    window.F1StaffData={
      ready:()=>true,
      me:async()=>({user_id:'00000000-0000-4000-8000-000000000001',first_name:'QA',last_name:'${role}',role:'${role}'}),
      rest:async(path,opt={})=>{
        const method=String(opt.method||'GET').toUpperCase();
        if(!String(path).startsWith('network_contacts'))return[];
        if(method==='GET')return window.__contacts.slice();
        if(method==='POST'){
          const rows=JSON.parse(opt.body||'[]');
          const saved=rows.map((row,i)=>({...row,contact_id:row.contact_id||('qa-contact-'+(window.__contacts.length+i+1))}));
          for(const row of saved){const idx=window.__contacts.findIndex(x=>x.contact_id===row.contact_id);if(idx>=0)window.__contacts[idx]={...window.__contacts[idx],...row};else window.__contacts.push(row)}
          return saved;
        }
        if(method==='PATCH'){
          const raw=(String(path).match(/contact_id=eq.([^&]+)/)||[])[1]||'';
          const id=decodeURIComponent(raw),patch=JSON.parse(opt.body||'{}'),idx=window.__contacts.findIndex(x=>String(x.contact_id)===String(id));
          if(idx<0)return[];window.__contacts[idx]={...window.__contacts[idx],...patch};return[window.__contacts[idx]];
        }
        return[];
      }
    };`}));
  await page.route('**/f1-notiziere-engine.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`
    window.F1NotiziereEngine={
      ready:()=>true,
      instructionFrom:s=>s.instruction,
      load:async()=>({
        instruction:{kind:'CIVIC',title:'Vai al civico 12',detail:'Controlla il civico e registra il fatto utile.',cta:'APRI MOBILE',href:'territory-mobile.html',nextTitle:'Registra esito'},
        territory:{
          progress:{status:'IN_CORSO',comune:"Sant'Ambrogio di Torino",zona:'Centro',via:'Via Roma',civic_start:'2',civic_end:'20',last_civic:'10',next_civic:'12',civic_sequence:['2','4','6','8','10','12','14','16','18','20']},
          summary:{civics:5,contacts:2,news:1,activities:3},
          pending_news:[]
        }
      })
    };`}));
  await page.route('**/f1-realtime.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`
    window.F1Realtime={start:async()=>{setTimeout(()=>window.dispatchEvent(new CustomEvent('f1:realtime-status',{detail:{status:'LIVE'}})),0);return true},status:()=> 'LIVE'};
  `}));
}

test('OGGI is the single command center and stays efficient on desktop/mobile', async ({ page }) => {
  await page.goto('/oggi.html');
  await expect(page.getByRole('heading',{name:'F1 ACQUISITION COMMAND CENTER'})).toBeVisible();
  await expect(page.getByText('Cosa devo fare adesso')).toBeVisible();
  await expect(page.getByText('Persone da ricontattare')).toBeVisible();
  await expect(page.getByText('I 5 PILASTRI')).toBeVisible();
  await expect(page.locator('.f1-master-nav a[href="oggi.html"]')).toHaveClass(/is-active/);
  await expect(page.locator('.f1-master-nav a[href="ricerca-territoriale.html"]')).toHaveCount(1);
  const order=await page.evaluate(()=>({
    tasks:document.querySelector('#tasks').getBoundingClientRect().top,
    pillars:document.querySelector('#pillars').getBoundingClientRect().top
  }));
  expect(order.tasks).toBeLessThan(order.pillars);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('territory owner flow saves person relationship story and next action', async ({ page }) => {
  await installTerritoryMocks(page,{role:'TITOLARE',auth:true});
  await page.goto('/ricerca-territoriale.html');
  await expect(page.getByRole('heading',{name:'Dal civico alla relazione.'})).toBeVisible();
  await expect(page.locator('#twActionTitle')).toHaveText('Vai al civico 12');
  await expect(page.locator('#twRealtime')).toContainText('REALTIME ATTIVO');
  await expect(page.locator('#twUser')).toContainText('QA TITOLARE');
  const ownerAccess=page.locator('.f1-master-nav a[href*="accessi-ufficio.html"]');\n  await expect(ownerAccess).toHaveCount(1);\n  await expect(ownerAccess).not.toHaveAttribute('aria-hidden','true');

  await page.fill('#twNome','Mario');
  await page.fill('#twCognome','Rossi');
  await page.fill('#twTelefono','3331234567');
  await page.selectOption('#twRelazione',{label:'conoscente'});
  await page.fill('#twFonte','Incontro in via');
  await page.selectOption('#twStage','Conversazione');
  await page.selectOption('#twAbs','SI');
  await page.fill('#twStory','Sta valutando di vendere nei prossimi mesi.');
  await page.selectOption('#twFollowup','SI');
  await page.selectOption('#twChannel',{label:'WHATSAPP'});
  await page.fill('#twNextAction','Richiamare per aggiornamento');

  await page.click('#twSavePerson');
  await expect(page.locator('#twToast')).toContainText('richiede una data');

  await page.fill('#twNextDate','2026-10-20');
  await page.click('#twSavePerson');
  await expect(page.locator('#twPeopleList')).toContainText('MARIO ROSSI');
  await expect(page.locator('#twPeopleList')).toContainText('Richiamare per aggiornamento');

  const saved=await page.evaluate(()=>window.__contacts[0]);
  expect(saved.comune).toBe("Sant'Ambrogio di Torino");
  expect(saved.tree_meta.what_told_me).toContain('vendere');
  expect(saved.tree_meta.abs).toBe('SI');
  expect(saved.tree_meta.followup_allowed).toBe('SI');
  expect(saved.tree_meta.authorized_channel).toBe('WHATSAPP');
  expect(saved.tree_meta.territory_context.via).toBe('Via Roma');
  expect(saved.data_prossimo_contatto).toBe('2026-10-20');

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('territory collaborator cannot see owner access entry', async ({ page }) => {
  await installTerritoryMocks(page,{role:'NOTIZIERE',auth:true});
  await page.goto('/ricerca-territoriale.html');
  await expect(page.getByRole('heading',{name:'Dal civico alla relazione.'})).toBeVisible();
  const access=page.locator('.f1-master-nav a[href*="accessi-ufficio.html"]');
  await expect(access).toHaveAttribute('aria-hidden','true');
  await expect(access).toBeHidden();
});

test('expired territory session returns to cloud login', async ({ page }) => {
  await installTerritoryMocks(page,{auth:false});
  await page.goto('/ricerca-territoriale.html');
  await page.waitForURL(/setup-cloud\.html\?return=ricerca-territoriale\.html/);
  expect(page.url()).toContain('setup-cloud.html?return=ricerca-territoriale.html');
});

test('territory guard no longer loads duplicated legacy dashboard modules', async ({ request }) => {
  const guard=await (await request.get('/f1-dashboard-auth-guard.js')).text();
  for(const legacy of ['f1-territory-admin-v4.js','f1-desktop-mobile-bridge.js','dashboard-primary-accordions.js','content-production-week.js','f1-tour-admin-dashboard.js']){
    expect(guard).not.toContain(legacy);
  }
  expect(guard).toContain('f1-territory-workspace.js');
  const html=await (await request.get('/ricerca-territoriale.html')).text();
  expect(html).toContain('CHE COSA MI HA RACCONTATO?');
  expect(html).toContain('COSA SUCCEDE DOPO?');
  expect(html).toContain('PERMESSO FOLLOW-UP');
  expect(html).toContain('CANALE AUTORIZZATO');
});
