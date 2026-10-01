(function(){
'use strict';

const WIDTH=2600,HEIGHT=1800,NODE_W=158,NODE_H=122;
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
let nodeDrag=null,canvasDrag=null,connectDrag=null,pendingMessage=null,booted=false;
const collapsed=new Set(readCollapsed());

function people(){try{return Array.isArray(db.people)?db.people:[]}catch(_){return []}}
function relations(){try{db.relations=Array.isArray(db.relations)?db.relations:[];return db.relations}catch(_){return []}}
function positions(){try{db.graphPositions=db.graphPositions&&typeof db.graphPositions==='object'?db.graphPositions:{};return db.graphPositions}catch(_){return {}}}
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
  return {x:Math.max(35,Math.min(WIDTH-NODE_W-35,Number(pos?.x)||35)),y:Math.max(35,Math.min(HEIGHT-NODE_H-35,Number(pos?.y)||35))};
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
  for(let i=0;i<80&&occupied(p.x,p.y,ignore);i++){
    p=clampPosition({x:start.x+((i%5)-2)*190,y:start.y+(Math.floor(i/5)+1)*145});
  }
  return p;
}
function ensurePositions(){
  const ps=positions();let changed=false;
  if(!ps.root){ps.root={x:520,y:110};changed=true}
  const ordered=people().filter(p=>p.id!=='root');
  ordered.forEach((p,i)=>{
    if(ps[p.id])return;
    const parent=ps[p.parentId]||ps.root;
    const col=i%5,row=Math.floor(i/5);
    ps[p.id]=findFree({x:parent.x+(col-2)*190,y:parent.y+180+row*145},p.id);
    changed=true;
  });
  if(changed)persistGraph();
}
function placeNew(targetId,srcId,type){
  const ps=positions(),src=ps[srcId]||ps.root||{x:520,y:110};
  const d=def(type);let candidate;
  if(d.spouse)candidate={x:src.x+195,y:src.y};
  else if(d.child)candidate={x:src.x+((relations().filter(r=>r.sourceId===srcId&&['figlio','figlia'].includes(r.type)).length%3)-1)*185,y:src.y+185};
  else if(d.parent)candidate={x:src.x,y:src.y-175};
  else if(groupFor(type)==='work')candidate={x:src.x+230,y:src.y+90};
  else candidate={x:src.x+210,y:src.y+145};
  ps[targetId]=findFree(candidate,targetId);
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
  return hidden;
}
function renderNodes(){
  ensurePositions();
  const holder=document.getElementById('relationshipNodes');if(!holder)return;
  const hidden=hiddenIds();
  const cards=people().filter(p=>!hidden.has(p.id)).map(p=>{
    const pos=positions()[p.id]||{x:40,y:40},phone=normalizePhone(p.phone),display=phoneDisplay(p.phone);
    const rels=incidentLabels(p.id).slice(0,2);
    const hasChildren=people().some(x=>x.parentId===p.id);
    const isRoot=p.id==='root';
    return '<article class="rel-graph-node '+(isRoot?'root ':'')+(selectedId===p.id?'selected ':'')+'" data-person-id="'+esc(p.id)+'" style="left:'+pos.x+'px;top:'+pos.y+'px" onpointerdown="F1RelationshipTree.startNodeDrag(event,\''+jsArg(p.id)+'\')" onclick="F1RelationshipTree.select(\''+jsArg(p.id)+'\',false)">'+
      '<div class="rel-node-content">'+
      '<div class="rel-node-name">'+esc(isRoot?'IO':fullName(p))+'</div>'+
      (!isRoot&&rels.length?'<div class="rel-node-rel">'+esc(rels.join(' · '))+'</div>':'')+
      '<div class="rel-node-town">'+esc(p.town||'')+'</div>'+
      (!isRoot&&display?'<button type="button" class="rel-node-phone" onclick="event.stopPropagation();F1RelationshipTree.openWhatsApp(\''+jsArg(p.id)+'\')" title="Apri WhatsApp">'+esc(display)+'</button>':'')+
      (!isRoot?'<div class="rel-node-stage">● '+esc(p.stage||'Nome')+'</div>':'')+
      '<div class="rel-node-actions">'+
      (!isRoot&&phone?'<a class="call" href="tel:+'+esc(phone)+'" onclick="event.stopPropagation()" title="Chiama">☎</a>':'<span></span>')+
      (!isRoot&&phone?'<button type="button" class="wa" onclick="event.stopPropagation();F1RelationshipTree.openWhatsApp(\''+jsArg(p.id)+'\')">WA</button>':'<span></span>')+
      (!isRoot?'<button type="button" class="open" onclick="event.stopPropagation();F1RelationshipTree.openPerson(\''+jsArg(p.id)+'\')">APRI</button>':'<span></span>')+
      '<button type="button" class="add" onclick="event.stopPropagation();F1RelationshipTree.openPicker(\''+jsArg(p.id)+'\')">+</button>'+
      '</div></div>'+
      (hasChildren?'<button type="button" class="rel-collapse" onclick="event.stopPropagation();F1RelationshipTree.toggle(\''+jsArg(p.id)+'\')">'+(collapsed.has(p.id)?'▸':'▾')+'</button>':'')+
      '<button type="button" class="rel-connect-handle" title="Trascina verso un’altra persona per collegarla" onpointerdown="event.stopPropagation();F1RelationshipTree.startConnect(event,\''+jsArg(p.id)+'\')"></button>'+
      '</article>';
  }).join('');
  holder.innerHTML=cards||'<div class="rel-tree-empty">Nessuna persona ancora inserita.</div>';
}
function edgeGeometry(e){
  const a=positions()[e.sourceId],b=positions()[e.targetId];if(!a||!b)return null;
  const ac={x:a.x+NODE_W/2,y:a.y+NODE_H/2},bc={x:b.x+NODE_W/2,y:b.y+NODE_H/2};
  const dx=bc.x-ac.x,dy=bc.y-ac.y,dist=Math.max(1,Math.hypot(dx,dy)),ux=dx/dist,uy=dy/dist;
  const ax=ac.x+ux*(NODE_W*.47),ay=ac.y+uy*(NODE_H*.42);
  const bx=bc.x-ux*(NODE_W*.47),by=bc.y-uy*(NODE_H*.42);
  const bend=Math.min(70,dist*.16),nx=-uy,ny=ux;
  const mx=(ax+bx)/2+nx*bend,my=(ay+by)/2+ny*bend;
  const c1x=ax+(mx-ax)*.68,c1y=ay+(my-ay)*.68,c2x=bx+(mx-bx)*.68,c2y=by+(my-by)*.68;
  return {path:'M '+ax+' '+ay+' C '+c1x+' '+c1y+', '+c2x+' '+c2y+', '+bx+' '+by,mx,my};
}
function renderEdges(){
  const svg=document.getElementById('relationshipEdges'),labels=document.getElementById('relationshipEdgeLabels');
  if(!svg||!labels)return;
  svg.setAttribute('viewBox','0 0 '+WIDTH+' '+HEIGHT);
  const hidden=hiddenIds(),edges=visualEdges().filter(e=>!hidden.has(e.sourceId)&&!hidden.has(e.targetId));
  let paths='<defs><marker id="relArrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="context-stroke"/></marker></defs>';
  const labelHtml=[];
  for(const e of edges){
    const g=edgeGeometry(e);if(!g)continue;
    const cls='rel-edge-path '+e.group+(selectedEdgeId===e.pairId?' selected':'');
    paths+='<path class="'+cls+'" data-relation-id="'+esc(e.pairId)+'" d="'+g.path+'" marker-start="url(#relArrow)" marker-end="url(#relArrow)"></path>';
    paths+='<path class="rel-edge-hit" data-relation-id="'+esc(e.pairId)+'" d="'+g.path+'" onclick="F1RelationshipTree.openEdgeEditor(\''+jsArg(e.pairId)+'\')"></path>';
    labelHtml.push('<button type="button" class="rel-edge-label '+e.group+(selectedEdgeId===e.pairId?' selected':'')+'" data-relation-id="'+esc(e.pairId)+'" style="left:'+g.mx+'px;top:'+g.my+'px" onclick="F1RelationshipTree.openEdgeEditor(\''+jsArg(e.pairId)+'\')" ondblclick="F1RelationshipTree.openEdgeEditor(\''+jsArg(e.pairId)+'\')">'+esc(edgeText(e))+'</button>');
  }
  if(connectDrag?.path)paths+='<path id="relEdgeDraft" class="rel-edge-draft" d="'+connectDrag.path+'"></path>';
  svg.innerHTML=paths;labels.innerHTML=labelHtml.join('');
}
function render(){
  if(!document.getElementById('relationshipNodes'))return;
  ensurePositions();renderNodes();renderEdges();applyTransform();compactDrawer();
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
  scale=Math.max(.38,Math.min(1.08,Math.min((v.clientWidth-40)/w,(v.clientHeight-40)/h)));
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
function select(id,doCenter=true){selectedId=id||'root';renderNodes();renderEdges();if(doCenter)center(selectedId)}
function toggle(id){if(collapsed.has(id))collapsed.delete(id);else collapsed.add(id);saveCollapsed();render()}
function canvasPoint(clientX,clientY){
  const v=document.getElementById('relationshipTreeViewport');if(!v)return{x:0,y:0};
  const r=v.getBoundingClientRect();
  return{x:(clientX-r.left-panX)/scale,y:(clientY-r.top-panY)/scale};
}
function startNodeDrag(e,id){
  if(e.button!==0||e.target.closest('button,a,input,select,textarea'))return;
  const pos=positions()[id];if(!pos)return;
  e.preventDefault();e.stopPropagation();selectedId=id;
  nodeDrag={id,startX:e.clientX,startY:e.clientY,x:pos.x,y:pos.y,moved:false};
  const node=document.querySelector('[data-person-id="'+CSS.escape(id)+'"]');node?.classList.add('dragging');
  window.addEventListener('pointermove',nodeMove);window.addEventListener('pointerup',nodeUp,{once:true});
}
function nodeMove(e){
  if(!nodeDrag)return;
  const dx=(e.clientX-nodeDrag.startX)/scale,dy=(e.clientY-nodeDrag.startY)/scale;
  if(Math.abs(dx)+Math.abs(dy)>3)nodeDrag.moved=true;
  const pos=clampPosition({x:nodeDrag.x+dx,y:nodeDrag.y+dy});positions()[nodeDrag.id]=pos;
  const node=document.querySelector('[data-person-id="'+CSS.escape(nodeDrag.id)+'"]');
  if(node){node.style.left=pos.x+'px';node.style.top=pos.y+'px'}
  renderEdges();
}
function nodeUp(){
  if(!nodeDrag)return;
  document.querySelector('[data-person-id="'+CSS.escape(nodeDrag.id)+'"]')?.classList.remove('dragging');
  if(nodeDrag.moved)persistGraph();
  nodeDrag=null;window.removeEventListener('pointermove',nodeMove);
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
  const rows=relations().filter(r=>(r.pairId||('legacy:'+relationKey(r.sourceId,r.targetId)))===pairId);
  let forward=rows.find(r=>r.pairRole==='forward')||rows.find(r=>r.sourceId===e.sourceId&&r.targetId===e.targetId)||rows[0];
  let reverse=rows.find(r=>r!==forward&&r.sourceId===e.targetId&&r.targetId===e.sourceId);
  const now=new Date().toISOString();
  if(forward){Object.assign(forward,{pairId,pairRole:'forward',type,inverseType:inv,customLabel:custom,inverseCustomLabel:invCustom,updatedAt:now,context:'quick_relationship'})}
  if(reverse){Object.assign(reverse,{pairId,pairRole:'reverse',type:inv,inverseType:type,customLabel:invCustom,inverseCustomLabel:custom,updatedAt:now,context:'quick_relationship'})}
  else relations().push({id:newId('rel'),pairId,pairRole:'reverse',sourceId:e.targetId,targetId:e.sourceId,type:inv,inverseType:type,customLabel:invCustom,inverseCustomLabel:custom,periodId:'',context:'quick_relationship',createdAt:now,updatedAt:now});
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
function afterPersonSaved(id,isNew){selectedId=id;if(!positions()[id])placeNew(id,'root','altro');render();if(isNew)setTimeout(()=>openPicker(id),120)}
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
  if(booted)return;booted=true;positions();populateTypeButtons();compactDrawer();bindViewport();render();setTimeout(()=>fit(),140);
}
window.F1RelationshipTree={
  render,renderEdges,fit,zoomIn:()=>zoomBy(.1),zoomOut:()=>zoomBy(-.1),center,select,toggle,startNodeDrag,startConnect,
  openPerson:openPersonCard,openWhatsApp,confirmWhatsAppSent,closeWhatsAppConfirm,
  openPicker,closePicker,chooseType,renderExistingMatches,createQuick,linkExisting,
  openEdgeEditor,closeEdgeEditor,previewEdgeInverse,saveEdge,deleteEdge,editRelationByRow,
  afterPersonSaved,promptRelations,openExpand,closeExpand,useExpandQuestion,
  openCurrentRelation,openCurrentExpand,openCurrentWhatsApp,labelForRelation,compactDrawer,
  visualEdges,positions,types:RELATION_TYPES
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,0);
})();