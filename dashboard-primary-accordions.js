(()=>{
'use strict';

const VERSION='20260924-primary-accordion1';
const STORAGE_KEY='f1PrimaryAccordions:v1';

const GROUPS=[
  {id:'content',selector:'#f1ContentProductionMount',title:'PRODUZIONE CONTENUTI',meta:'LUNEDÌ → MERCOLEDÌ'},
  {id:'sequence',selector:'main.app > section.steps',title:'SEQUENZA OPERATIVA',meta:'Ordine e attività corrente'},
  {id:'today',selector:'main.app > section.main-grid',title:'ATTIVITÀ CORRENTE E OGGI',meta:'Operatività e CRM'},
  {id:'territory',selector:'main.app > section.territory-grid',title:'RICERCA TERRITORIALE',meta:'Comune, zona e civici'},
  {id:'next',selector:'main.app > section.bottom-grid',title:'PROSSIMA ATTIVITÀ E CRM',meta:'Passo successivo'},
  {id:'academy',selector:'#f1Academy',title:'FORMAZIONE ACQUISIZIONE',meta:'F1 Academy'},
  {id:'tools',selector:'main.app > section.support-grid',title:'STRUMENTI, SCRIPT E DOCUMENTI',meta:'Materiali operativi'}
];

const HASH_MAP={
  '#territorio':'territory',
  '#persone':'tools',
  '#valore':'tools'
};

const bound={};

function readState(){
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return data&&typeof data==='object'?data:{open:null};
  }catch(_){
    return {open:null};
  }
}

let state=readState();

function save(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}
}

function romeNow(){
  try{
    if(window.F1ContentProduction&&typeof window.F1ContentProduction.getRomeNow==='function'){
      return window.F1ContentProduction.getRomeNow();
    }
  }catch(_){}
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Rome',
    weekday:'short',
    hour:'2-digit',
    minute:'2-digit',
    hour12:false
  }).formatToParts(new Date());
  const map={};
  parts.forEach(function(p){map[p.type]=p.value});
  const days={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};
  return {
    weekday:days[map.weekday]||0,
    minutes:Number(map.hour||0)*60+Number(map.minute||0)
  };
}

function panelId(group){
  return 'f1PrimaryPanel-'+group.id;
}

function makeToggle(group,target){
  if(bound[group.id])return bound[group.id];

  if(!target.id)target.id=panelId(group);

  const button=document.createElement('button');
  button.type='button';
  button.className='f1pa-toggle';
  button.dataset.accordionId=group.id;
  button.setAttribute('aria-controls',target.id);
  button.setAttribute('aria-expanded','false');

  const title=document.createElement('span');
  title.className='f1pa-title';
  title.textContent=group.title;

  const meta=document.createElement('span');
  meta.className='f1pa-meta';
  meta.textContent=group.meta||'';

  const icon=document.createElement('span');
  icon.className='f1pa-icon';
  icon.setAttribute('aria-hidden','true');
  icon.textContent='+';

  button.append(title,meta,icon);
  target.parentNode.insertBefore(button,target);

  button.addEventListener('click',function(){
    const next=state.open===group.id?null:group.id;
    setOpen(next,true);
  });

  bound[group.id]={group:group,target:target,button:button,meta:meta};
  return bound[group.id];
}

function setOpen(id,persist){
  state.open=id||null;
  Object.keys(bound).forEach(function(key){
    const item=bound[key];
    const open=key===state.open;
    item.target.classList.toggle('f1pa-collapsed',!open);
    item.button.classList.toggle('is-open',open);
    item.button.setAttribute('aria-expanded',open?'true':'false');
    item.button.querySelector('.f1pa-icon').textContent=open?'−':'+';
  });
  if(persist!==false)save();
}

function updateProductionMeta(){
  const item=bound.content;
  if(!item)return;
  const root=item.target;
  const next=root.querySelector('.f1cp-next strong');
  const priority=root.querySelector('.f1cp-priority strong');
  const compact=root.querySelector('.f1cp-compact strong');
  let value='';
  if(priority)value=priority.textContent.trim();
  else if(next)value=next.textContent.trim();
  else if(compact)value=compact.textContent.trim();
  item.meta.textContent=value||'LUNEDÌ → MERCOLEDÌ';
}

function bindProductionObserver(){
  const item=bound.content;
  if(!item||item.target.dataset.f1AccordionObserved==='1')return;
  item.target.dataset.f1AccordionObserved='1';
  const observer=new MutationObserver(updateProductionMeta);
  observer.observe(item.target,{subtree:true,childList:true,characterData:true});
  updateProductionMeta();
}

function requestedByHash(){
  return HASH_MAP[String(location.hash||'').toLowerCase()]||null;
}

function initialOpen(){
  const hash=requestedByHash();
  if(hash)return hash;

  const now=romeNow();
  if(now.weekday===1&&now.minutes>=810)return 'content';

  if(state.open&&bound[state.open])return state.open;
  return null;
}

function openHashTarget(){
  const id=requestedByHash();
  if(id)setOpen(id,true);
}

function build(){
  const main=document.querySelector('main.app');
  if(!main)return;

  GROUPS.forEach(function(group){
    const target=document.querySelector(group.selector);
    if(!target)return;
    target.classList.add('f1pa-content');
    makeToggle(group,target);
  });

  bindProductionObserver();
  setOpen(initialOpen(),false);

  window.addEventListener('hashchange',openHashTarget);

  document.addEventListener('click',function(event){
    const link=event.target.closest('a[href^="#"],a[href*="ricerca-territoriale.html#"]');
    if(!link)return;
    const href=link.getAttribute('href')||'';
    const hash=href.indexOf('#')>=0?href.slice(href.indexOf('#')):'';
    const id=HASH_MAP[hash.toLowerCase()];
    if(id)setOpen(id,true);
  },true);
}

window.F1PrimaryAccordions={
  version:VERSION,
  open:function(id){if(bound[id])setOpen(id,true)},
  close:function(){setOpen(null,true)},
  state:function(){return Object.assign({},state)}
};

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',build,{once:true});
}else{
  build();
}
})();