(()=>{
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
    });
  }

  function addRadarEdilizio(){
    const path=(location.pathname||'').toLowerCase();
    if(!path.endsWith('/oggi.html') && !path.endsWith('oggi.html')) return;
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

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',addRadarEdilizio,{once:true});
  }else{
    addRadarEdilizio();
  }
})();
