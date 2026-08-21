(()=>{'use strict';
const STORES=['acqProV25','acqProV24','acqProMobile'];
const SNAP='acqProV25Snapshot',MARK='acqContactIdRepair';
const PUBLICATION_TARGET='https://josephsocialmedia2-spec.github.io/open-social-scheduler/monday-control.html';
const safeId=/^[A-Za-z0-9._:-]+$/;
function makeId(i){try{return 'legacy-'+crypto.randomUUID()}catch{return 'legacy-'+Date.now().toString(36)+'-'+i+'-'+Math.random().toString(36).slice(2,9)}}
function repairContacts(list){if(!Array.isArray(list))return{list,changed:false,repaired:0};const seen=new Set();let changed=false,repaired=0;const out=list.map((c,i)=>{if(!c||typeof c!=='object')return c;let id=c.id==null?'':String(c.id).trim();if(!id||!safeId.test(id)||seen.has(id)){id=makeId(i);changed=true;repaired++}else if(c.id!==id){changed=true}seen.add(id);return changed&&c.id!==id?{...c,id}:c});return{list:out,changed,repaired}}
function repairStore(key){try{const raw=localStorage.getItem(key);if(!raw)return 0;const obj=JSON.parse(raw);if(!obj||typeof obj!=='object'||!Array.isArray(obj.contacts))return 0;const r=repairContacts(obj.contacts);if(r.changed){obj.contacts=r.list;localStorage.setItem(key,JSON.stringify(obj))}return r.repaired}catch{return 0}}
function repairSnapshot(){try{const raw=localStorage.getItem(SNAP);if(!raw)return 0;const snap=JSON.parse(raw);if(!snap?.state||!Array.isArray(snap.state.contacts))return 0;const r=repairContacts(snap.state.contacts);if(r.changed){snap.state.contacts=r.list;localStorage.setItem(SNAP,JSON.stringify(snap))}return r.repaired}catch{return 0}}
let repaired=0;for(const key of STORES)repaired+=repairStore(key);repaired+=repairSnapshot();
try{localStorage.setItem(MARK,JSON.stringify({ts:new Date().toISOString(),repaired,ok:true}))}catch{}
document.addEventListener('click',e=>{const b=e.target.closest?.('#publicationBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const w=window.open(PUBLICATION_TARGET,'_blank','noopener,noreferrer');if(!w)window.location.href=PUBLICATION_TARGET},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-contact-edit]');if(!b)return;setTimeout(()=>{const banner=document.getElementById('editBanner'),name=document.getElementById('name');if(banner?.classList.contains('on')&&name){name.scrollIntoView({behavior:'smooth',block:'center'});try{name.focus({preventScroll:true})}catch{name.focus()}}},120)},true);
window.__ACQ_CONTACT_ID_REPAIR__={ok:true,repaired};
})();
