(()=>{'use strict';
const VERSION='20260919-layout-final3';
if(window.F1TerritoryLayout?.version===VERSION)return;

function ensureCssLast(){
  let link=document.getElementById('f1TerritoryLayoutCss')||document.querySelector('link[href*="ricerca-territoriale-layout.css"]');
  if(!link){
    link=document.createElement('link');
    link.id='f1TerritoryLayoutCss';
    link.rel='stylesheet';
    link.href='ricerca-territoriale-layout.css?v='+VERSION;
    document.head.appendChild(link);
    return;
  }
  link.id='f1TerritoryLayoutCss';
  if(!link.href.includes(VERSION)) link.href='ricerca-territoriale-layout.css?v='+VERSION;
  if(document.head.lastElementChild!==link) document.head.appendChild(link);
}

function neutralizeLegacyFullscreen(){
  document.body?.classList.remove('f1-dashboard-fullscreen');
  document.body?.classList.add('f1-dashboard-fluid');
}

function renamePrimary(){
  const title=document.querySelector('.current-card .card-title-row h2');
  if(title && !title.dataset.f1FinalTitle){
    title.dataset.f1FinalTitle='1';
    title.innerHTML='<span class="title-icon"><i class="fa-regular fa-square-check"></i></span> COSA DEVO FARE ADESSO';
  }
}

function restructureCore(){
  const main=document.querySelector('.main-grid');
  const territory=document.getElementById('territorio');
  const right=document.querySelector('.right-col');
  if(main) main.classList.add('f1-primary-grid');
  if(right && territory && right.parentElement===main){
    right.classList.add('f1-ops-grid');
    territory.insertAdjacentElement('afterend',right);
  }else if(right){
    right.classList.add('f1-ops-grid');
  }
}

function secondaryStack(){
  let stack=document.getElementById('f1SecondaryStack');
  if(stack)return stack;
  const bottom=document.querySelector('.bottom-grid');
  if(!bottom)return null;
  stack=document.createElement('section');
  stack.id='f1SecondaryStack';
  stack.className='f1-secondary-stack';
  bottom.insertAdjacentElement('afterend',stack);
  return stack;
}

function wrapInDetails(target,id,label){
  if(!target)return null;
  const existing=document.getElementById(id);
  if(existing){
    if(!existing.contains(target)) existing.appendChild(target);
    return existing;
  }
  const details=document.createElement('details');
  details.id=id;
  details.className='f1-secondary-details';
  details.open=false;
  const summary=document.createElement('summary');
  summary.textContent=label;
  target.parentNode?.insertBefore(details,target);
  details.append(summary,target);
  return details;
}

function moveSecondary(){
  const stack=secondaryStack();
  if(!stack)return;

  const support=document.querySelector('.support-grid');
  const tools=wrapInDetails(support,'f1ToolsDetails','STRUMENTI, SCRIPT E DOCUMENTI');
  if(tools && tools.parentElement!==stack) stack.appendChild(tools);

  const live=document.getElementById('f1MobileLivePanel');
  const liveDetails=wrapInDetails(live,'f1MobileLiveDetails','NOTIZIERI SUL TERRITORIO');
  if(liveDetails && liveDetails.parentElement!==stack) stack.appendChild(liveDetails);

  const admin=document.getElementById('f1TerritoryAdminV4');
  const office=wrapInDetails(admin,'f1OfficeDetails','UFFICIO E CRM TERRITORIALE');
  if(office && office.parentElement!==stack) stack.appendChild(office);

  const host=document.querySelector('.territory-spacer');
  if(host && /GIRI TERRITORIALI/i.test(host.textContent||'')){
    const assignments=wrapInDetails(host,'f1AssignmentsDetails','ASSEGNAZIONI TERRITORIALI');
    if(assignments && assignments.parentElement!==stack) stack.appendChild(assignments);
  }
}

function qa(){
  const selectors=[
    '.current-card',
    '#territorio .territory-card',
    '.right-col.f1-ops-grid',
    '.bottom-grid',
    '#f1AssignmentsDetails',
    '#f1MobileLiveDetails',
    '#f1OfficeDetails',
    '#f1ToolsDetails'
  ];
  const visible=selectors
    .map(selector=>({selector,el:document.querySelector(selector)}))
    .filter(item=>item.el)
    .filter(item=>{
      const cs=getComputedStyle(item.el);
      return cs.display!=='none' && cs.visibility!=='hidden';
    });
  const overlaps=[];
  for(let i=0;i<visible.length-1;i++){
    const a=visible[i],b=visible[i+1];
    const ar=a.el.getBoundingClientRect(),br=b.el.getBoundingClientRect();
    if(ar.bottom>br.top+1) overlaps.push({a:a.selector,b:b.selector,px:Math.round(ar.bottom-br.top)});
  }
  const horizontalOverflow=Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth);
  return {overlaps,horizontalOverflow,width:innerWidth,height:innerHeight};
}

function apply(){
  neutralizeLegacyFullscreen();
  ensureCssLast();
  renamePrimary();
  restructureCore();
  moveSecondary();
}

let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    apply();
  });
});
observer.observe(document.documentElement,{childList:true,subtree:true});

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{apply();requestAnimationFrame(apply)},{once:true});
}else{
  apply();
  requestAnimationFrame(apply);
}

window.F1TerritoryLayout={version:VERSION,apply,qa};
})();