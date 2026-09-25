(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])),txt=v=>String(v??'').trim();
const state={me:null,accounts:[],busy:false};
function reveal(){document.documentElement.classList.remove('f1-auth-pending')}
function setMsg(text,bad=false){const e=$('msg');e.textContent=text||'';e.className='admin-msg'+(text?' show '+(bad?'bad':'ok'):'')}
function fmtDate(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);try{return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'}).format(d)}catch(_){return d.toLocaleString('it-IT')}}
function statusOf(a){if(a?.banned_until){const d=new Date(a.banned_until);if(!Number.isNaN(d.getTime())&&d>new Date())return'DISABLED'}return String(a?.status||'').toUpperCase()||'—'}
function randomPassword(len=18){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_';const a=new Uint32Array(len);crypto.getRandomValues(a);let s='';for(let i=0;i<len;i++)s+=chars[a[i]%chars.length];return 'A9!'+s.slice(3)}
function recoveryUrl(){const u=new URL('setup-cloud.html',location.href);u.searchParams.set('return','ricerca-territoriale.html');return u.href}
function updateHeader(){
  const now=new Date();
  const name=[state.me?.first_name,state.me?.last_name].filter(Boolean).join(' ')||'Titolare';
  const badge=(String(state.me?.first_name||'F').charAt(0)+String(state.me?.last_name||'1').charAt(0)).toUpperCase();
  if($('staffName'))$('staffName').textContent=name;
  if($('userBadge'))$('userBadge').textContent=badge;
  if($('todayDate'))$('todayDate').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'2-digit'}).format(now);
  const tick=()=>{if($('topClock'))$('topClock').textContent=new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())};
  tick();setInterval(tick,1000);
}
async function copy(text,btn){try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent='COPIATO';setTimeout(()=>btn.textContent=old,1000)}catch(e){setMsg('COPIA NON RIUSCITA · '+String(e?.message||e),true)}}
async function loadAccounts(){const box=$('accounts');box.innerHTML='<div class="empty">Caricamento…</div>';try{const r=await F1StaffData.staffAdmin({action:'list'});state.accounts=Array.isArray(r?.accounts)?r.accounts:[];renderAccounts()}catch(e){box.innerHTML='<div class="empty">'+esc(e?.message||e)+'</div>'}}
function renderAccounts(){
  $('count').textContent=state.accounts.length+' account';
  const box=$('accounts');
  box.innerHTML=state.accounts.length?state.accounts.map((a,i)=>{const status=statusOf(a),email=txt(a.email||a.company_email),name=[a.first_name,a.last_name].filter(Boolean).join(' ')||email||'Account F1',legacy=/\+f1\./i.test(email)&&/@gmail\.com$/i.test(email);return `<article class="account" data-index="${i}"><div class="account-head"><div><strong>${esc(name)}</strong><small>${esc(a.role||'—')} · ${esc(email||'—')}</small></div><span class="badge ${status==='ACTIVE'?'':'off'}">${esc(status)}</span></div><div class="meta"><span>ULTIMO LOGIN</span><strong>${esc(fmtDate(a.last_sign_in_at))}</strong><span>ULTIMO ACCESSO</span><strong>${esc(fmtDate(a.last_access))}</strong><span>ACCESSI</span><strong>${Number(a.access_count||0)}</strong><span>EMAIL</span><strong>${legacy?'ALIAS LEGACY · DA MIGRARE':'REALE / DIRETTA'}</strong><span>PASSWORD</span><strong>PROTETTA · NON VISUALIZZABILE</strong></div><div class="actions">${email?'<button class="admin-btn secondary" data-copy>COPIA EMAIL</button><button class="admin-btn secondary" data-email>'+(legacy?'MIGRA EMAIL':'CAMBIA EMAIL')+'</button><button class="admin-btn dark" data-recovery>INVIA RECUPERO</button>':''}${status==='ACTIVE'?'<button class="admin-btn danger" data-toggle>DISATTIVA</button>':'<button class="admin-btn primary" data-toggle>RIATTIVA</button>'}</div><div class="password-box"><div class="password-row"><input type="password" data-new-password minlength="12" autocomplete="new-password" placeholder="Nuova password temporanea"><button class="admin-btn secondary" data-generate>GENERA</button><button class="admin-btn dark" data-set-password>IMPOSTA PASSWORD</button></div></div></article>`}).join(''):'<div class="empty">NESSUN ACCOUNT REGISTRATO</div>';
  box.querySelectorAll('.account').forEach(card=>{
    const a=state.accounts[Number(card.dataset.index)],email=txt(a.email||a.company_email),status=statusOf(a);
    card.querySelector('[data-copy]')?.addEventListener('click',e=>copy(email,e.currentTarget));
    card.querySelector('[data-email]')?.addEventListener('click',()=>setEmail(a,email));
    card.querySelector('[data-recovery]')?.addEventListener('click',()=>sendRecovery(email));
    card.querySelector('[data-toggle]')?.addEventListener('click',()=>toggleAccount(a,status));
    card.querySelector('[data-generate]')?.addEventListener('click',()=>{const f=card.querySelector('[data-new-password]');f.value=randomPassword();f.type='text'});
    card.querySelector('[data-set-password]')?.addEventListener('click',()=>setPassword(a,card));
  });
}
async function createAccount(){
  if(state.busy)return;
  const first_name=txt($('firstName').value),last_name=txt($('lastName').value),email=txt($('email').value).toLowerCase(),phone=txt($('phone').value),role=$('role').value,password=$('password').value;
  if(!first_name||!last_name||!email.includes('@')||password.length<12){setMsg('INSERISCI NOME, COGNOME, EMAIL VALIDA E PASSWORD DI ALMENO 12 CARATTERI',true);return}
  state.busy=true;$('createAccount').disabled=true;
  try{const r=await F1StaffData.staffAdmin({action:'create',first_name,last_name,email,phone,role,password});if(!r?.ok)throw new Error(r?.message||r?.error||'CREAZIONE NON RIUSCITA');$('password').value='';setMsg('ACCESSO CREATO · '+email);await loadAccounts()}catch(e){setMsg('ERRORE CREAZIONE ACCESSO · '+String(e?.message||e),true)}finally{state.busy=false;$('createAccount').disabled=false}
}
async function toggleAccount(a,status){try{const action=status==='ACTIVE'?'disable':'enable';const r=await F1StaffData.staffAdmin({action,user_id:a.user_id,reason:'Gestione Accessi Ufficio'});if(!r?.ok)throw new Error(r?.message||r?.error||'OPERAZIONE NON RIUSCITA');setMsg(action==='disable'?'ACCESSO DISATTIVATO':'ACCESSO RIATTIVATO');await loadAccounts()}catch(e){setMsg('ERRORE ACCESSO · '+String(e?.message||e),true)}}
async function setEmail(a,currentEmail){
  const isAnastasia=String(a?.first_name||'').toLowerCase()==='anastasia'&&String(a?.last_name||'').toLowerCase()==='cetrulo';
  const suggested=isAnastasia&&/\+f1\./i.test(currentEmail)?'anastasia@gmail.com':currentEmail;
  const email=txt(prompt('Nuova email reale di accesso F1',suggested)).toLowerCase();
  if(!email)return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setMsg('EMAIL NON VALIDA',true);return}
  if(email===String(currentEmail||'').toLowerCase()){setMsg('EMAIL INVARIATA');return}
  if(!confirm('Aggiornare l’accesso di '+[a.first_name,a.last_name].filter(Boolean).join(' ')+' da '+currentEmail+' a '+email+'?'))return;
  try{const r=await F1StaffData.staffAdmin({action:'set_email',user_id:a.user_id,email,reason:'Migrazione a email reale da Gestione Accessi Ufficio'});if(!r?.ok)throw new Error(r?.message||r?.error||'EMAIL NON AGGIORNATA');setMsg('EMAIL DI ACCESSO AGGIORNATA · '+email);await loadAccounts()}catch(e){setMsg('ERRORE CAMBIO EMAIL · '+String(e?.message||e),true)}
}
async function sendRecovery(email){if(!email)return;try{await F1Sync.sendRecoveryEmail(email,recoveryUrl());setMsg('EMAIL DI RECUPERO INVIATA A '+email)}catch(e){setMsg('RECUPERO NON INVIATO · '+String(e?.message||e),true)}}
async function setPassword(a,card){const f=card.querySelector('[data-new-password]'),password=f.value;if(password.length<12){setMsg('LA NUOVA PASSWORD DEVE AVERE ALMENO 12 CARATTERI',true);return}try{const r=await F1StaffData.staffAdmin({action:'set_password',user_id:a.user_id,password,reason:'Reset amministrativo password ufficio'});if(!r?.ok)throw new Error(r?.message||r?.error||'PASSWORD NON AGGIORNATA');f.value='';f.type='password';setMsg('PASSWORD TEMPORANEA AGGIORNATA · NON È STATA SALVATA NEI DATI F1')}catch(e){setMsg('ERRORE PASSWORD · '+String(e?.message||e),true)}}
async function init(){
  try{
    if(!F1Sync?.configured?.()||!(await F1Sync.ensureSession())){location.replace('setup-cloud.html?return=accessi-ufficio.html');return}
    state.me=await F1StaffData.me();
    updateHeader();
    if(String(state.me.role||'').toUpperCase()!=='TITOLARE'){document.body.innerHTML='<main class="wrap"><section class="card"><h1>ACCESSO RISERVATO AL TITOLARE</h1><a class="admin-btn dark" href="ricerca-territoriale.html">TORNA ALLA DASHBOARD</a></section></main>';reveal();return}
    $('generatePassword').addEventListener('click',()=>{$('password').value=randomPassword();$('password').type='text'});
    $('createAccount').addEventListener('click',createAccount);$('reload').addEventListener('click',loadAccounts);
    await loadAccounts();reveal();
  }catch(e){console.error(e);location.replace('setup-cloud.html?return=accessi-ufficio.html')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();