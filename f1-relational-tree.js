(function(){
'use strict';

const WIDTH=2600,HEIGHT=1800,NODE_W=142,NODE_H=94;
const RELATION_TYPES=[
  {id:'marito',label:'MARITO',inverse:'moglie',group:'family',spouse:true},
  {id:'moglie',label:'MOGLIE',inverse:'marito',group:'family',spouse:true},
  {id:'compagno',label:'COMPAGNO',inverse:'compagna',group:'family',spouse:true},
  {id:'compagna',label:'COMPAGNA',inverse:'compagno',group:'family',spouse:true},
  {id:'figlio',label:'FIGLIO',inverse:'genitore',group:'parent',child:true},
  {id:'figlia',label:'FIGLIA',inverse:'genitore',group:'parent',child:true},
  {id:'padre',label:'PADRE',inverse:'figlio_a',group:'parent',parent:true},
  {id:'madre',label:'MADRE',inverse:'figlio_a',group:'parent',parent:true},
  {id:'fratello',label:'FRATELLO',inverse:'fratello_sorella',group:'family'},
  {id:'sorella',label:'SORELLA',inverse:'fratello_sorella',group:'family'},
  {id:'amico',label:'AMICO',inverse:'amico_a',group:'friend'},
  {id:'amica',label:'AMICA',inverse:'amico_a',group:'friend'},
  {id:'collega',label:'COLLEGA',inverse:'collega',group:'work'},
  {id:'conoscente',label:'CONOSCENTE',inverse:'conoscente',group:'friend'},
  {id:'vicino',label:'VICINO/A',inverse:'vicino',group:'friend'},
  {id:'parente',label:'PARENTE',inverse:'parente',group:'family'},
  {id:'professionista',label:'PROFESSIONISTA',inverse:'cliente',group:'work'},
  {id:'cliente',label:'CLIENTE',inverse:'professionista',group:'work'},
  {id:'altro',label:'ALTRO',inverse:'collegato',group:'other'}
];
const INTERNAL_TYPES=[
  {id:'genitore',label:'GENITORE',inverse:'figlio_a',group:'parent'},
  {id:'figlio_a',label:'FIGLIO/A',inverse:'genitore',group:'parent'},
  {id:'fratello_sorella',label:'FRATELLO/SORELLA',inverse:'fratello_sorella',group:'family'},
  {id:'amico_a',label:'AMICO/A',inverse:'amico_a',group:'friend'},
  {id:'collegato',label:'COLLEGATO',inverse:'collegato',group:'other'}
];
const ALL_TYPES=[...RELATION_TYPES,...INTERNAL_TYPES];
const TYPE_MAP=new Map(ALL_TYPES.map(x=>[x.id,x]));
const EXPAND_QUESTIONS=[
  'Chi altro conosci attraverso questa persona?',
  'Chi conosce personalmente?',
  'Chi frequenta oggi?',
  'Chi conosceva in passato?',
  'Chi sono i suoi amici?',
  'Quali parenti conosci?',
  'Quali commercianti o professionisti frequenta?',
  'Chi potrebbe aprire altre relazioni?'
];

let sourceId='root',linkTargetId='',relationType='',relationQuestion='',expandSourceId='root';
let selectedId='root',selectedEdgeId='',scale=.82,panX=26,panY=22;
let nodeDrag=null,canvasDrag=null,connectDrag=null,groupDrag=null,pendingMessage=null,booted=false,lastMove=null,undoTimer=null,openMenuId='',suppressClickUntil=0;
const collapsed=new Set(readCollapsed());
const selectedIds=new Set(['root']);
const groupRects=new Map();
const SNAP=5,DRAG_THRESHOLD=5;

function people(){try{return Array.isArray(db.people)?db.people:[]}catch(_){return []}}
function relations(){try{db.relations=Array.isArray(db.relations)?db.relations:[];return db.relations}catch(_){return []}}
function positions(){
  try{
    db.graphPositions=db.graphPositions&&typeof db.graphPositions==='object'?db.graphPositions:{};
    Object.entries(db.graphPositions).forEach(([id,p])=>{
      if(!p||typeof p!=='object'){delete db.graphPositions[id];return}
      const x=Number(p.x),y=Number(p.y);
      p.x=Number.isFinite(x)?x:35;p.y=Number.isFinite(y)?y:35;
      if(typeof p.manual!=='boolean')p.manual=false;
      if(typeof p.pinned!=='boolean')p.pinned=false;
      if(!Object.prototype.hasOwnProperty.call(p,'groupId'))p.groupId=null;
    });
    return db.graphPositions;
  }catch(_){return {}}
}
function groups(){
  try{
    if(Array.isArray(db.graphGroups))return db.graphGroups;
    if(db.graphGroups&&typeof db.graphGroups==='object'){
      db.graphGroups=Object.entries(db.graphGroups).map(([id,g])=>({id,...(g||{})}));
    }else db.graphGroups=[];
    return db.graphGroups;
  }catch(_){return []}
}
function groupById(id){return groups().find(g=>String(g.id)===String(id))||null}
function groupMembers(id){return people().filter(p=>positions()[p.id]?.groupId===id)}
function person(id){return people().find(p=>String(p.id)===String(id))||null}
function fullName(p){if(!p)return '';return [p.name,p.surname].filter(Boolean).join(' ').trim().toLocaleUpperCase('it-IT')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function jsArg(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function newId(prefix='id'){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function def(type){return TYPE_MAP.get(type)||{id:type||'collegato',label:String(type||'COLLEGATO').replace(/_/g,' ').toUpperCase(),inverse:'collegato',group:'other'}}
function label(type,custom=''){return custom||def(type).label}
function groupFor(type){return def(type).group||'other'}
function readCollapsed(){try{return JSON.parse(localStorage.getItem('f1RelGraphCollapsed')||'[]')}catch(_){return []}}
function saveCollapsed(){try{localStorage.setItem('f1RelGraphCollapsed',JSON.stringify([...collapsed]))}catch(_){}}
function normalizePhone(v){let d=String(v||'').replace(/\D/g,'');if(!d)return '';if(d.startsWith('00'))d=d.slice(2);if(!d.startsWith('39')&&d.length<=10)d='39'+d;return d}
function phoneDisplay(v){
  const raw=String(v||'').trim();if(!raw)return '';
  const d=raw.replace(/\D/g,'');
  if(d.length===10&&!raw.includes(' '))return d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6);
  return raw;
}
function inferGender(p){
  if(!p)return '';
  const n=fullName(p);
  if(/\b(MAMMA|MADRE|MAMY|MAMMA')\b/i.test(n))return'f';
  if(/\b(PAPA|PAPÀ|PADRE|DAD)\b/i.test(n))return'm';
  const types=relations().filter(r=>r.sourceId===p.id).map(r=>r.type);
  if(types.some(t=>['moglie','compagna','madre','sorella','figlia','amica'].includes(t)))return'f';
  if(types.some(t=>['marito','compagno','padre','fratello','figlio','amico'].includes(t)))return'm';
  return '';
}
function inverseFor(type,source,target){
  if(type==='figlio'||type==='figlia'){
    const g=inferGender(source);return g==='f'?'madre':g==='m'?'padre':'genitore';
  }
  if(type==='padre'||type==='madre'){
    const g=inferGender(target);return g==='f'?'figlia':g==='m'?'figlio':'figlio_a';
  }
  return def(type).inverse||'collegato';
}
function categoryFor(type){
  const g=groupFor(type);
  if(g==='family'||g==='parent')return'famiglia';
  if(g==='friend')return'amici';
  if(g==='work'&&type==='collega')return'lavoro';
  if(g==='work')return'professionisti';
  return'';
}
function relationshipLabel(row){
  if(!row)return '';
  return label(row.type,row.customLabel||'');
}
function persistGraph(){
  try{persist()}catch(e){console.warn('Persistenza grafo:',e)}
}
function clampPosition(pos){
  const x=Number(pos?.x),y=Number(pos?.y);
  return {...(pos||{}),x:Math.max(35,Math.min(WIDTH-NODE_W-35,Number.isFinite(x)?x:35)),y:Math.max(35,Math.min(HEIGHT-NODE_H-35,Number.isFinite(y)?y:35))};
}
function occupied(x,y,ignore=''){
  return people().some(p=>{
    if(p.id===ignore)return false;
    const q=positions()[p.id];if(!q)return false;
    return Math.abs(q.x-x)<NODE_W+24&&Math.abs(q.y-y)<NODE_H+28;
  });
}
function findFree(start,ignore=''){
  let p=clampPosition(start);
  const golden=2.399963229728653;
  for(let i=0;i<90&&occupied(p.x,p.y,ignore);i++){
    const radius=34+Math.sqrt(i+1)*34;
    const angle=i*golden;
    p=clampPosition({x:start.x+Math.cos(angle)*radius,y:start.y+Math.sin(angle)*radius});
  }
  return p;
}
function ensurePositions(){
  const ps=positions();let changed=false;
  if(!ps.root){ps.root={x:520,y:220,manual:false,pinned:false,groupId:null};changed=true}
  const ordered=people().filter(p=>p.id!=='root');
  ordered.forEach(p=>{
    if(ps[p.id])return;
    const parentId=(p.parentId&&person(p.parentId))?p.parentId:'root';
    const edge=visualEdges().find(e=>(e.sourceId===parentId&&e.targetId===p.id)||(e.targetId===parentId&&e.sourceId===p.id));
    const type=edge?(edge.sourceId===parentId?edge.type:edge.inverseType):'altro';
    placeNew(p.id,parentId,type);
    changed=true;
  });
  if(changed)persistGraph();
}
function placeNew(targetId,srcId,type){
  const ps=positions(),src=ps[srcId]||ps.root||{x:520,y:220};
  const d=def(type),group=groupFor(type);
  const degree=visualEdges().filter(e=>e.sourceId===srcId||e.targetId===srcId).length;
  let base=0,radius=210;
  if(d.spouse){base=0.04+(degree%2?0.13:-0.13);radius=190}
  else if(d.child){base=1.08+((degree%5)-2)*0.20;radius=215}
  else if(d.parent){base=-1.62+((degree%3)-1)*0.20;radius=205}
  else if(group==='friend'){base=-0.58+((degree%5)-2)*0.32;radius=220}
  else if(group==='work'){base=0.48+((degree%4)-1.5)*0.36;radius=235}
  else if(group==='family'){base=2.55+((degree%4)-1.5)*0.28;radius=205}
  else{base=-1.10+(degree*2.399963229728653);radius=225}
  const candidate={x:src.x+Math.cos(base)*radius,y:src.y+Math.sin(base)*radius};
  const free=findFree(candidate,targetId);
  ps[targetId]={...free,manual:false,pinned:false,groupId:ps[targetId]?.groupId||null};
}
function hashCode(v){
  let h=0;for(const ch of String(v||''))h=((h<<5)-h)+ch.charCodeAt(0)|0;return Math.abs(h);
}
function relationKey(a,b){return[a,b].sort().join('::')}
function applyHierarchy(a,b,type,isNew){
  const src=person(a),target=person(b);if(!src||!target||target.id==='root')return;
  const d=def(type);
  if(d.spouse||['fratello','sorella'].includes(type))target.parentId=src.parentId||'root';
  else if(d.child)target.parentId=src.id;
  else if(d.parent)target.parentId=src.parentId||'root';
  else if(isNew&&!target.parentId)target.parentId=src.id;
}
function addPair(a,b,type,custom='',inverseType='',inverseCustom=''){
  const src=person(a),tgt=person(b);if(!src||!tgt||a===b)return null;
  const inv=inverseType||inverseFor(type,src,tgt);
  const existing=visualEdges().find(e=>e.sourceId===a&&e.targetId===b&&e.type===type&&e.customLabel===custom)
    ||visualEdges().find(e=>e.sourceId===b&&e.targetId===a&&e.type===inv&&e.inverseType===type);
  if(existing)return existing.pairId;
  const pairId=newId('pair'),now=new Date().toISOString();
  relations().push({
    id:newId('rel'),pairId,pairRole:'forward',sourceId:a,targetId:b,type,inverseType:inv,
    customLabel:custom||'',inverseCustomLabel:inverseCustom||'',periodId:'',context:'quick_relationship',
    createdAt:now,updatedAt:now
  });
  relations().push({
    id:newId('rel'),pairId,pairRole:'reverse',sourceId:b,targetId:a,type:inv,inverseType:type,
    customLabel:inverseCustom||'',inverseCustomLabel:custom||'',periodId:'',context:'quick_relationship',
    createdAt:now,updatedAt:now
  });
  return pairId;
}
function visualEdges(){
  const rows=relations().filter(r=>r&&r.sourceId&&r.targetId&&r.sourceId!==r.targetId);
  const groups=new Map();
  rows.forEach((r,i)=>{
    let key=r.pairId;
    if(!key)key='legacy:'+relationKey(r.sourceId,r.targetId);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push({...r,__index:i,__key:key});
  });
  const out=[];
  for(const [key,items] of groups){
    let f=items.find(x=>x.pairRole==='forward')||items[0];
    let rev=items.find(x=>x.sourceId===f.targetId&&x.targetId===f.sourceId)||null;
    if(!rev&&items.length>1)rev=items.find(x=>x!==f)||null;
    const invType=f.inverseType||rev?.type||inverseFor(f.type,person(f.sourceId),person(f.targetId));
    out.push({
      pairId:key,sourceId:f.sourceId,targetId:f.targetId,type:f.type||'collegato',inverseType:invType,
      customLabel:f.customLabel||'',inverseCustomLabel:f.inverseCustomLabel||rev?.customLabel||'',
      forward:f,reverse:rev,group:groupFor(f.type)
    });
  }
  return out.filter(e=>person(e.sourceId)&&person(e.targetId));
}
function edgeText(e){
  const a=label(e.type,e.customLabel),b=label(e.inverseType,e.inverseCustomLabel);
  return a===b?a:(a+' ↔ '+b);
}
function perspectiveLabel(e,pId){
  if(e.sourceId===pId)return label(e.type,e.customLabel);
  if(e.targetId===pId)return label(e.inverseType,e.inverseCustomLabel);
  return '';
}
function incidentLabels(id){
  return visualEdges().filter(e=>e.sourceId===id||e.targetId===id).map(e=>perspectiveLabel(e,id)).filter(Boolean);
}
function hiddenIds(){
  const hidden=new Set();
  function mark(parent){
    people().filter(p=>p.parentId===parent).forEach(p=>{hidden.add(p.id);mark(p.id)});
  }
  collapsed.forEach(id=>mark(id));
  groups().filter(g=>g.collapsed).forEach(g=>groupMembers(g.id).forEach(p=>hidden.add(p.id)));
  return hidden;
}
function groupRect(g){
  const members=groupMembers(g.id),ps=positions();
  if(!members.length){
    return {x:Number(g.x)||70,y:Number(g.y)||70,w:176,h:42};
  }
  const xs=members.map(p=>ps[p.id]?.x).filter(Number.isFinite),ys=members.map(p=>ps[p.id]?.y).filter(Number.isFinite);
  if(!xs.length||!ys.length)return {x:Number(g.x)||70,y:Number(g.y)||70,w:176,h:42};
  if(g.collapsed){
    const x=Number.isFinite(Number(g.x))?Number(g.x):(Math.min(...xs)-16);
    const y=Number.isFinite(Number(g.y))?Number(g.y):(Math.min(...ys)-38);
    return {x,y,w:190,h:42};
  }
  const minX=Math.min(...xs)-28,maxX=Math.max(...xs)+NODE_W+28,minY=Math.min(...ys)-46,maxY=Math.max(...ys)+NODE_H+28;
  return {x:minX,y:minY,w:Math.max(190,maxX-minX),h:Math.max(120,maxY-minY)};
}
function renderGroups(){
  const holder=document.getElementById('relationshipGroups');if(!holder)return;
  groupRects.clear();
  holder.innerHTML=groups().map(g=>{
    const r=groupRect(g);groupRects.set(g.id,r);
    const count=groupMembers(g.id).length;
    return '<div class="rel-group-box '+(g.collapsed?'collapsed ':'')+'" data-group-id="'+esc(g.id)+'" style="left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px">'+
      '<button type="button" class="rel-group-handle" onpointerdown="event.stopPropagation();F1RelationshipTree.startGroupDrag(event,\''+jsArg(g.id)+'\')" title="Trascina tutto il gruppo">'+esc(g.name||'GRUPPO')+' <span>· '+count+' PERSONE</span></button>'+
      '<button type="button" class="rel-group-collapse" onclick="event.stopPropagation();F1RelationshipTree.toggleGroupCollapse(\''+jsArg(g.id)+'\')" title="'+(g.collapsed?'Espandi':'Comprimi')+' gruppo">'+(g.collapsed?'▸':'▾')+'</button>'+
      '</div>';
  }).join('');
}
function renderNodes(){
  ensurePositions();
  const holder=document.getElementById('relationshipNodes');if(!holder)return;
  const hidden=hiddenIds(),focusPerson=selectedIds.size===1&&selectedId&&selectedId!=='root';
  const neighbours=new Set();
  if(focusPerson){
    visualEdges().forEach(e=>{
      if(e.sourceId===selectedId)neighbours.add(e.targetId);
      if(e.targetId===selectedId)neighbours.add(e.sourceId);
    });
  }
  const cards=people().filter(p=>!hidden.has(p.id)).map(p=>{
    const pos=positions()[p.id]||{x:40,y:40},phone=normalizePhone(p.phone),display=phoneDisplay(p.phone);
    const rels=incidentLabels(p.id).slice(0,1),hasChildren=people().some(x=>x.parentId===p.id),isRoot=p.id==='root';
    const dim=focusPerson&&p.id!==selectedId&&!neighbours.has(p.id);
    const name=isRoot?'IO':fullName(p),aria=[name,rels[0]||'',p.town||'',display||''].filter(Boolean).join(', ');
    return '<article tabindex="0" role="group" aria-label="'+esc(aria)+'" class="rel-graph-node '+(isRoot?'root ':'')+(selectedId===p.id?'selected ':'')+(selectedIds.has(p.id)?'multi-selected ':'')+(pos.pinned?'pinned ':'')+(dim?'context-dim ':'')+'" data-person-id="'+esc(p.id)+'" style="left:'+pos.x+'px;top:'+pos.y+'px" onkeydown="F1RelationshipTree.nodeKey(event,\''+jsArg(p.id)+'\')" onpointerdown="F1RelationshipTree.startNodeDrag(event,\''+jsArg(p.id)+'\')" onclick="F1RelationshipTree.select(\''+jsArg(p.id)+'\',false,event)">'+
      '<div class="rel-node-content">'+
      '<div class="rel-node-name">'+esc(name)+'</div>'+
      (!isRoot&&rels.length?'<div class="rel-node-rel">'+esc(rels[0])+'</div>':'')+
      '<div class="rel-node-town">'+esc(p.town||'')+'</div>'+
      (!isRoot&&display?'<button type="button" aria-label="Apri WhatsApp con '+esc(name)+' al numero '+esc(display)+'" class="rel-node-phone" onclick="event.stopPropagation();F1RelationshipTree.openWhatsApp(\''+jsArg(p.id)+'\')">'+esc(display)+'</button>':'')+
      (!isRoot?'<div class="rel-node-stage">● '+esc(p.stage||'Nome')+'</div>':'')+
      '<div class="rel-node-actions">'+
      (!isRoot&&phone?'<a aria-label="Chiama '+esc(name)+'" class="call" href="tel:+'+esc(phone)+'" onclick="event.stopPropagation()" title="Chiama">☎</a>':'<span></span>')+
      (!isRoot&&phone?'<button type="button" aria-label="Apri WhatsApp con '+esc(name)+'" class="wa" onclick="event.stopPropagation();F1RelationshipTree.openWhatsApp(\''+jsArg(p.id)+'\')">WA</button>':'<span></span>')+
      (!isRoot?'<button type="button" aria-label="Apri scheda '+esc(name)+'" class="open" onclick="event.stopPropagation();F1RelationshipTree.openPerson(\''+jsArg(p.id)+'\')">APRI</button>':'<span></span>')+
      '<button type="button" aria-label="Aggiungi persona collegata a '+esc(name)+'" class="add" onclick="event.stopPropagation();F1RelationshipTree.openPicker(\''+jsArg(p.id)+'\')">+</button>'+
      '</div></div>'+
      (pos.pinned?'<span class="rel-pin-mark" aria-label="Posizione fissata" title="Posizione fissata">📌</span>':'')+
      '<button type="button" class="rel-node-menu" aria-label="Menu '+esc(name)+'" onclick="event.stopPropagation();F1RelationshipTree.toggleNodeMenu(\''+jsArg(p.id)+'\')">⋯</button>'+
      '<div class="rel-node-menu-panel '+(openMenuId===p.id?'show':'')+'" onclick="event.stopPropagation()">'+
        '<button type="button" onclick="F1RelationshipTree.openPerson(\''+jsArg(p.id)+'\')">APRI SCHEDA</button>'+
        '<button type="button" onclick="F1RelationshipTree.openPicker(\''+jsArg(p.id)+'\')">+ PERSONA COLLEGATA</button>'+
        '<button type="button" onclick="F1RelationshipTree.center(\''+jsArg(p.id)+'\')">CENTRA QUI</button>'+
        '<button type="button" onclick="F1RelationshipTree.togglePin(\''+jsArg(p.id)+'\')">'+(pos.pinned?'📌 SBLOCCA POSIZIONE':'📌 FISSA POSIZIONE')+'</button>'+
        '<button type="button" onclick="F1RelationshipTree.assignGroupPrompt(\''+jsArg(p.id)+'\')">SPOSTA IN GRUPPO</button>'+
        (hasChildren?'<button type="button" onclick="F1RelationshipTree.toggle(\''+jsArg(p.id)+'\')">'+(collapsed.has(p.id)?'ESPANDI RAMO':'NASCONDI RAMO')+'</button>':'')+
      '</div>'+
      (hasChildren?'<button type="button" aria-label="'+(collapsed.has(p.id)?'Espandi':'Comprimi')+' ramo di '+esc(name)+'" class="rel-collapse" onclick="event.stopPropagation();F1RelationshipTree.toggle(\''+jsArg(p.id)+'\')">'+(collapsed.has(p.id)?'▸':'▾')+'</button>':'')+
      '<button type="button" aria-label="Collega '+esc(name)+' trascinando verso un’altra persona" class="rel-connect-handle" title="Trascina verso un’altra persona per collegarla" onpointerdown="event.stopPropagation();F1RelationshipTree.startConnect(event,\''+jsArg(p.id)+'\')"></button>'+
      '</article>';
  }).join('');
  holder.innerHTML=cards||'<div class="rel-tree-empty">Nessuna persona ancora inserita.</div>';
}
function nodeKey(e,id){
  if(e.key==='Enter'){e.preventDefault();openPersonCard(id)}
  if((e.key==='+'||e.key==='=')){e.preventDefault();openPicker(id)}
}
function edgeGeometry(e){
  const a=positions()[e.sourceId],b=positions()[e.targetId];if(!a||!b)return null;
  const ac={x:a.x+NODE_W/2,y:a.y+NODE_H/2},bc={x:b.x+NODE_W/2,y:b.y+NODE_H/2};
  const dx=bc.x-ac.x,dy=bc.y-ac.y,dist=Math.max(1,Math.hypot(dx,dy)),ux=dx/dist,uy=dy/dist;
  const ax=ac.x+ux*(NODE_W*.47),ay=ac.y+uy*(NODE_H*.44);
  const bx=bc.x-ux*(NODE_W*.47),by=bc.y-uy*(NODE_H*.44);
  const nx=-uy,ny=ux,sign=(hashCode(e.pairId)%2)?1:-1;
  const bend=Math.min(92,Math.max(24,dist*.145))*sign;
  const mx=(ax+bx)/2+nx*bend,my=(ay+by)/2+ny*bend;
  const c1x=ax+(mx-ax)*.64,c1y=ay+(my-ay)*.64,c2x=bx+(mx-bx)*.64,c2y=by+(my-by)*.64;
  return {path:'M '+ax+' '+ay+' C '+c1x+' '+c1y+', '+c2x+' '+c2y+', '+bx+' '+by,mx,my,nx,ny};
}
function resolveLabelPosition(g,used,pairId){
  let x=g.mx,y=g.my;
  const sign=(hashCode(pairId)%2)?1:-1;
  for(let i=0;i<7;i++){
    const hit=used.some(p=>Math.abs(p.x-x)<92&&Math.abs(p.y-y)<22);
    if(!hit)break;
    const step=(Math.floor(i/2)+1)*18*(i%2?1:-1)*sign;
    x=g.mx+g.nx*step;y=g.my+g.ny*step;
  }
  used.push({x,y});return{x,y};
}
function renderEdges(){
  const svg=document.getElementById('relationshipEdges'),labels=document.getElementById('relationshipEdgeLabels');
  if(!svg||!labels)return;
  svg.setAttribute('viewBox','0 0 '+WIDTH+' '+HEIGHT);
  const hidden=hiddenIds(),edges=visualEdges().filter(e=>!hidden.has(e.sourceId)&&!hidden.has(e.targetId));
  const focusPerson=selectedId&&selectedId!=='root',usedLabels=[];
  let paths='<defs><marker id="relArrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="context-stroke"/></marker></defs>';
  const labelHtml=[];
  for(const e of edges){
    const g=edgeGeometry(e);if(!g)continue;
    const incident=focusPerson&&(e.sourceId===selectedId||e.targetId===selectedId);
    const contextClass=focusPerson?(incident?' context-active':' context-dim'):'';
    const cls='rel-edge-path '+e.group+(selectedEdgeId===e.pairId?' selected':'')+contextClass;
    paths+='<path class="'+cls+'" data-relation-id="'+esc(e.pairId)+'" d="'+g.path+'" marker-start="url(#relArrow)" marker-end="url(#relArrow)"></path>';
    paths+='<path class="rel-edge-hit" data-relation-id="'+esc(e.pairId)+'" d="'+g.path+'" onclick="F1RelationshipTree.openEdgeEditor(\''+jsArg(e.pairId)+'\')"></path>';
    const lp=resolveLabelPosition(g,usedLabels,e.pairId),aria='Modifica relazione '+edgeText(e);
    labelHtml.push('<button type="button" aria-label="'+esc(aria)+'" class="rel-edge-label '+e.group+(selectedEdgeId===e.pairId?' selected':'')+contextClass+'" data-relation-id="'+esc(e.pairId)+'" style="left:'+lp.x+'px;top:'+lp.y+'px" onclick="F1RelationshipTree.openEdgeEditor(\''+jsArg(e.pairId)+'\')" ondblclick="F1RelationshipTree.openEdgeEditor(\''+jsArg(e.pairId)+'\')">'+esc(edgeText(e))+'</button>');
  }
  if(connectDrag?.path)paths+='<path id="relEdgeDraft" class="rel-edge-draft" d="'+connectDrag.path+'"></path>';
  svg.innerHTML=paths;labels.innerHTML=labelHtml.join('');
}
function updateEdgeElements(e){
  const g=edgeGeometry(e);if(!g)return;
  document.querySelectorAll('[data-relation-id="'+CSS.escape(e.pairId)+'"]').forEach(el=>{
    if(el.tagName==='path'||el.tagName==='PATH')el.setAttribute('d',g.path);
  });
  const labelEl=document.querySelector('.rel-edge-label[data-relation-id="'+CSS.escape(e.pairId)+'"]');
  if(labelEl){labelEl.style.left=g.mx+'px';labelEl.style.top=g.my+'px'}
}
function renderIncidentEdges(nodeId){
  visualEdges().filter(e=>e.sourceId===nodeId||e.targetId===nodeId).forEach(updateEdgeElements);
}
function render(){
  if(!document.getElementById('relationshipNodes'))return;
  ensurePositions();renderGroups();renderNodes();renderEdges();applyTransform();compactDrawer();
}
function applyTransform(){
  const stage=document.getElementById('relationshipTreeStage');
  if(stage)stage.style.transform='translate('+panX+'px,'+panY+'px) scale('+scale+')';
}
function fit(){
  ensurePositions();
  const v=document.getElementById('relationshipTreeViewport');if(!v)return;
  const shown=people().filter(p=>!hiddenIds().has(p.id));
  if(!shown.length)return;
  const ps=positions(),xs=shown.map(p=>ps[p.id].x),ys=shown.map(p=>ps[p.id].y);
  const minX=Math.min(...xs),maxX=Math.max(...xs)+NODE_W,minY=Math.min(...ys),maxY=Math.max(...ys)+NODE_H;
  const w=Math.max(320,maxX-minX),h=Math.max(220,maxY-minY);
  scale=Math.max(.38,Math.min(1,Math.min((v.clientWidth-40)/w,(v.clientHeight-40)/h)));
  panX=(v.clientWidth-w*scale)/2-minX*scale;
  panY=(v.clientHeight-h*scale)/2-minY*scale;
  applyTransform();
}
function zoomBy(delta){
  scale=Math.max(.35,Math.min(1.5,scale+delta));applyTransform();
}
function center(id){
  selectedId=id||selectedId||'root';
  const v=document.getElementById('relationshipTreeViewport'),p=positions()[selectedId];if(!v||!p)return;
  panX=v.clientWidth/2-(p.x+NODE_W/2)*scale;
  panY=v.clientHeight/2-(p.y+NODE_H/2)*scale;
  applyTransform();renderNodes();renderEdges();
}
function select(id,doCenter=true,evt=null){
  if(evt&&Date.now()<suppressClickUntil)return;
  id=id||'root';
  const additive=!!(evt&&(evt.ctrlKey||evt.metaKey||evt.shiftKey));
  if(additive){
    if(selectedIds.has(id)&&selectedIds.size>1)selectedIds.delete(id);else selectedIds.add(id);
  }else{selectedIds.clear();selectedIds.add(id)}
  selectedId=id;openMenuId='';
  renderNodes();renderEdges();if(doCenter)center(selectedId);
}
function toggle(id){if(collapsed.has(id))collapsed.delete(id);else collapsed.add(id);saveCollapsed();render()}
function toggleNodeMenu(id){openMenuId=openMenuId===id?'':id;renderNodes()}
function togglePin(id){
  const p=positions()[id];if(!p)return;
  p.pinned=!p.pinned;p.manual=true;openMenuId='';
  persistGraph();renderNodes();
  try{toast(p.pinned?'Posizione fissata':'Posizione sbloccata')}catch(_){}
}
function createGroup(name=''){
  let value=String(name||'').trim();
  if(!value)value=String(prompt('Nome del nuovo gruppo (es. FAMIGLIA, AMICI, LAVORO)')||'').trim();
  if(!value)return '';
  const existing=groups().find(g=>String(g.name||'').toLocaleUpperCase('it-IT')===value.toLocaleUpperCase('it-IT'));
  if(existing)return existing.id;
  const id=newId('group'),root=positions().root||{x:520,y:220};
  groups().push({id,name:value.toLocaleUpperCase('it-IT'),collapsed:false,x:root.x+120,y:root.y+120,colorKey:'default'});
  persistGraph();render();return id;
}
function assignGroup(id,groupId){
  const p=positions()[id];if(!p)return;
  p.groupId=groupId&&groupById(groupId)?groupId:null;p.manual=true;openMenuId='';
  persistGraph();render();
}
function assignGroupPrompt(id){
  const list=groups().map(g=>g.name).join(', ');
  const value=String(prompt('Sposta in gruppo. Scrivi il nome del gruppo oppure lascia vuoto per rimuoverlo.'+(list?'\nGruppi: '+list:''))||'').trim();
  const ids=selectedIds.has(id)&&selectedIds.size>1?[...selectedIds]:[id];
  if(!value){
    ids.forEach(x=>{const p=positions()[x];if(p){p.groupId=null;p.manual=true}});
    openMenuId='';persistGraph();render();return;
  }
  let g=groups().find(x=>String(x.name||'').toLocaleUpperCase('it-IT')===value.toLocaleUpperCase('it-IT'));
  if(!g){const gid=createGroup(value);g=groupById(gid)}
  if(g){
    ids.forEach(x=>{const p=positions()[x];if(p){p.groupId=g.id;p.manual=true}});
    openMenuId='';persistGraph();render();
  }
}
function toggleGroupCollapse(id){const g=groupById(id);if(!g)return;g.collapsed=!g.collapsed;persistGraph();render()}
function canvasPoint(clientX,clientY){
  const v=document.getElementById('relationshipTreeViewport');if(!v)return{x:0,y:0};
  const r=v.getBoundingClientRect();
  return{x:(clientX-r.left-panX)/scale,y:(clientY-r.top-panY)/scale};
}
function hideGuides(){
  ['relGuideX','relGuideY'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'});
}
function updateGuides(id,pos){
  const ps=positions(),others=people().filter(p=>p.id!==id&&ps[p.id]&&!hiddenIds().has(p.id));
  const vx=others.find(p=>Math.abs(ps[p.id].x-pos.x)<=8),hy=others.find(p=>Math.abs(ps[p.id].y-pos.y)<=8);
  const gx=document.getElementById('relGuideX'),gy=document.getElementById('relGuideY');
  if(gx){if(vx){gx.style.display='block';gx.style.left=ps[vx.id].x+'px'}else gx.style.display='none'}
  if(gy){if(hy){gy.style.display='block';gy.style.top=ps[hy.id].y+'px'}else gy.style.display='none'}
}
function markGroupDrop(id){
  document.querySelectorAll('.rel-group-box').forEach(el=>el.classList.toggle('drop-active',!!id&&el.dataset.groupId===id));
}
function groupAt(x,y){
  for(const [id,r] of groupRects){if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return id}
  return '';
}
function polishDrop(id,pos){
  let out=clampPosition({...pos,x:Math.round(pos.x/SNAP)*SNAP,y:Math.round(pos.y/SNAP)*SNAP});
  for(let i=0;i<8;i++){
    const hit=people().some(p=>p.id!==id&&positions()[p.id]&&Math.abs(positions()[p.id].x-out.x)<18&&Math.abs(positions()[p.id].y-out.y)<18);
    if(!hit)break;
    out=clampPosition({...out,x:out.x+20,y:out.y+20});
  }
  return out;
}
function renderIncidentEdgesMany(ids){
  const set=new Set(ids),done=new Set();
  visualEdges().filter(e=>set.has(e.sourceId)||set.has(e.targetId)).forEach(e=>{if(done.has(e.pairId))return;done.add(e.pairId);updateEdgeElements(e)});
}
function showMoveUndo(){
  const el=document.getElementById('relationshipMoveUndo');if(!el)return;
  el.classList.add('show');clearTimeout(undoTimer);undoTimer=setTimeout(()=>el.classList.remove('show'),4500);
}
function undoMove(){
  if(!lastMove)return;
  const ps=positions();
  Object.entries(lastMove.positions||{}).forEach(([id,p])=>{ps[id]={...p}});
  (lastMove.groups||[]).forEach(old=>{const g=groupById(old.id);if(g)Object.assign(g,old)});
  lastMove=null;persistGraph();render();document.getElementById('relationshipMoveUndo')?.classList.remove('show');
}
function reorder(force=false){
  if(!force&&!confirm('Riordinare automaticamente solo le schede non fissate?'))return;
  const ps=positions(),movable=people().filter(p=>p.id!=='root'&&!ps[p.id]?.pinned);
  if(!movable.length)return;
  lastMove={positions:Object.fromEntries(movable.map(p=>[p.id,{...ps[p.id]}])),groups:[]};
  const groupIds=new Map(movable.map(p=>[p.id,ps[p.id]?.groupId||null]));
  movable.forEach(p=>delete ps[p.id]);
  const root=ps.root||{x:520,y:220};
  movable.forEach((p,i)=>{
    const candidate={x:root.x+220+(i%5)*190,y:Math.max(60,root.y-180)+Math.floor(i/5)*130};
    const free=findFree(candidate,p.id);
    ps[p.id]={...free,manual:false,pinned:false,groupId:groupIds.get(p.id)||null};
  });
  selectedIds.clear();selectedIds.add('root');selectedId='root';persistGraph();render();showMoveUndo();
}
function nodeKey(e,id){
  if(e.key==='Enter'){e.preventDefault();openPersonCard(id);return}
  if((e.key==='+'||e.key==='=')){e.preventDefault();openPicker(id);return}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();
  if(!selectedIds.has(id)){selectedIds.clear();selectedIds.add(id);selectedId=id}
  const ids=[...selectedIds],before=Object.fromEntries(ids.filter(x=>positions()[x]).map(x=>[x,{...positions()[x]}])),step=e.shiftKey?30:10;
  ids.forEach(x=>{
    const p=positions()[x];if(!p)return;
    const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
    positions()[x]=clampPosition({...p,x:p.x+dx,y:p.y+dy,manual:true});
  });
  lastMove={positions:before,groups:[]};persistGraph();render();showMoveUndo();
}
function startNodeDrag(e,id){
  if((e.button!==0&&e.pointerType!=='touch')||e.target.closest('button,a,input,select,textarea'))return;
  const pos=positions()[id];if(!pos)return;
  e.preventDefault();e.stopPropagation();openMenuId='';
  if(!selectedIds.has(id)){
    if(e.ctrlKey||e.metaKey||e.shiftKey)selectedIds.add(id);
    else{selectedIds.clear();selectedIds.add(id)}
  }
  selectedId=id;
  const ids=[...selectedIds].filter(x=>positions()[x]);
  nodeDrag={id,ids,startX:e.clientX,startY:e.clientY,moved:false,before:Object.fromEntries(ids.map(x=>[x,{...positions()[x]}]))};
  document.querySelectorAll('.rel-graph-node.multi-selected').forEach(n=>n.classList.add('dragging'));
  document.querySelector('[data-person-id="'+CSS.escape(id)+'"]')?.classList.add('dragging');
  window.addEventListener('pointermove',nodeMove);window.addEventListener('pointerup',nodeUp,{once:true});
}
function nodeMove(e){
  if(!nodeDrag)return;
  const clientDx=e.clientX-nodeDrag.startX,clientDy=e.clientY-nodeDrag.startY;
  if(!nodeDrag.moved&&Math.hypot(clientDx,clientDy)<DRAG_THRESHOLD)return;
  nodeDrag.moved=true;
  const dx=clientDx/scale,dy=clientDy/scale;
  nodeDrag.ids.forEach(id=>{
    const base=nodeDrag.before[id];if(!base)return;
    const pos=clampPosition({...base,x:base.x+dx,y:base.y+dy});
    positions()[id]=pos;
    const node=document.querySelector('[data-person-id="'+CSS.escape(id)+'"]');
    if(node){node.style.left=pos.x+'px';node.style.top=pos.y+'px'}
  });
  const primary=positions()[nodeDrag.id];if(primary){
    updateGuides(nodeDrag.id,primary);
    nodeDrag.overGroupId=groupAt(primary.x+NODE_W/2,primary.y+NODE_H/2);
    markGroupDrop(nodeDrag.overGroupId);
  }
  renderIncidentEdgesMany(nodeDrag.ids);
}
function nodeUp(){
  if(!nodeDrag)return;
  document.querySelectorAll('.rel-graph-node.dragging').forEach(n=>n.classList.remove('dragging'));hideGuides();markGroupDrop('');
  if(nodeDrag.moved){
    nodeDrag.ids.forEach(id=>{
      const current=positions()[id];if(!current)return;
      positions()[id]={...polishDrop(id,current),manual:true,pinned:!!current.pinned,groupId:current.groupId||null};
      const node=document.querySelector('[data-person-id="'+CSS.escape(id)+'"]');if(node){node.style.left=positions()[id].x+'px';node.style.top=positions()[id].y+'px'}
    });
    if(nodeDrag.overGroupId){
      nodeDrag.ids.forEach(id=>{const p=positions()[id];if(p)p.groupId=nodeDrag.overGroupId});
    }
    lastMove={positions:nodeDrag.before,groups:[]};suppressClickUntil=Date.now()+120;
    render();persistGraph();showMoveUndo();
  }
  nodeDrag=null;window.removeEventListener('pointermove',nodeMove);
}
function startGroupDrag(e,id){
  if(e.button!==0&&e.pointerType!=='touch')return;
  const g=groupById(id),members=groupMembers(id);if(!g||!members.length)return;
  e.preventDefault();e.stopPropagation();
  const ids=members.map(p=>p.id),before=Object.fromEntries(ids.map(x=>[x,{...positions()[x]}]));
  groupDrag={id,ids,startX:e.clientX,startY:e.clientY,moved:false,before,groupBefore:{...g}};
  window.addEventListener('pointermove',groupMove);window.addEventListener('pointerup',groupUp,{once:true});
}
function groupMove(e){
  if(!groupDrag)return;
  const cx=e.clientX-groupDrag.startX,cy=e.clientY-groupDrag.startY;
  if(!groupDrag.moved&&Math.hypot(cx,cy)<DRAG_THRESHOLD)return;
  groupDrag.moved=true;const dx=cx/scale,dy=cy/scale;
  groupDrag.ids.forEach(id=>{
    const base=groupDrag.before[id];positions()[id]=clampPosition({...base,x:base.x+dx,y:base.y+dy});
    const node=document.querySelector('[data-person-id="'+CSS.escape(id)+'"]');if(node){node.style.left=positions()[id].x+'px';node.style.top=positions()[id].y+'px'}
  });
  const g=groupById(groupDrag.id);if(g){g.x=(Number(groupDrag.groupBefore.x)||0)+dx;g.y=(Number(groupDrag.groupBefore.y)||0)+dy}
  renderGroups();renderIncidentEdgesMany(groupDrag.ids);
}
function groupUp(){
  if(!groupDrag)return;
  if(groupDrag.moved){
    groupDrag.ids.forEach(id=>{const p=positions()[id];if(p)p.manual=true});
    lastMove={positions:groupDrag.before,groups:[groupDrag.groupBefore]};persistGraph();render();showMoveUndo();
  }
  groupDrag=null;window.removeEventListener('pointermove',groupMove);
}
function startCanvasPan(e){
  if(e.button!==0||e.target.closest('.rel-graph-node,.rel-edge-label,.rel-edge-hit'))return;
  canvasDrag={x:e.clientX,y:e.clientY,panX,panY};document.getElementById('relationshipTreeViewport')?.classList.add('dragging');
  window.addEventListener('pointermove',canvasMove);window.addEventListener('pointerup',canvasUp,{once:true});
}
function canvasMove(e){if(!canvasDrag)return;panX=canvasDrag.panX+(e.clientX-canvasDrag.x);panY=canvasDrag.panY+(e.clientY-canvasDrag.y);applyTransform()}
function canvasUp(){canvasDrag=null;document.getElementById('relationshipTreeViewport')?.classList.remove('dragging');window.removeEventListener('pointermove',canvasMove)}
function startConnect(e,id){
  if(e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  const p=positions()[id];if(!p)return;
  connectDrag={sourceId:id,start:{x:p.x+NODE_W,y:p.y+NODE_H/2},path:''};
  window.addEventListener('pointermove',connectMove);window.addEventListener('pointerup',connectUp,{once:true});
}
function connectMove(e){
  if(!connectDrag)return;
  const q=canvasPoint(e.clientX,e.clientY),s=connectDrag.start;
  const mx=(s.x+q.x)/2;
  connectDrag.path='M '+s.x+' '+s.y+' C '+mx+' '+s.y+', '+mx+' '+q.y+', '+q.x+' '+q.y;
  renderEdges();
}
function connectUp(e){
  if(!connectDrag)return;
  const src=connectDrag.sourceId,targetEl=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.rel-graph-node');
  const target=targetEl?.dataset?.personId||'';
  connectDrag=null;window.removeEventListener('pointermove',connectMove);renderEdges();
  if(target&&target!==src)openPicker(src,'','',target);
}
function typeOptions(value=''){
  return ALL_TYPES.map(t=>'<option value="'+t.id+'" '+(t.id===value?'selected':'')+'>'+t.label+'</option>').join('');
}
function populateTypeButtons(){
  const box=document.getElementById('relationTypeGrid');if(!box)return;
  box.innerHTML=RELATION_TYPES.map(x=>'<button type="button" data-rel-type="'+x.id+'" onclick="F1RelationshipTree.chooseType(\''+x.id+'\')">'+x.label+'</button>').join('');
}
function openPicker(id,preset='',question='',targetId=''){
  sourceId=id||'root';linkTargetId=targetId||'';relationType='';relationQuestion=question||'';
  const src=person(sourceId),target=person(linkTargetId);
  document.getElementById('relationSourceName').textContent=src?fullName(src):'IO';
  document.getElementById('relationContextQuestion').textContent=target?('CHE RELAZIONE HA '+fullName(src)+' CON '+fullName(target)+'?'):(relationQuestion||'Scegli il tipo di relazione e aggiungi o collega una persona.');
  ['relName','relSurname','relPhone','relCustomLabel'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  document.getElementById('relationExisting').innerHTML='';
  document.getElementById('relationForm').classList.remove('open');
  document.getElementById('relCustomRow').style.display='none';
  document.getElementById('relationNewPersonFields').style.display=target?'none':'block';
  const lock=document.getElementById('relationExistingTarget');
  lock.classList.toggle('show',!!target);
  lock.textContent=target?('COLLEGA PERSONA ESISTENTE: '+fullName(target)):'';
  document.getElementById('relationSaveButton').textContent=target?'COLLEGA':'SALVA E CREA RAMO';
  populateTypeButtons();document.getElementById('relationModal')?.classList.add('open');
  if(preset)chooseType(preset);
}
function closePicker(){document.getElementById('relationModal')?.classList.remove('open');sourceId='root';linkTargetId='';relationType='';relationQuestion=''}
function chooseType(type){
  relationType=type;
  document.querySelectorAll('#relationTypeGrid [data-rel-type]').forEach(b=>b.classList.toggle('active',b.dataset.relType===type));
  document.getElementById('relationForm')?.classList.add('open');
  document.getElementById('relationTypeLabel').textContent=label(type);
  document.getElementById('relCustomRow').style.display=type==='altro'?'block':'none';
  if(!linkTargetId){renderExistingMatches();setTimeout(()=>document.getElementById('relName')?.focus(),40)}
}
function searchText(){return [document.getElementById('relName')?.value,document.getElementById('relSurname')?.value].filter(Boolean).join(' ').trim().toLocaleUpperCase('it-IT')}
function renderExistingMatches(){
  const box=document.getElementById('relationExisting');if(!box||linkTargetId)return;
  const q=searchText();if(q.length<2){box.innerHTML='';return}
  const candidates=people().filter(p=>p.id!=='root'&&p.id!==sourceId&&fullName(p).includes(q)).slice(0,6);
  box.innerHTML=candidates.length?'<div class="tip"><b>PERSONA GIÀ PRESENTE?</b> Collegala senza duplicarla.</div>'+
    candidates.map(p=>'<button type="button" onclick="F1RelationshipTree.linkExisting(\''+jsArg(p.id)+'\')"><b>'+esc(fullName(p))+'</b><span>'+esc([p.town,phoneDisplay(p.phone)].filter(Boolean).join(' · ')||'Scheda esistente')+' · COLLEGA</span></button>').join(''):'';
}
function createQuick(){
  if(!relationType){try{toast('Scegli la relazione')}catch(_){}return}
  const custom=relationType==='altro'?String(document.getElementById('relCustomLabel')?.value||'').trim().toLocaleUpperCase('it-IT'):'';
  if(relationType==='altro'&&!custom){try{toast('Scrivi il tipo di relazione')}catch(_){}return}
  if(linkTargetId){finalize(sourceId,linkTargetId,relationType,false,custom);return}
  const name=String(document.getElementById('relName')?.value||'').trim(),surname=String(document.getElementById('relSurname')?.value||'').trim(),phone=String(document.getElementById('relPhone')?.value||'').trim();
  if(!name){try{toast('Inserisci il nome')}catch(_){}return}
  const wanted=[name,surname].filter(Boolean).join(' ').toLocaleUpperCase('it-IT');
  const exact=people().find(p=>p.id!=='root'&&fullName(p)===wanted);
  if(exact){renderExistingMatches();try{toast('Persona già presente: usa COLLEGA')}catch(_){}return}
  const now=new Date().toISOString();
  const p={id:newId('p'),parentId:sourceId||'root',name:name.toLocaleUpperCase('it-IT'),surname:surname.toLocaleUpperCase('it-IT'),phone,email:'',category:categoryFor(relationType),source:'',stage:'Nome',town:'',notes:relationQuestion?('Origine ramo: '+relationQuestion):'',influence:false,firstContact:'',lastContact:'',nextContact:'',touchpointHistory:{},socialSearchHistory:{},lifeTriggers:[],lifeTriggerHistory:[],lifeTriggerStatus:{},lifeTriggerNews:{},periodContexts:[],places:[],memories:[],schools:[],companies:[],contextTags:[],createdAt:now,updatedAt:now,contactDates:[]};
  db.people.push(p);placeNew(p.id,sourceId,relationType);finalize(sourceId,p.id,relationType,true,custom);
}
function linkExisting(targetId){if(!relationType){try{toast('Scegli la relazione')}catch(_){}return}finalize(sourceId,targetId,relationType,false,relationType==='altro'?String(document.getElementById('relCustomLabel')?.value||'').trim().toLocaleUpperCase('it-IT'):'')}
function finalize(a,b,type,isNew,custom=''){
  const src=person(a),target=person(b);if(!src||!target)return;
  const inv=inverseFor(type,src,target),pairId=addPair(a,b,type,custom,inv,'');
  applyHierarchy(a,b,type,isNew);
  if(!positions()[b])placeNew(b,a,type);
  const now=new Date().toISOString();src.updatedAt=now;target.updatedAt=now;
  persistGraph();closePicker();selectedId=b;selectedEdgeId=pairId||'';render();center(b);
  try{toast(fullName(target)+' collegato come '+label(type,custom))}catch(_){}
}
function openEdgeEditor(pairId){
  const e=visualEdges().find(x=>x.pairId===pairId);if(!e)return;
  selectedEdgeId=pairId;renderEdges();
  document.getElementById('edgeEditorPairId').value=pairId;
  document.getElementById('edgeEditorFrom').textContent=fullName(person(e.sourceId));
  document.getElementById('edgeEditorTo').textContent=fullName(person(e.targetId));
  const type=document.getElementById('edgeEditorType'),inv=document.getElementById('edgeEditorInverse');
  type.innerHTML=typeOptions(e.type);inv.innerHTML=typeOptions(e.inverseType);
  document.getElementById('edgeEditorCustom').value=e.customLabel||'';
  document.getElementById('edgeEditorInverseCustom').value=e.inverseCustomLabel||'';
  syncEdgeCustomRows();document.getElementById('edgeEditorModal')?.classList.add('open');
}
function syncEdgeCustomRows(){
  const t=document.getElementById('edgeEditorType')?.value,i=document.getElementById('edgeEditorInverse')?.value;
  document.getElementById('edgeEditorCustomRow').style.display=t==='altro'?'block':'none';
  document.getElementById('edgeEditorInverseCustomRow').style.display=i==='altro'?'block':'none';
}
function previewEdgeInverse(){
  const t=document.getElementById('edgeEditorType')?.value,e=visualEdges().find(x=>x.pairId===document.getElementById('edgeEditorPairId')?.value);
  if(!t||!e)return;
  document.getElementById('edgeEditorInverse').value=inverseFor(t,person(e.sourceId),person(e.targetId));
  syncEdgeCustomRows();
}
function closeEdgeEditor(){document.getElementById('edgeEditorModal')?.classList.remove('open');selectedEdgeId='';renderEdges()}
function saveEdge(){
  const pairId=document.getElementById('edgeEditorPairId')?.value,e=visualEdges().find(x=>x.pairId===pairId);if(!e)return;
  const type=document.getElementById('edgeEditorType').value,inv=document.getElementById('edgeEditorInverse').value;
  const custom=type==='altro'?String(document.getElementById('edgeEditorCustom').value||'').trim().toLocaleUpperCase('it-IT'):'';
  const invCustom=inv==='altro'?String(document.getElementById('edgeEditorInverseCustom').value||'').trim().toLocaleUpperCase('it-IT'):'';
  if(type==='altro'&&!custom){try{toast('Inserisci l’etichetta personalizzata')}catch(_){}return}
  const now=new Date().toISOString(),all=relations();
  const belongs=r=>(r.pairId||('legacy:'+relationKey(r.sourceId,r.targetId)))===pairId;
  const oldRows=all.filter(belongs),oldForward=oldRows.find(r=>r.pairRole==='forward')||e.forward||oldRows[0],oldReverse=oldRows.find(r=>r.pairRole==='reverse')||e.reverse||oldRows.find(r=>r!==oldForward);
  db.relations=all.filter(r=>!belongs(r));
  db.relations.push({
    id:oldForward?.id||newId('rel'),pairId,pairRole:'forward',
    sourceId:e.sourceId,targetId:e.targetId,type,inverseType:inv,
    customLabel:custom,inverseCustomLabel:invCustom,
    periodId:oldForward?.periodId||'',context:oldForward?.context||'quick_relationship',
    createdAt:oldForward?.createdAt||now,updatedAt:now
  });
  db.relations.push({
    id:oldReverse?.id||newId('rel'),pairId,pairRole:'reverse',
    sourceId:e.targetId,targetId:e.sourceId,type:inv,inverseType:type,
    customLabel:invCustom,inverseCustomLabel:custom,
    periodId:oldReverse?.periodId||'',context:oldReverse?.context||'quick_relationship',
    createdAt:oldReverse?.createdAt||now,updatedAt:now
  });
  persistGraph();closeEdgeEditor();render();
  try{toast('Relazione aggiornata')}catch(_){}
}
function deleteEdge(){
  const pairId=document.getElementById('edgeEditorPairId')?.value;if(!pairId)return;
  if(!confirm('Eliminare solo questa relazione? Le persone resteranno salvate.'))return;
  db.relations=relations().filter(r=>(r.pairId||('legacy:'+relationKey(r.sourceId,r.targetId)))!==pairId);
  persistGraph();closeEdgeEditor();render();
  try{toast('Relazione eliminata. Le persone sono rimaste nel database.')}catch(_){}
}
function editRelationByRow(relationId){
  const r=relations().find(x=>x.id===relationId);if(!r)return;
  const key=r.pairId||('legacy:'+relationKey(r.sourceId,r.targetId));openEdgeEditor(key);
}
function openPersonCard(id){selectedId=id;renderNodes();renderEdges();try{openPerson(id)}catch(_){}}
function openWhatsApp(id){
  const p=person(id);if(!p)return;
  const num=normalizePhone(p.phone);if(!num){try{toast('Inserisci prima il numero WhatsApp')}catch(_){}return}
  window.open('https://wa.me/'+num,'_blank','noopener');
  pendingMessage={personId:id,eventId:newId('wa'),openedAt:new Date().toISOString()};
  document.getElementById('waConfirmName').textContent=fullName(p);document.getElementById('waConfirmBar')?.classList.add('open');
}
async function confirmWhatsAppSent(){
  const x=pendingMessage;if(!x)return;const p=person(x.personId);if(!p)return;
  const btn=document.getElementById('waConfirmButton');if(btn)btn.disabled=true;
  try{
    await window.F1ContactOutreach?.record?.({channel:'MESSAGE',sourceEventId:'tree-whatsapp:'+x.eventId,contactRef:p.id,source:'fonti-tree-whatsapp',displayName:fullName(p),occurredAt:new Date().toISOString(),metadata:{confirmed_by_user:true}});
    closeWhatsAppConfirm();try{toast('Messaggio WhatsApp registrato')}catch(_){}
  }catch(e){try{toast('Messaggio non registrato: '+(e.message||e))}catch(_){}}finally{if(btn)btn.disabled=false}
}
function closeWhatsAppConfirm(){pendingMessage=null;document.getElementById('waConfirmBar')?.classList.remove('open')}
function afterPersonSaved(id,isNew){
  selectedId=id;
  if(!positions()[id])placeNew(id,'root','altro');
  render();
  if(isNew){
    document.getElementById('drawer')?.classList.remove('open');
    setTimeout(()=>{center(id);openPicker(id)},90);
  }
}
function promptRelations(id){openPicker(id||selectedId)}
function openExpand(id){
  expandSourceId=id||selectedId||'root';const p=person(expandSourceId);
  document.getElementById('expandNetworkName').textContent=p?fullName(p):'IO';
  document.getElementById('expandQuestionGrid').innerHTML=EXPAND_QUESTIONS.map((q,i)=>'<button type="button" onclick="F1RelationshipTree.useExpandQuestion('+i+')">'+esc(q)+'</button>').join('');
  document.getElementById('expandNetworkModal')?.classList.add('open');
}
function closeExpand(){document.getElementById('expandNetworkModal')?.classList.remove('open')}
function useExpandQuestion(i){const q=EXPAND_QUESTIONS[i]||EXPAND_QUESTIONS[0];closeExpand();openPicker(expandSourceId,'altro',q)}
function openCurrentRelation(){let id='';try{id=ensureCurrentPersonSaved()}catch(_){id=document.getElementById('personId')?.value||''}if(id)openPicker(id)}
function openCurrentExpand(){let id='';try{id=ensureCurrentPersonSaved()}catch(_){id=document.getElementById('personId')?.value||''}if(id)openExpand(id)}
function openCurrentWhatsApp(){
  const id=document.getElementById('personId')?.value;if(id&&id!=='draft')return openWhatsApp(id);
  const num=normalizePhone(document.getElementById('pPhone')?.value);if(!num){try{toast('Inserisci prima il numero WhatsApp')}catch(_){}return}
  window.open('https://wa.me/'+num,'_blank','noopener');
}
function labelForRelation(r,pId){
  const e=visualEdges().find(x=>x.pairId===(r.pairId||('legacy:'+relationKey(r.sourceId,r.targetId))));
  return e?perspectiveLabel(e,pId):relationshipLabel(r);
}
function wrapCompact(selector,title,open=false){
  const el=document.querySelector(selector);if(!el||el.closest('details.compact-section'))return;
  const d=document.createElement('details');d.className='compact-section';d.open=!!open;
  const s=document.createElement('summary');s.textContent=title;const body=document.createElement('div');body.className='compact-section-body';
  el.parentNode.insertBefore(d,el);d.appendChild(s);d.appendChild(body);body.appendChild(el);
}
function compactDrawer(){
  const notes=document.getElementById('pNotes')?.closest('.field');
  if(notes&&!document.querySelector('.drawer-quick-actions')){
    const a=document.createElement('div');a.className='drawer-quick-actions';
    a.innerHTML='<button type="button" class="wa" onclick="F1RelationshipTree.openCurrentWhatsApp()">WHATSAPP</button><button type="button" class="add" onclick="F1RelationshipTree.openCurrentRelation()">+ PERSONA COLLEGATA</button>';
    notes.insertAdjacentElement('afterend',a);
  }
  wrapCompact('.context-box','RELAZIONE / CONTESTO',false);wrapCompact('#lifeTriggerBox','TRIGGER DI CAMBIAMENTO DI VITA',false);wrapCompact('#socialSearchBox','RICERCA SOCIAL',false);wrapCompact('#touchpointBox','PROSSIMO RICONTATTO · 20 TOUCH POINT',false);wrapCompact('.official-box','FUNZIONARIO NOTIZIE',false);wrapCompact('.investigator-box','PIANO INVESTIGATIVO',false);
  const prompt=document.querySelector('.prompt-box');
  if(prompt&&!prompt.dataset.compacted){prompt.dataset.compacted='1';prompt.innerHTML='<div class="compact-network-actions"><button type="button" class="expand" onclick="F1RelationshipTree.openCurrentExpand()">+ ESPANDI RETE</button><button type="button" class="relation" onclick="F1RelationshipTree.openCurrentRelation()">+ RELAZIONE</button></div>'}
}
function bindViewport(){
  const v=document.getElementById('relationshipTreeViewport');if(!v||v.dataset.graphBound)return;
  v.dataset.graphBound='1';v.addEventListener('pointerdown',startCanvasPan);
  v.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoomBy(e.deltaY<0?.08:-.08)},{passive:false});
}
function boot(){
  if(booted)return;booted=true;positions();groups();populateTypeButtons();compactDrawer();bindViewport();render();setTimeout(()=>fit(),140);
}
window.F1RelationshipTree={
  render,renderEdges,fit,zoomIn:()=>zoomBy(.1),zoomOut:()=>zoomBy(-.1),center,select,toggle,nodeKey,startNodeDrag,startGroupDrag,startConnect,
  openPerson:openPersonCard,openWhatsApp,confirmWhatsAppSent,closeWhatsAppConfirm,
  openPicker,closePicker,chooseType,renderExistingMatches,createQuick,linkExisting,
  openEdgeEditor,closeEdgeEditor,previewEdgeInverse,syncEdgeCustomRows,saveEdge,deleteEdge,editRelationByRow,
  afterPersonSaved,promptRelations,openExpand,closeExpand,useExpandQuestion,
  openCurrentRelation,openCurrentExpand,openCurrentWhatsApp,labelForRelation,compactDrawer,
  toggleNodeMenu,togglePin,createGroup,assignGroup,assignGroupPrompt,toggleGroupCollapse,reorder,undoMove,
  visualEdges,positions,groups,types:RELATION_TYPES
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,0);
})();