(()=>{
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
    });
  }

  function isOggi(){
    const path=(location.pathname||'').toLowerCase();
    return path.endsWith('/oggi.html') || path.endsWith('oggi.html');
  }

  function addDemandMatches(){
    if(!isOggi() || document.getElementById('f1-demand-matches')) return;
    const telefonate=document.getElementById('telefonate');
    if(!telefonate) return;

    const section=document.createElement('section');
    section.className='section';
    section.id='f1-demand-matches';
    section.innerHTML=`<span class="badge">2 · MATCH CLIENTI · DOMANDA ↔ MERCATO</span><h2>Chi devo chiamare per primo?</h2><p class="meta" id="matchInfo">Verifica accesso F1 e calcolo match…</p><div id="matchList"><div class="meta">Caricamento Demand Engine…</div></div><div class="actions"><a class="btn alt" href="cerco-casa.html">PAGINE CERCO CASA</a><a class="btn gold" href="setup-cloud.html">ACCESSO F1</a></div>`;
    telefonate.insertAdjacentElement('beforebegin',section);

    if(!document.querySelector('script[src="f1-match-dashboard.js"]')){
      const s=document.createElement('script');
      s.src='f1-match-dashboard.js?v=2';
      s.defer=true;
      document.body.appendChild(s);
    }
  }

  function addRadarEdilizio(){
    if(!isOggi()) return;
    if(document.getElementById('radar-edilizio-f1')) return;

    const sellerRadar=document.getElementById('radar');
    if(!sellerRadar) return;

    const section=document.createElement('section');
    section.className='section';
    section.id='radar-edilizio-f1';
    section.innerHTML=`<span class="badge">4 · RADAR EDILIZIO F1</span><h2>Permessi, cantieri e professionisti</h2><p class="meta">Nuove costruzioni, cambi d’uso, ristrutturazioni, terreni e professionisti individuati dalle fonti comunali F1.</p><div class="actions"><a class="btn" href="radar-edilizio.html">APRI RADAR EDILIZIO</a></div><label class="check"><input type="checkbox" data-id="edilizio"> RADAR EDILIZIO LAVORATO</label>`;
    sellerRadar.insertAdjacentElement('afterend',section);

    const foot=document.querySelector('.footin');
    if(foot && !foot.querySelector('a[href="radar-edilizio.html"]')){
      const a=document.createElement('a');
      a.href='radar-edilizio.html';
      a.textContent='EDILIZIO';
      foot.insertBefore(a,foot.lastElementChild);
    }
  }

  function boot(){
    addDemandMatches();
    addRadarEdilizio();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();