(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

async function init(){
  try{
    if(!window.F1StaffData?.ready?.())return;
    const me=await F1StaffData.me();
    if(String(me.role||'').toUpperCase()!=='TITOLARE')return;
    injectNav();
    await injectCard();
  }catch(e){
    console.warn('F1 tour admin dashboard',e);
  }
}

function injectNav(){
  const side=document.querySelector('.sidebar');
  if(!side||document.getElementById('assignTourNav'))return;
  const a=document.createElement('a');
  a.id='assignTourNav';
  a.className='side-item';
  a.href='assegna-giro.html';
  a.innerHTML='<i class="fa-solid fa-route"></i><span>+ Assegna giro</span>';
  const anchor=side.querySelector('.active-secondary');
  anchor?.insertAdjacentElement('afterend',a);
}

function injectStyles(){
  if(document.getElementById('f1TourAdminDashboardStyle'))return;
  const style=document.createElement('style');
  style.id='f1TourAdminDashboardStyle';
  style.textContent=`
    .f1-tour-assignment-card{
      width:100%;
      margin-top:14px;
      padding:18px!important;
      min-height:0!important;
      display:block!important;
      background:linear-gradient(180deg,#fff 0%,#fefefe 100%)!important;
      color:var(--text,#163041)!important;
      border:1px solid #e4e9eb!important;
      border-radius:var(--radius,14px)!important;
      box-shadow:var(--shadow,0 14px 34px rgba(28,52,45,.10),0 3px 10px rgba(28,52,45,.06))!important;
      overflow:hidden;
    }
    .f1-tour-assignment-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      padding-bottom:14px;
      border-bottom:1px solid var(--line,#dfe6e8);
    }
    .f1-tour-assignment-title{
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
    }
    .f1-tour-assignment-icon{
      width:34px;
      height:34px;
      flex:0 0 34px;
      display:grid;
      place-items:center;
      border-radius:9px;
      background:#eaf6ef;
      color:var(--f1,#0a8a4d);
      font-size:17px;
    }
    .f1-tour-assignment-title h2{
      margin:0;
      color:var(--text,#163041);
      font-size:18px;
      font-weight:850;
      letter-spacing:-.25px;
    }
    .f1-tour-assignment-title small{
      display:block;
      margin-top:3px;
      color:#74828a;
      font-size:10px;
      font-weight:800;
      letter-spacing:.08em;
    }
    .f1-tour-new{
      min-height:42px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      padding:10px 14px;
      border-radius:8px;
      background:linear-gradient(180deg,#0da35d,#087a45);
      color:#fff!important;
      text-decoration:none!important;
      font-size:12px;
      font-weight:900;
      white-space:nowrap;
      box-shadow:0 7px 16px rgba(8,120,66,.18),inset 0 1px rgba(255,255,255,.22);
    }
    .f1-tour-grid-head,
    .f1-tour-row,
    .f1-tour-empty{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:0;
    }
    .f1-tour-grid-head{
      margin-top:14px;
      background:#f5f8f6;
      border:1px solid #e7ede9;
      border-radius:9px 9px 0 0;
      overflow:hidden;
    }
    .f1-tour-grid-head span{
      padding:9px 14px;
      color:#6b7972;
      font-size:10px;
      font-weight:900;
      letter-spacing:.06em;
      border-right:1px solid #e7ede9;
    }
    .f1-tour-grid-head span:last-child{border-right:0}
    .f1-tour-row,
    .f1-tour-empty{
      border:1px solid #e7ede9;
      border-top:0;
      background:#fff;
    }
    .f1-tour-row:last-of-type,
    .f1-tour-empty{
      border-radius:0 0 9px 9px;
    }
    .f1-tour-cell{
      min-width:0;
      padding:14px;
      border-right:1px solid #e7ede9;
    }
    .f1-tour-cell:last-child{border-right:0}
    .f1-tour-cell strong{
      display:block;
      color:#223a2e;
      font-size:13px;
      font-weight:850;
      line-height:1.3;
      overflow-wrap:anywhere;
    }
    .f1-tour-cell small{
      display:block;
      margin-top:4px;
      color:#748078;
      font-size:11px;
      line-height:1.35;
    }
    .f1-tour-empty .f1-tour-cell{
      min-height:58px;
      display:flex;
      align-items:center;
    }
    .f1-tour-empty .f1-tour-cell strong{color:#89958e}
    .f1-tour-status{
      display:inline-flex!important;
      width:max-content;
      max-width:100%;
      align-items:center;
      gap:7px;
      padding:6px 9px;
      border:1px solid #d7ebdf;
      border-radius:999px;
      background:#edf8f2;
      color:var(--f1-dark,#07653a)!important;
      font-size:10px!important;
      font-weight:900!important;
    }
    .f1-tour-status::before{
      content:"";
      width:7px;
      height:7px;
      flex:0 0 7px;
      border-radius:50%;
      background:#18a761;
    }
    .f1-tour-progress{
      height:6px;
      margin-top:8px;
      overflow:hidden;
      border-radius:999px;
      background:#e6ece8;
    }
    .f1-tour-progress i{
      display:block;
      height:100%;
      border-radius:inherit;
      background:linear-gradient(90deg,#087643,#0da85f);
    }
    .f1-tour-footer{
      display:flex;
      justify-content:flex-end;
      margin-top:12px;
    }
    .f1-tour-manage{
      display:inline-flex;
      align-items:center;
      gap:7px;
      color:var(--f1,#0a8a4d)!important;
      text-decoration:none!important;
      font-size:12px;
      font-weight:900;
    }
    @media(max-width:760px){
      .f1-tour-assignment-head{
        align-items:stretch;
        flex-direction:column;
      }
      .f1-tour-new{width:100%}
      .f1-tour-grid-head{display:none}
      .f1-tour-row,
      .f1-tour-empty{
        grid-template-columns:1fr;
        margin-top:10px;
        border-top:1px solid #e7ede9;
        border-radius:9px!important;
      }
      .f1-tour-cell{
        border-right:0;
        border-bottom:1px solid #e7ede9;
      }
      .f1-tour-cell:last-child{border-bottom:0}
      .f1-tour-cell::before{
        display:block;
        margin-bottom:5px;
        color:#7a8780;
        font-size:9px;
        font-weight:900;
        letter-spacing:.06em;
      }
      .f1-tour-cell:nth-child(1)::before{content:"TITOLARE"}
      .f1-tour-cell:nth-child(2)::before{content:"GIRO ASSEGNATO"}
      .f1-tour-cell:nth-child(3)::before{content:"STATO"}
      .f1-tour-empty .f1-tour-cell{min-height:0}
      .f1-tour-footer{justify-content:stretch}
      .f1-tour-manage{width:100%;justify-content:flex-end}
    }
  `;
  document.head.appendChild(style);
}

async function injectCard(){
  const host=document.querySelector('.territory-spacer');
  if(!host)return;

  let tours=[];
  try{
    tours=await F1StaffData.rpc('f1_territory_admin_tours')||[];
  }catch(_){}

  injectStyles();
  host.className='card territory-spacer f1-tour-assignment-card';
  host.removeAttribute('style');

  const rows=tours.slice(0,3).map(t=>{
    const total=Number(t.total_count||0);
    const done=Number(t.completed_count||0);
    const pct=total?Math.min(100,Math.round(done/total*100)):0;
    const holder=[t.first_name,t.last_name].filter(Boolean).join(' ')||t.role||'Titolare';
    const route=[t.comune,t.via].filter(Boolean).join(' · ')||'Giro territoriale';
    const status=String(t.status||'IN CORSO').replaceAll('_',' ');
    return `
      <div class="f1-tour-row">
        <div class="f1-tour-cell">
          <strong>${esc(holder)}</strong>
          <small>Responsabile del giro</small>
        </div>
        <div class="f1-tour-cell">
          <strong>${esc(route)}</strong>
          <small>${done}/${total} civici completati · prossimo ${esc(t.next_civic||'—')}</small>
        </div>
        <div class="f1-tour-cell">
          <strong class="f1-tour-status">${esc(status)}</strong>
          <div class="f1-tour-progress" aria-label="${pct}% completato"><i style="width:${pct}%"></i></div>
        </div>
      </div>
    `;
  }).join('');

  const empty=`
    <div class="f1-tour-empty">
      <div class="f1-tour-cell"><strong>—</strong></div>
      <div class="f1-tour-cell"><strong>Nessun giro attivo</strong></div>
      <div class="f1-tour-cell"><strong class="f1-tour-status">NON ASSEGNATO</strong></div>
    </div>
  `;

  host.innerHTML=`
    <div class="f1-tour-assignment-head">
      <div class="f1-tour-assignment-title">
        <span class="f1-tour-assignment-icon"><i class="fa-solid fa-route"></i></span>
        <div>
          <h2>ASSEGNAZIONE TERRITORIALE</h2>
          <small>TITOLARE · GESTIONE GIRI</small>
        </div>
      </div>
      <a class="f1-tour-new" href="assegna-giro.html"><i class="fa-solid fa-plus"></i> ASSEGNA NUOVO GIRO</a>
    </div>

    <div class="f1-tour-grid-head" aria-hidden="true">
      <span>TITOLARE</span>
      <span>GIRO ASSEGNATO</span>
      <span>STATO</span>
    </div>

    ${rows||empty}

    <div class="f1-tour-footer">
      <a class="f1-tour-manage" href="assegna-giro.html">GESTISCI ASSEGNAZIONI <i class="fa-solid fa-arrow-right"></i></a>
    </div>
  `;
}

function start(){
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250),{once:true});
  }else{
    setTimeout(init,250);
  }
}

window.addEventListener('f1:dashboard-auth-ready',()=>setTimeout(init,50));
start();
})();