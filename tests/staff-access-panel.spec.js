const { test, expect } = require('@playwright/test');

function jwt(){
  const b=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  return `${b({alg:'none'})}.${b({session_id:'qa-session',iat:1})}.sig`;
}

test('Titolare vede funzionari/notizieri e apre accessi con cinque click',async({page})=>{
  const token=jwt();
  await page.route('**/f1-dashboard-auth-guard.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`
    document.documentElement.classList.remove('f1-auth-pending');
    window.__accessCalls=[];
    window.F1Sync={authToken:async()=>${JSON.stringify(token)},ready:()=>true};
    window.F1StaffData={
      ready:()=>true,
      me:async()=>({role:'TITOLARE',first_name:'Titolare',last_name:'F1'}),
      rpc:async(name,payload)=>{
        window.__accessCalls.push({name,payload});
        if(name==='f1_record_dashboard_access')return {ok:true};
        if(name==='f1_staff_dashboard_roster')return [
          {user_id:'1',first_name:'Mario',last_name:'Rossi',role:'NOTIZIERE',status:'ACTIVE'},
          {user_id:'2',first_name:'Anna',last_name:'Bianchi',role:'FUNZIONARIO',status:'ACTIVE'}
        ];
        if(name==='f1_staff_access_log')return [
          {access_id:1,user_id:'1',first_name:'Mario',last_name:'Rossi',role:'NOTIZIERE',occurred_at:'2026-09-16T15:00:00Z',path:'/ricerca-territoriale.html',source:'DASHBOARD',device:'MOBILE'}
        ];
        return [];
      }
    };
    const s=document.createElement('script');s.src='f1-staff-access-panel.js?v=qa';document.body.appendChild(s);
  `}));
  await page.goto('/ricerca-territoriale.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await expect(page.getByText('FUNZIONARI / NOTIZIERI ABILITATI')).toBeVisible();
  await expect(page.getByText('Mario Rossi')).toBeVisible();
  await expect(page.getByText('Anna Bianchi')).toBeVisible();
  const dot=page.locator('#f1AccessSecretDot');
  await expect(dot).toBeVisible();
  for(let i=0;i<5;i++)await dot.click();
  await expect(page.getByText('ACCESSI REGISTRATI')).toBeVisible();
  await expect(page.locator('#f1AccessRows')).toContainText('Mario Rossi');
  await expect(page.locator('#f1AccessRows')).toContainText('MOBILE');
  const names=await page.evaluate(()=>window.__accessCalls.map(x=>x.name));
  expect(names).toContain('f1_record_dashboard_access');
  expect(names).toContain('f1_staff_access_log');
});

test('Un Notiziere registra accesso ma non vede pannello riservato',async({page})=>{
  const token=jwt();
  await page.route('**/f1-dashboard-auth-guard.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`
    document.documentElement.classList.remove('f1-auth-pending');
    window.__accessCalls=[];
    window.F1Sync={authToken:async()=>${JSON.stringify(token)},ready:()=>true};
    window.F1StaffData={ready:()=>true,me:async()=>({role:'NOTIZIERE'}),rpc:async(name,payload)=>{window.__accessCalls.push({name,payload});return name==='f1_record_dashboard_access'?{ok:true}:[]}};
    const s=document.createElement('script');s.src='f1-staff-access-panel.js?v=qa';document.body.appendChild(s);
  `}));
  await page.goto('/ricerca-territoriale.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(500);
  await expect(page.locator('#f1AccessSecretDot')).toHaveCount(0);
  await expect(page.getByText('FUNZIONARI / NOTIZIERI ABILITATI')).toHaveCount(0);
  const names=await page.evaluate(()=>window.__accessCalls.map(x=>x.name));
  expect(names).toContain('f1_record_dashboard_access');
});
