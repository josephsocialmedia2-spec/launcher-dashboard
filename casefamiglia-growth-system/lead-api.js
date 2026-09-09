const CFG_ENDPOINT='https://nqnmlsmeiynxbdojeyjt.supabase.co/functions/v1/casefamiglia-leads';
function cfgTracking(){const p=new URLSearchParams(location.search);return{source:p.get('utm_source')||'direct',medium:p.get('utm_medium')||'none',campaign:p.get('utm_campaign')||'pilot',content:p.get('utm_content')||'',term:p.get('utm_term')||'',referrer:document.referrer||'',landing_page:location.href}}
async function cfgPost(body,adminKey=''){const headers={'Content-Type':'application/json'};if(adminKey)headers['x-admin-key']=adminKey;const r=await fetch(CFG_ENDPOINT,{method:'POST',headers,body:JSON.stringify(body)});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error(j.error||'Errore di connessione');return j}
function cfgVal(form,name){const el=form.elements[name];return el?String(el.value||'').trim():''}
function cfgEsc(s){return String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
function cfgFormStarted(form){form.dataset.started=String(Date.now())}
function cfgResult(el,type,msg){el.className=type;el.innerHTML=msg}
