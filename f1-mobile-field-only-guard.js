(()=>{'use strict';
const REWRITE=[[/CONTATTA PROPRIETARIO/gi,'VERIFICA IN UFFICIO'],[/CHIAMA DA UFFICIO/gi,'VERIFICA IN UFFICIO']];
function enforce(){
  ['personCall','personWhatsapp'].forEach(id=>{const e=document.getElementById(id);if(e){e.hidden=true;e.style.display='none'}});
  document.querySelectorAll('a[href^="tel:"],a[href*="wa.me"],a[href*="whatsapp" i]').forEach(e=>{e.hidden=true;e.style.display='none'});
  document.querySelectorAll('button,a').forEach(e=>{const t=(e.textContent||'').trim().toUpperCase();if(t==='CHIAMA'||t.includes('CHIAMA ORA')||t==='WHATSAPP'){e.hidden=true;e.style.display='none'}});
  document.querySelectorAll('.status,.chip,.item,.now,.instruction,.helper').forEach(e=>{let h=e.innerHTML;let n=h;for(const [re,to] of REWRITE)n=n.replace(re,to);if(n!==h)e.innerHTML=n});
}
function patchPendingCount(){const s=window.F1MobileStore;if(!s||s.__signPendingPatched)return;const original=s.pendingCount.bind(s);s.pendingCount=async()=>{const base=await original();const ids=await s.get('pendingSignIds').catch(()=>[])||[];return Number(base||0)+ids.length};s.__signPendingPatched=true;}
let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(enforce,20)};
function boot(){patchPendingCount();enforce();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','style','hidden']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.F1MobileFieldOnly={enforce,patchPendingCount};
})();
