(()=>{'use strict';
const VERSION='20260914-territory1';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
const obj=v=>{if(v&&typeof v==='object')return v;try{return JSON.parse(v||'{}')}catch(_){return{}}};
let installed=false,profileCache=null,profileAt=0;
function collectLeafStrings(v,out){if(v==null)return;if(Array.isArray(v)){for(const x of v)collectLeafStrings(x,out);return}if(typeof v==='object'){for(const x of Object.values(v))collectLeafStrings(x,out);return}if(typeof v==='string'&&v.trim())out.push(v.trim())}
function assignedPlaces(profile){
  const p=profile||{},out=[];
  for(const k of ['comune','municipality','city','territory','territorio','zona','microzona'])if(p[k])collectLeafStrings(p[k],out);
  const a=obj(p.assigned_territory);
  const keyed=[];
  for(const [k,v] of Object.entries(a||{}))if(/comun|municip|city|territor|zona/i.test(k))collectLeafStrings(v,keyed);
  if(keyed.length)out.push(...keyed);else collectLeafStrings(a,out);
  return [...new Set(out.map(norm).filter(Boolean))];
}
function roleNeedsGuard(profile){const r=norm(profile?.role);return /FUNZIONARIO|NOTIZIERE/.test(r)}
function recordComune(record){
  if(!record||typeof record!=='object')return'';
  for(const k of ['comune','municipality','city','town'])if(record[k]&&String(record[k]).trim())return norm(record[k]);
  return'';
}
function explicitOverride(row){
  if(!row||typeof row!=='object')return false;
  if(row.territory_override===true||row.allow_outside_territory===true||row.cross_zone_override===true)return true;
  const m=obj(row.metadata);
  return m.territory_override===true||m.allow_outside_territory===true||m.cross_zone_override===true;
}
function matchesRecord(record,profile){
  if(!roleNeedsGuard(profile))return true;
  const assigned=assignedPlaces(profile);if(!assigned.length)return true;
  const c=recordComune(record);if(!c)return true;
  return assigned.includes(c);
}
async function getProfile(userId,origMe){
  const now=Date.now();
  if(profileCache&&now-profileAt<30000)return profileCache;
  try{const p=await origMe(),pid=String(p?.user_id||p?.userId||'');if(!userId||!pid||pid===String(userId)){profileCache=p;profileAt=now;return p}}catch(_){return null}
  return null;
}
function install(){
  if(installed||!window.F1StaffData)return false;
  const data=window.F1StaffData;
  const origTasks=data.tasks?.bind(data),origOwnLeads=data.ownLeads?.bind(data),origRest=data.rest?.bind(data),origMe=data.me?.bind(data);
  if(!origTasks||!origOwnLeads||!origMe)return false;
  data.ownLeads=async function(userId,limit=300){
    const [rows,profile]=await Promise.all([origOwnLeads(userId,limit),getProfile(userId,origMe)]);
    if(!profile||!roleNeedsGuard(profile))return rows;
    return (rows||[]).filter(r=>matchesRecord(r,profile));
  };
  data.tasks=async function(userId){
    const [rows,profile,allLeads]=await Promise.all([origTasks(userId),getProfile(userId,origMe),origOwnLeads(userId,500).catch(()=>[])]);
    if(!profile||!roleNeedsGuard(profile))return rows;
    const leads=new Map((allLeads||[]).map(l=>[String(l.lead_id||l.id||''),l]));
    return (rows||[]).filter(t=>{
      if(explicitOverride(t))return true;
      const taskComune=recordComune(t);if(taskComune&&!matchesRecord(t,profile))return false;
      const linked=t.lead_id?leads.get(String(t.lead_id)):null;
      if(linked&&!matchesRecord(linked,profile))return false;
      return true;
    });
  };
  if(origRest){
    data.rest=async function(path,opt={}){
      const rows=await origRest(path,opt);
      if(!Array.isArray(rows)||!/^\s*(?:f1_crm_requests|properties)\?/i.test(String(path||'')))return rows;
      const uid=String(path||'').match(/(?:^|[?&])user_id=eq\.([^&]+)/i)?.[1];
      const profile=await getProfile(uid?decodeURIComponent(uid):'',origMe);
      if(!profile||!roleNeedsGuard(profile))return rows;
      return rows.filter(r=>explicitOverride(r)||matchesRecord(r,profile));
    };
  }
  installed=true;
  if(typeof window.dispatchEvent==='function'&&typeof window.CustomEvent==='function')window.dispatchEvent(new CustomEvent('f1:territory-guard-ready',{detail:{version:VERSION}}));
  return true;
}
window.F1TerritoryGuard={version:VERSION,install,assignedPlaces,matchesRecord,recordComune,explicitOverride,isInstalled:()=>installed};
if(!install()){
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},50);
}
})();
