(()=>{
if(document.getElementById('acquisizioneVaiQuiButton'))return;
const RADAR='https://chatgpt.com/c/6a7e8fda-9c9c-83ed-b538-31e6b9b39629';
const KEY='f1VaiZonaTargets';
const css=document.createElement('style');
css.textContent=`.acqVaiQuiBtn{width:100%;margin:0 0 14px;border:0;border-radius:18px;padding:20px 16px;background:linear-gradient(90deg,#b32019,#f28a1e);color:#fff;font-weight:950;font-size:22px;box-shadow:0 6px 18px #0002}.acqVaiQuiBtn small{display:block;font-size:11px;line-height:1.35;margin-top:6px;opacity:.95;font-weight:800}.vzBox{background:#fff;border:2px solid #f28a1e;border-radius:16px;padding:16px;margin:0 0 14px;display:none}.vzBox.on{display:block}.vzTitle{font-size:13px;font-weight:900;color:#8d2a16}.vzMain{font-size:24px;font-weight:950;color:#102844;margin:6px 0}.vzLine{font-size:14px;line-height:1.45;margin:5px 0}.vzActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.vzActions button{border:0;border-radius:10px;padding:12px;font-weight:900}.vzNext{background:#2879c8;color:#fff}.vzRadar{background:#102844;color:#fff}.vzEmpty{font-size:14px;line-height:1.45;color:#5c6675}`;
document.head.appendChild(css);

const main=document.querySelector('main');if(!main)return;
const box=document.createElement('div');box.id='vaiZonaBox';box.className='vzBox';
const btn=document.createElement('button');btn.id='acquisizioneVaiQuiButton';btn.className='acqVaiQuiBtn';btn.innerHTML='📍 VAI IN ZONA<small>PREMI E VEDI SUBITO PAESE · VIA · CIVICO · COSA CERCARE · PREZZO</small>';
let pos=0;
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(d)?d:[]}catch(e){return[]}}
function render(){const rows=load();box.classList.add('on');if(!rows.length){box.innerHTML=`<div class="vzTitle">DESTINAZIONE OPERATIVA</div><div class="vzEmpty"><b>Nessuna via caricata nel telefono.</b><br>Il tasto è pronto: quando il Radar salva una destinazione, qui vedrai direttamente via, civico e cosa cercare.</div><div class="vzActions"><button class="vzRadar" id="vzOpenRadar">APRI RADAR</button></div>`;document.getElementById('vzOpenRadar').onclick=()=>window.open(RADAR,'_blank','noopener');return}
if(pos>=rows.length)pos=0;const x=rows[pos]||{};box.innerHTML=`<div class="vzTitle">DESTINAZIONE ${pos+1} DI ${rows.length}</div><div class="vzMain">${x.paese||'Zona'} — ${x.via||'Via da verificare'} ${x.civico||''}</div><div class="vzLine"><b>COSA CERCARE:</b> ${x.cosa||x.immobile||'Opportunità immobiliare'}</div><div class="vzLine"><b>PREZZO:</b> ${x.prezzo||'—'}</div><div class="vzLine"><b>SEGNALE:</b> ${x.segnale||'—'}</div><div class="vzActions"><button class="vzNext" id="vzNext">PROSSIMA VIA</button><button class="vzRadar" id="vzOpenRadar">APRI RADAR</button></div>`;document.getElementById('vzNext').onclick=()=>{pos++;render()};document.getElementById('vzOpenRadar').onclick=()=>window.open(RADAR,'_blank','noopener')}
btn.onclick=render;
main.prepend(box);main.prepend(btn);
window.F1VaiZona={setTargets(rows){localStorage.setItem(KEY,JSON.stringify(Array.isArray(rows)?rows:[]));pos=0;render()},getTargets:load};
})();