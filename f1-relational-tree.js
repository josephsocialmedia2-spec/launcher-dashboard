(function(){
'use strict';

const RELATION_TYPES=[
  {id:'marito',label:'MARITO',inverse:'moglie',family:true,spouse:true},
  {id:'moglie',label:'MOGLIE',inverse:'marito',family:true,spouse:true},
  {id:'compagno',label:'COMPAGNO',inverse:'compagna',family:true,spouse:true},
  {id:'compagna',label:'COMPAGNA',inverse:'compagno',family:true,spouse:true},
  {id:'figlio',label:'FIGLIO',inverse:'genitore',family:true,child:true},
  {id:'figlia',label:'FIGLIA',inverse:'genitore',family:true,child:true},
  {id:'padre',label:'PADRE',inverse:'figlio_a',family:true,parent:true},
  {id:'madre',label:'MADRE',inverse:'figlio_a',family:true,parent:true},
  {id:'fratello',label:'FRATELLO',inverse:'fratello_sorella',family:true,sibling:true},
  {id:'sorella',label:'SORELLA',inverse:'fratello_sorella',family:true,sibling:true},
  {id:'amico',label:'AMICO',inverse:'amico_a'},
  {id:'amica',label:'AMICA',inverse:'amico_a'},
  {id:'collega',label:'COLLEGA',inverse:'collega'},
  {id:'conoscente',label:'CONOSCENTE',inverse:'conoscente'},
  {id:'vicino',label:'VICINO/A',inverse:'vicino'},
  {id:'professionista',label:'PROFESSIONISTA',inverse:'contatto'},
  {id:'altro',label:'ALTRO',inverse:'collegato'}
];
const TYPE_MAP=new Map(RELATION_TYPES.map(x=>[x.id,x]));
const SPOUSE_TYPES=new Set(RELATION_TYPES.filter(x=>x.spouse).map(x=>x.id));
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

let sourceId='root',relationType='',relationQuestion='',expandSourceId='root';
let selectedId='root',scale=.82,panX=28,panY=24;
let drag=null,bound=false,pendingMessage=null;
const collapsed=new Set(readCollapsed());

function readCollapsed(){try{return JSON.parse(localStorage.getItem('f1RelTreeCollapsed')||'[]')}catch(_){return []}}
function saveCollapsed(){try{localStorage.setItem('f1RelTreeCollapsed',JSON.stringify([...collapsed]))}catch(_){}}
function people(){try{return Array.isArray(db.people)?db.people:[]}catch(_){return []}}
function relations(){try{db.relations=Array.isArray(db.relations)?db.relations:[];return db.relations}catch(_){return []}}
function person(id){return people().find(p=>String(p.id)===String(id))||null}
function fullName(p){if(!p)return '';return [p.name,p.surname].filter(Boolean).join(' ').trim().toLocaleUpperCase('it-IT')}
function escHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function jsArg(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function newId(prefix='p'){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function def(type){return TYPE_MAP.get(type)||{id:type||'collegato',label:String(type||'COLLEGATO').replace(/_/g,' ').toUpperCase(),inverse:'collegato'}}
function label(type){return def(type).label}
function inverse(type){return def(type).inverse||'collegato'}
function categoryFor(type){
  const d=def(type);
  if(d.family)return 'famiglia';
  if(['amico','amica','conoscente','vicino'].includes(type))return 'amici';
  if(type==='collega')return 'lavoro';
  if(type==='professionista')return 'professionisti';
  return '';
}
function normalizePhone(v){let d=String(v||'').replace(/\D/g,'');if(!d)return '';if(d.startsWith('00'))d=d.slice(2);if(!d.startsWith('39')&&d.length<=10)d='39'+d;return d}
function relationRows(a,b){
  return relations().filter(r=>String(r.sourceId)===String(a)&&String(r.targetId)===String(b));
}
function quickRelation(a,b){
  return relationRows(a,b).find(r=>r.context==='quick_relationship')||relationRows(a,b)[0]||null;
}
function relationLabel(a,b){
  const direct=quickRelation(a,b);
  if(direct)return label(direct.type);
  const reverse=quickRelation(b,a);
  if(reverse)return label(inverse(reverse.type));
  const p=person(b);
  if(p&&String(p.parentId)===String(a))return 'COLLEGATO';
  return '';
}
function addOne(a,b,type,pairId){
  if(!a||!b||a===b)return;
  const exists=relations().some(r=>r.sourceId===a&&r.targetId===b&&r.type===type&&r.context==='quick_relationship');
  if(exists)return;
  relations().push({
    id:newId('rel'),pairId,sourceId:a,targetId:b,type,periodId:'',
    context:'quick_relationship',createdAt:new Date().toISOString()
  });
}
function addReciprocal(a,b,type){
  const pairId='pair_'+[a,b].sort().join('_')+'_'+type;
  addOne(a,b,type,pairId);
  addOne(b,a,inverse(type),pairId);
}
function applyHierarchy(a,b,type,isNew){
  const src=person(a),target=person(b);if(!src||!target||target.id==='root')return;
  const d=def(type);
  if(d.spouse||d.sibling){
    if(isNew||!target.parentId||target.parentId==='root')target.parentId=src.parentId||'root';
  }else if(d.child){
    if(isNew||!target.parentId||target.parentId==='root')target.parentId=src.id;
  }else if(d.parent){
    if(isNew||!target.parentId)target.parentId=src.parentId||'root';
  }else{
    if(isNew||!target.parentId||target.parentId==='root')target.parentId=src.id;
  }
}
function relationPerspective(rel,pId){
  if(!rel)return '';
  if(String(rel.sourceId)===String(pId))return label(rel.type);
  return label(inverse(rel.type));
}
function structuralChildren(id){
  return people().filter(p=>p.id!=='root'&&String(p.parentId||'root')===String(id));
}
function spouseIds(id){
  const out=[];
  for(const r of relations()){
    if(String(r.sourceId)===String(id)&&SPOUSE_TYPES.has(r.type))out.push(r.targetId);
    else if(String(r.targetId)===String(id)&&SPOUSE_TYPES.has(inverse(r.type)))out.push(r.sourceId);
  }
  return [...new Set(out)].filter(x=>x!==id&&person(x));
}
function extraRelations(pId,structuralIds){
  const ids=new Set(structuralIds||[]);
  const rows=relations().filter(r=>r.context==='quick_relationship'&&(r.sourceId===pId||r.targetId===pId));
  const seen=new Set(),out=[];
  for(const r of rows){
    const other=r.sourceId===pId?r.targetId:r.sourceId;
    const pair=r.pairId||[pId,other].sort().join(':');
    if(seen.has(pair)||ids.has(other)||SPOUSE_TYPES.has(r.type))continue;
    seen.add(pair);
    const op=person(other);if(!op)continue;
    out.push({other:op,label:relationPerspective(r,pId)});
  }
  return out.slice(0,4);
}
function renderCard(p,relLabel=''){
  const root=p.id==='root',phone=normalizePhone(p.phone);
  const meta=[p.town||'',p.stage||''].filter(Boolean).join(' · ');
  const selected=String(selectedId)===String(p.id)?' selected':'';
  const childCount=structuralChildren(p.id).length;
  const hasChildren=childCount>0;
  const isCollapsed=collapsed.has(p.id);
  const extras=extraRelations(p.id,structuralChildren(p.id).map(x=>x.id));
  const extraHtml=extras.length?'<div class="rel-extra-links">'+extras.map(x=>'<span>'+escHtml(x.label)+' · '+escHtml(fullName(x.other))+'</span>').join('')+'</div>':'';
  return '<div class="rel-person '+(root?'root':'')+selected+'" data-person-id="'+escHtml(p.id)+'" onclick="F1RelationshipTree.select(\''+jsArg(p.id)+'\',false)">'+
    (hasChildren?'<button class="rel-collapse" type="button" onclick="event.stopPropagation();F1RelationshipTree.toggle(\''+jsArg(p.id)+'\')">'+(isCollapsed?'▸':'▾')+'</button>':'')+
    '<div class="rel-person-name">'+escHtml(root?'IO':fullName(p))+'</div>'+
    (!root&&relLabel?'<div class="rel-person-relation">'+escHtml(relLabel)+'</div>':'')+
    '<div class="rel-person-meta">'+escHtml(root?'Punto di partenza della rete':(meta||'Scheda da completare'))+'</div>'+
    (!root?'<span class="rel-person-stage">● '+escHtml(p.stage||'Nome')+'</span>':'')+
    '<div class="rel-person-actions">'+
      (phone?'<button class="wa" type="button" onclick="event.stopPropagation();F1RelationshipTree.openWhatsApp(\''+jsArg(p.id)+'\')">WHATSAPP</button>':'')+
      (!root?'<button class="open" type="button" onclick="event.stopPropagation();F1RelationshipTree.openPerson(\''+jsArg(p.id)+'\')">APRI</button>':'')+
      '<button class="add" type="button" onclick="event.stopPropagation();F1RelationshipTree.openPicker(\''+jsArg(p.id)+'\')">+ PERSONA</button>'+
    '</div>'+extraHtml+'</div>';
}
function markHiddenBranch(id,visited){
  if(visited.has(id))return;
  visited.add(id);
  const spouses=spouseIds(id);
  spouses.forEach(s=>visited.add(s));
  const group=[id,...spouses];
  for(const gid of group){
    for(const child of structuralChildren(gid)){
      if(!group.includes(child.id))markHiddenBranch(child.id,visited);
    }
  }
}
function renderBranch(id,visited,parentId=''){
  if(visited.has(id))return '';
  const p=person(id);if(!p)return '';
  visited.add(id);
  const spouseList=spouseIds(id).filter(s=>!visited.has(s));
  spouseList.forEach(s=>visited.add(s));
  const group=[id,...spouseList];
  const couple='<div class="rel-couple '+(spouseList.length?'has-spouse':'')+'">'+
    renderCard(p,parentId?relationLabel(parentId,id):'')+
    spouseList.map(sid=>renderCard(person(sid),relationLabel(id,sid)||'COPPIA')).join('')+
    '</div>';
  const childMap=new Map();
  for(const gid of group){
    for(const child of structuralChildren(gid)){
      if(group.includes(child.id))continue;
      if(!childMap.has(child.id))childMap.set(child.id,{p:child,parentId:gid});
    }
  }
  const children=[...childMap.values()].filter(x=>!visited.has(x.p.id));
  const closed=collapsed.has(id);
  if(closed)children.forEach(x=>markHiddenBranch(x.p.id,visited));
  const childHtml=(!closed&&children.length)?'<ul>'+children.map(x=>renderBranch(x.p.id,visited,x.parentId)).join('')+'</ul>':'';
  return '<li class="rel-tree-branch '+(closed?'collapsed':'')+'">'+couple+childHtml+'</li>';
}
function render(){
  const holder=document.getElementById('relationshipTree');if(!holder)return;
  const root=person('root')||{id:'root',name:'IO',parentId:null,stage:'Nome',town:''};
  const visited=new Set();
  let tree=renderBranch(root.id,visited,'');
  const leftovers=people().filter(p=>p.id!=='root'&&!visited.has(p.id));
  if(leftovers.length){
    tree+='<li><div class="rel-extra-links"><span>ALTRI RAMI</span></div><ul>'+leftovers.map(p=>renderBranch(p.id,visited,p.parentId||'root')).join('')+'</ul></li>';
  }
  holder.innerHTML='<ul class="rel-tree">'+tree+'</ul>';
  bindViewport();
  applyTransform();
}
function applyTransform(){
  const stage=document.getElementById('relationshipTreeStage');if(stage)stage.style.transform='translate('+panX+'px,'+panY+'px) scale('+scale+')';
}
function zoomBy(delta){
  scale=Math.max(.42,Math.min(1.45,scale+delta));applyTransform();
}
function fit(){
  const v=document.getElementById('relationshipTreeViewport'),s=document.getElementById('relationshipTreeStage');
  if(!v||!s)return;
  const naturalW=Math.max(s.scrollWidth,320),naturalH=Math.max(s.scrollHeight,240);
  const sx=(v.clientWidth-30)/naturalW,sy=(v.clientHeight-30)/naturalH;
  scale=Math.max(.42,Math.min(.95,Math.min(sx,sy)));
  panX=Math.max(14,(v.clientWidth-naturalW*scale)/2);
  panY=18;
  applyTransform();
}
function center(id){
  selectedId=id||selectedId;render();
  requestAnimationFrame(()=>{
    const v=document.getElementById('relationshipTreeViewport');
    const n=document.querySelector('[data-person-id="'+String(selectedId).replace(/"/g,'')+'"]');
    if(!v||!n)return;
    const vr=v.getBoundingClientRect(),nr=n.getBoundingClientRect();
    panX+=vr.left+vr.width/2-(nr.left+nr.width/2);
    panY+=vr.top+vr.height/2-(nr.top+nr.height/2);
    applyTransform();
  });
}
function select(id,doCenter=true){selectedId=id||'root';render();if(doCenter)center(selectedId)}
function toggle(id){if(collapsed.has(id))collapsed.delete(id);else collapsed.add(id);saveCollapsed();render()}
function bindViewport(){
  if(bound)return;
  const v=document.getElementById('relationshipTreeViewport');if(!v)return;
  bound=true;
  v.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,a,.rel-person'))return;
    drag={x:e.clientX,y:e.clientY,panX,panY};v.classList.add('dragging');v.setPointerCapture?.(e.pointerId);
  });
  v.addEventListener('pointermove',e=>{if(!drag)return;panX=drag.panX+(e.clientX-drag.x);panY=drag.panY+(e.clientY-drag.y);applyTransform()});
  const stop=()=>{drag=null;v.classList.remove('dragging')};
  v.addEventListener('pointerup',stop);v.addEventListener('pointercancel',stop);
  v.addEventListener('wheel',e=>{
    if(!e.ctrlKey&&!e.metaKey)return;
    e.preventDefault();zoomBy(e.deltaY<0?.08:-.08);
  },{passive:false});
}
function openPersonCard(id){
  selectedId=id;render();
  try{openPerson(id)}catch(_){}
}
function openWhatsApp(id){
  const p=person(id);if(!p)return;
  const num=normalizePhone(p.phone);if(!num){try{toast('Inserisci prima il numero WhatsApp')}catch(_){}return}
  const msg=encodeURIComponent('Ciao '+fullName(p)+',');
  window.open('https://wa.me/'+num+'?text='+msg,'_blank','noopener');
  pendingMessage={personId:id,eventId:newId('wa'),openedAt:new Date().toISOString()};
  const bar=document.getElementById('waConfirmBar');
  const name=document.getElementById('waConfirmName');
  if(name)name.textContent=fullName(p);
  if(bar)bar.classList.add('open');
}
async function confirmWhatsAppSent(){
  const x=pendingMessage;if(!x)return;
  const p=person(x.personId);if(!p)return;
  const btn=document.getElementById('waConfirmButton');if(btn)btn.disabled=true;
  try{
    await window.F1ContactOutreach?.record?.({
      channel:'MESSAGE',
      sourceEventId:'tree-whatsapp:'+x.eventId,
      contactRef:p.id,
      source:'fonti-tree-whatsapp',
      displayName:fullName(p),
      occurredAt:new Date().toISOString(),
      metadata:{confirmed_by_user:true}
    });
    closeWhatsAppConfirm();
    try{toast('Messaggio WhatsApp registrato')}catch(_){}
  }catch(e){
    try{toast('Messaggio non registrato: '+(e.message||e))}catch(_){}
  }finally{if(btn)btn.disabled=false}
}
function closeWhatsAppConfirm(){pendingMessage=null;document.getElementById('waConfirmBar')?.classList.remove('open')}

function populateTypeButtons(){
  const box=document.getElementById('relationTypeGrid');if(!box)return;
  box.innerHTML=RELATION_TYPES.map(x=>'<button type="button" data-rel-type="'+x.id+'" onclick="F1RelationshipTree.chooseType(\''+x.id+'\')">'+x.label+'</button>').join('');
}
function openPicker(id,preset='',question=''){
  sourceId=id||'root';relationType='';relationQuestion=question||'';
  const src=person(sourceId);
  const modal=document.getElementById('relationModal');if(!modal)return;
  document.getElementById('relationSourceName').textContent=src?fullName(src):'IO';
  document.getElementById('relationContextQuestion').textContent=relationQuestion||'Scegli il tipo di relazione e aggiungi o collega una persona.';
  document.getElementById('relName').value='';document.getElementById('relSurname').value='';document.getElementById('relPhone').value='';
  document.getElementById('relationExisting').innerHTML='';
  document.getElementById('relationForm').classList.remove('open');
  populateTypeButtons();
  modal.classList.add('open');
  if(preset)chooseType(preset);
}
function closePicker(){document.getElementById('relationModal')?.classList.remove('open');relationType='';relationQuestion=''}
function chooseType(type){
  relationType=type;
  document.querySelectorAll('#relationTypeGrid [data-rel-type]').forEach(b=>b.classList.toggle('active',b.dataset.relType===type));
  document.getElementById('relationForm')?.classList.add('open');
  document.getElementById('relationTypeLabel').textContent=label(type);
  renderExistingMatches();
  setTimeout(()=>document.getElementById('relName')?.focus(),50);
}
function searchText(){
  return [document.getElementById('relName')?.value,document.getElementById('relSurname')?.value].filter(Boolean).join(' ').trim().toLocaleUpperCase('it-IT');
}
function renderExistingMatches(){
  const box=document.getElementById('relationExisting');if(!box)return;
  const q=searchText();
  if(q.length<2){box.innerHTML='';return}
  const candidates=people().filter(p=>p.id!=='root'&&p.id!==sourceId&&fullName(p).includes(q)).slice(0,6);
  box.innerHTML=candidates.length?'<div class="tip"><b>PERSONA GIÀ PRESENTE?</b> Collegala senza duplicarla.</div>'+
    candidates.map(p=>'<button type="button" onclick="F1RelationshipTree.linkExisting(\''+jsArg(p.id)+'\')"><b>'+escHtml(fullName(p))+'</b><span>'+escHtml([p.town,p.phone].filter(Boolean).join(' · ')||'Scheda esistente')+' · COLLEGA</span></button>').join(''):'';
}
function hierarchyParent(source,type){
  const src=person(source)||{parentId:'root'};
  const d=def(type);
  if(d.spouse||d.sibling||d.parent)return src.parentId||'root';
  return source||'root';
}
function createQuick(){
  if(!relationType){try{toast('Scegli la relazione')}catch(_){}return}
  const name=String(document.getElementById('relName')?.value||'').trim();
  const surname=String(document.getElementById('relSurname')?.value||'').trim();
  const phone=String(document.getElementById('relPhone')?.value||'').trim();
  if(!name){try{toast('Inserisci il nome')}catch(_){}return}
  const exact=people().find(p=>p.id!=='root'&&fullName(p)===([name,surname].filter(Boolean).join(' ').toLocaleUpperCase('it-IT')));
  if(exact){renderExistingMatches();try{toast('Persona già presente: usa COLLEGA')}catch(_){}return}
  const now=new Date().toISOString();
  const p={
    id:newId('p'),parentId:hierarchyParent(sourceId,relationType),
    name:name.toLocaleUpperCase('it-IT'),surname:surname.toLocaleUpperCase('it-IT'),
    phone,email:'',category:categoryFor(relationType),source:'',stage:'Nome',town:'',
    notes:relationQuestion?('Origine ramo: '+relationQuestion):'',influence:false,
    firstContact:'',lastContact:'',nextContact:'',touchpointHistory:{},socialSearchHistory:{},
    lifeTriggers:[],lifeTriggerHistory:[],lifeTriggerStatus:{},lifeTriggerNews:{},
    periodContexts:[],places:[],memories:[],schools:[],companies:[],contextTags:[],
    createdAt:now,updatedAt:now,contactDates:[]
  };
  db.people.push(p);
  finalize(sourceId,p.id,relationType,true);
}
function linkExisting(targetId){if(!relationType){try{toast('Scegli la relazione')}catch(_){}return}finalize(sourceId,targetId,relationType,false)}
function finalize(a,b,type,isNew){
  const src=person(a),target=person(b);if(!src||!target)return;
  addReciprocal(a,b,type);applyHierarchy(a,b,type,isNew);
  const now=new Date().toISOString();src.updatedAt=now;target.updatedAt=now;
  try{persist();renderAll()}catch(_){}
  closePicker();selectedId=b;render();center(b);
  try{toast(fullName(target)+' collegato come '+label(type))}catch(_){}
}
function afterPersonSaved(id,isNew){
  selectedId=id;render();
  if(isNew)setTimeout(()=>openPicker(id),120);
}
function promptRelations(id){openPicker(id||selectedId)}
function openExpand(id){
  expandSourceId=id||selectedId||'root';
  const p=person(expandSourceId);
  document.getElementById('expandNetworkName').textContent=p?fullName(p):'IO';
  const grid=document.getElementById('expandQuestionGrid');
  if(grid)grid.innerHTML=EXPAND_QUESTIONS.map((q,i)=>'<button type="button" onclick="F1RelationshipTree.useExpandQuestion('+i+')">'+escHtml(q)+'</button>').join('');
  document.getElementById('expandNetworkModal')?.classList.add('open');
}
function closeExpand(){document.getElementById('expandNetworkModal')?.classList.remove('open')}
function useExpandQuestion(i){const q=EXPAND_QUESTIONS[i]||EXPAND_QUESTIONS[0];closeExpand();openPicker(expandSourceId,'altro',q)}
function openCurrentRelation(){
  let id='';try{id=ensureCurrentPersonSaved()}catch(_){id=document.getElementById('personId')?.value||''}
  if(id)openPicker(id);
}
function openCurrentExpand(){
  let id='';try{id=ensureCurrentPersonSaved()}catch(_){id=document.getElementById('personId')?.value||''}
  if(id)openExpand(id);
}
function openCurrentWhatsApp(){
  const id=document.getElementById('personId')?.value;
  if(id&&id!=='draft')return openWhatsApp(id);
  const num=normalizePhone(document.getElementById('pPhone')?.value);
  if(!num){try{toast('Inserisci prima il numero WhatsApp')}catch(_){}return}
  window.open('https://wa.me/'+num,'_blank','noopener');
}
function labelForRelation(r,pId){return relationPerspective(r,pId)}

function wrapCompact(selector,title,open=false){
  const el=document.querySelector(selector);if(!el||el.closest('details.compact-section'))return;
  const d=document.createElement('details');d.className='compact-section';d.open=!!open;
  const s=document.createElement('summary');s.textContent=title;
  const body=document.createElement('div');body.className='compact-section-body';
  el.parentNode.insertBefore(d,el);d.appendChild(s);d.appendChild(body);body.appendChild(el);
}
function compactDrawer(){
  const notes=document.getElementById('pNotes')?.closest('.field');
  if(notes&&!document.querySelector('.drawer-quick-actions')){
    const a=document.createElement('div');a.className='drawer-quick-actions';
    a.innerHTML='<button type="button" class="wa" onclick="F1RelationshipTree.openCurrentWhatsApp()">WHATSAPP</button><button type="button" class="add" onclick="F1RelationshipTree.openCurrentRelation()">+ PERSONA COLLEGATA</button>';
    notes.insertAdjacentElement('afterend',a);
  }
  wrapCompact('.context-box','RELAZIONE / CONTESTO',false);
  wrapCompact('#lifeTriggerBox','TRIGGER DI CAMBIAMENTO DI VITA',false);
  wrapCompact('#socialSearchBox','RICERCA SOCIAL',false);
  wrapCompact('#touchpointBox','PROSSIMO RICONTATTO · 20 TOUCH POINT',false);
  wrapCompact('.official-box','FUNZIONARIO NOTIZIE',false);
  wrapCompact('.investigator-box','PIANO INVESTIGATIVO',false);
  const prompt=document.querySelector('.prompt-box');
  if(prompt&&!prompt.dataset.compacted){
    prompt.dataset.compacted='1';
    prompt.innerHTML='<div class="compact-network-actions"><button type="button" class="expand" onclick="F1RelationshipTree.openCurrentExpand()">+ ESPANDI RETE</button><button type="button" class="relation" onclick="F1RelationshipTree.openCurrentRelation()">+ RELAZIONE</button></div>';
  }
}
function boot(){
  compactDrawer();populateTypeButtons();render();
  setTimeout(()=>fit(),120);
}
window.F1RelationshipTree={
  render,fit,zoomIn:()=>zoomBy(.1),zoomOut:()=>zoomBy(-.1),center,select,toggle,
  openPerson:openPersonCard,openWhatsApp,confirmWhatsAppSent,closeWhatsAppConfirm,
  openPicker,closePicker,chooseType,renderExistingMatches,createQuick,linkExisting,
  afterPersonSaved,promptRelations,openExpand,closeExpand,useExpandQuestion,
  openCurrentRelation,openCurrentExpand,openCurrentWhatsApp,labelForRelation,compactDrawer,
  types:RELATION_TYPES
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();