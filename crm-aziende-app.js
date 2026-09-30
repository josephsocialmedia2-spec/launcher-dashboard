(()=>{
'use strict';
const $=id=>document.getElementById(id);
const Data=()=>window.F1AcquisitionData;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fields=['ragione_sociale','partita_iva','codice_fiscale','settore','indirizzo','comune','cap','provincia','telefono','email','pec','sito_web','referente_nome','referente_cognome','referente_telefono','referente_email','referente_ruolo','canale_acquisizione','stato','interesse','budget_stimato','note','data_acquisizione','ultima_interazione','prossima_azione','data_prossima_azione','lead_score','do_not_contact','privacy_basis'];
const labels={ragione_sociale:'Ragione Sociale',partita_iva:'Partita IVA',codice_fiscale:'Codice Fiscale',settore:'Settore',indirizzo:'Indirizzo',comune:'Comune',cap:'CAP',provincia:'Provincia',telefono:'Telefono',email:'Email',pec:'PEC',sito_web:'Sito Web',referente_nome:'Nome Referente',referente_cognome:'Cognome Referente',referente_telefono:'Telefono Referente',referente_email:'Email Referente',referente_ruolo:'Ruolo Referente',canale_acquisizione:'Canale Acquisizione',stato:'Stato',interesse:'Interesse',budget_stimato:'Budget Stimato',note:'Note',data_acquisizione:'Data Acquisizione',ultima_interazione:'Ultima Interazione',prossima_azione:'Prossima Azione',data_prossima_azione:'Data Prossima Azione',lead_score:'Lead Score',do_not_contact:'Non Contattare',privacy_basis:'Base Privacy'};
const statuses=['DA_CONTATTARE','CONTATTATA','IN_TRATTATIVA','CLIENTE','PERSO'];
let rows=[],selected=null,importRows=[];
function norm(v){return String(v??'').trim()}
function normEmail(v){return norm(v).toLowerCase()}
function normPhone(v){return norm(v).replace(/[^+\d]/g,'').replace(/^00/,'+')}
function normPiva(v){return norm(v).replace(/\s+/g,'').toUpperCase()}
function date(v){if(!v)return ''; const d=new Date(v); return isNaN(d)?norm(v).slice(0,10):d.toISOString().slice(0,10)}
function toast(msg,ok=true){const s=$('aziendeStatus');if(s){s.textContent=msg;s.className='status '+(ok?'ok':'err')}}
function api(path,opt={}){return Data().rest(path,opt)}
function setVisible(on){$('aziendeView').style.display=on?'block':'none';document.querySelectorAll('#crmHubNav a').forEach(a=>a.classList.toggle('on',a.dataset.section==='aziende'))}
async function load(){
 try{await window.F1CRMAuthGuard?.ensure?.();const data=await api('aziende?select=*&order=updated_at.desc');rows=Array.isArray(data)?data:[];render()}
 catch(e){toast('CRM Aziende: '+(e.message||e),false)}
}
function filtered(){
 const q=norm($('azSearch')?.value).toLowerCase(),st=norm($('azStatus')?.value),se=norm($('azSettore')?.value).toLowerCase(),co=norm($('azComune')?.value).toLowerCase();
 return rows.filter(r=>(!q||[r.ragione_sociale,r.referente_nome,r.referente_cognome,r.telefono,r.email].join(' ').toLowerCase().includes(q))&&(!st||r.stato===st)&&(!se||norm(r.settore).toLowerCase()===se)&&(!co||norm(r.comune).toLowerCase()===co))
}
function render(){
 const data=filtered();$('azCount').textContent=data.length+' aziende';
 const box=$('aziendeTableBody');if(!box)return;
 box.innerHTML=data.map(r=>`<tr><td><b>${esc(r.ragione_sociale)}</b><div class="az-muted">${esc(r.partita_iva||'')}</div></td><td>${esc([r.referente_nome,r.referente_cognome].filter(Boolean).join(' ')||'—')}</td><td>${r.telefono?'<a href="tel:'+esc(r.telefono)+'">'+esc(r.telefono)+'</a>':'—'}</td><td>${r.email?'<a href="mailto:'+esc(r.email)+'">'+esc(r.email)+'</a>':'—'}</td><td>${esc(r.comune||'—')}</td><td>${esc(r.settore||'—')}</td><td><span class="az-status az-${esc(r.stato)}">${esc(r.stato)}</span></td><td>${esc(r.interesse||'—')}</td><td>${esc(r.ultima_interazione||'—')}</td><td>${esc(r.prossima_azione||'—')} ${r.data_prossima_azione?'· '+esc(r.data_prossima_azione):''}</td><td><button class="btn" data-edit-az="${r.id}">APRI</button></td></tr>`).join('')||'<tr><td colspan="11" class="az-empty">Nessuna azienda trovata.</td></tr>';
 box.querySelectorAll('[data-edit-az]').forEach(b=>b.onclick=()=>openDetail(Number(b.dataset.editAz)));
}
function input(name){
 const v=selected?selected[name]:'';
 if(name==='stato')return '<select class="field" data-f="'+name+'">'+statuses.map(x=>'<option '+(x===v?'selected':'')+'>'+x+'</option>').join('')+'</select>';
 if(name==='do_not_contact')return '<label class="az-check"><input type="checkbox" data-f="'+name+'" '+(v?'checked':'')+'> NON CONTATTARE</label>';
 const type=['budget_stimato'].includes(name)?'number':['data_acquisizione','ultima_interazione','data_prossima_azione'].includes(name)?'date':'text';
 return '<input class="field" type="'+type+'" data-f="'+name+'" value="'+esc(v)+'" placeholder="'+esc(labels[name])+'">';
}
function openForm(r=null){
 selected=r||{stato:'DA_CONTATTARE',lead_score:0,do_not_contact:false};
 $('aziendaTitle').textContent=r?'MODIFICA AZIENDA':'NUOVA AZIENDA';
 $('aziendaForm').innerHTML=fields.map(f=>'<div class="az-field '+(['note','privacy_basis'].includes(f)?'wide':'')+'"><label>'+labels[f]+'</label>'+input(f)+'</div>').join('');
 $('aziendaDlg').showModal();
}
function collect(){
 const out={};document.querySelectorAll('#aziendaForm [data-f]').forEach(el=>{out[el.dataset.f]=el.type==='checkbox'?el.checked:el.value});
 out.budget_stimato=out.budget_stimato?Number(out.budget_stimato):null;out.lead_score=Math.max(0,Math.min(100,Number(out.lead_score||0)));return out;
}
async function save(){
 const d=collect();if(!norm(d.ragione_sociale)){alert('Ragione Sociale obbligatoria');return}
 try{const now=new Date().toISOString();if(selected?.id)await api('aziende?id=eq.'+encodeURIComponent(selected.id),{method:'PATCH',body:JSON.stringify({...d,updated_at:now}),prefer:'return=representation'});else await api('aziende',{method:'POST',body:JSON.stringify([{...d}]),prefer:'return=representation'});$('aziendaDlg').close();toast('Azienda salvata');await load()}catch(e){alert(e.message||e)}
}
async function openDetail(id){
 const r=rows.find(x=>Number(x.id)===id);if(!r)return;selected=r;openForm(r);
 try{const ix=await api('azienda_interactions?azienda_id=eq.'+id+'&select=*&order=occurred_at.desc&limit=20');const box=$('azInteractions');if(box)box.innerHTML=(ix||[]).map(x=>'<div class="az-interaction"><b>'+esc(x.interaction_type)+'</b> · '+esc(date(x.occurred_at))+'<br>'+esc(x.note||x.outcome||'')+'</div>').join('')||'<div class="az-muted">Nessuna interazione.</div>'}catch(e){}
}
async function del(){
 if(!selected?.id)return;if(!confirm('Eliminare definitivamente questa azienda?'))return;
 try{await api('aziende?id=eq.'+selected.id,{method:'DELETE'});$('aziendaDlg').close();await load()}catch(e){alert(e.message||e)}
}
function downloadTemplate(kind){
 const XLSX=window.XLSX;if(!XLSX){alert('Libreria Excel non ancora caricata. Apri prima CARICA CONTATTI EXCEL.');return}
 const privateCols=['Nome','Cognome','Telefono','Email','Comune','Via','Civico','Tipologia','Fonte','Link','Note','Data acquisizione','Ultima interazione','Prossima azione','Data prossima azione'];
 const companyCols=['Ragione Sociale','Partita IVA','Codice Fiscale','Settore','Indirizzo','Comune','CAP','Provincia','Telefono','Email','PEC','Sito Web','Referente','Ruolo Referente','Canale','Stato','Interesse','Budget','Note','Data acquisizione','Ultima interazione','Prossima azione','Data prossima azione'];
 const ws=XLSX.utils.aoa_to_sheet([kind==='aziende'?companyCols:privateCols]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,kind==='aziende'?'AZIENDE':'PRIVATI');XLSX.writeFile(wb,kind==='aziende'?'modello_crm_aziende.xlsx':'modello_crm_privati.xlsx');
}
function normalizeHeader(h){return norm(h).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[._/-]/g,' ').replace(/\s+/g,' ')}
const mapHeaders={'ragione sociale':'ragione_sociale','azienda':'ragione_sociale','denominazione':'ragione_sociale','partita iva':'partita_iva','p iva':'partita_iva','vat':'partita_iva','codice fiscale':'codice_fiscale','settore':'settore','attivita':'settore','categoria':'settore','indirizzo':'indirizzo','via':'indirizzo','comune':'comune','citta':'comune','localita':'comune','cap':'cap','provincia':'provincia','prov':'provincia','telefono':'telefono','tel':'telefono','cellulare':'telefono','email':'email','e mail':'email','pec':'pec','sito':'sito_web','web':'sito_web','url':'sito_web','referente':'referente_nome','contatto':'referente_nome','ruolo referente':'referente_ruolo','canale':'canale_acquisizione','fonte':'canale_acquisizione','provenienza':'canale_acquisizione','stato':'stato','interesse':'interesse','servizio':'interesse','budget':'budget_stimato','prezzo':'budget_stimato','note':'note','commenti':'note','data acquisizione':'data_acquisizione','ultima interazione':'ultima_interazione','prossima azione':'prossima_azione','data prossima azione':'data_prossima_azione'};
function findDup(r){const p=normPiva(r.partita_iva),e=normEmail(r.email),t=normPhone(r.telefono),n=norm(r.ragione_sociale).toLowerCase();return rows.find(x=>(p&&normPiva(x.partita_iva)===p)||(e&&normEmail(x.email)===e)||(t&&normPhone(x.telefono)===t)||(n&&norm(x.ragione_sociale).toLowerCase()===n))}
async function importFile(file){
 if(!file)return;try{
  if(!window.XLSX)await window.F1CRMExcelImport?.loadXlsxLibrary?.();if(!window.XLSX)throw new Error('Libreria Excel non disponibile');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]],a=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});if(!a.length){alert('File vuoto');return}
  const headers=Object.keys(a[0]);importRows=a.map(row=>{const o={};headers.forEach(h=>{const k=mapHeaders[normalizeHeader(h)];if(k)o[k]=row[h]});o.ragione_sociale=norm(o.ragione_sociale);o.telefono=normPhone(o.telefono);o.email=normEmail(o.email);o.partita_iva=normPiva(o.partita_iva);o.data_acquisizione=date(o.data_acquisizione);o.ultima_interazione=date(o.ultima_interazione);o.data_prossima_azione=date(o.data_prossima_azione);o.stato=statuses.includes(o.stato)?o.stato:'DA_CONTATTARE';return o}).filter(x=>x.ragione_sociale);
  $('azImportPreview').innerHTML='<b>ANTEPRIMA</b> · '+importRows.length+' aziende riconosciute<br>'+importRows.slice(0,8).map(x=>esc(x.ragione_sociale)+' · '+esc(x.comune||'')).join('<br>');$('aziendaImportDlg').showModal();
 }catch(e){alert('Import: '+(e.message||e))}
}
async function confirmImport(){
 let created=0,updated=0,ignored=0;
 for(const r of importRows){const d=findDup(r);try{
  if(d){const choice=prompt('Duplicato: '+d.ragione_sociale+'\\nDigita AGGIORNA per aggiornare oppure IGNORA per saltare.','IGNORA');if(String(choice).toUpperCase()!=='AGGIORNA'){ignored++;continue}await api('aziende?id=eq.'+d.id,{method:'PATCH',body:JSON.stringify({...r,updated_at:new Date().toISOString()}),prefer:'return=representation'});updated++}
  else{await api('aziende',{method:'POST',body:JSON.stringify([{...r}]),prefer:'return=representation'});created++}
 }catch(e){console.warn(e)}}
 $('aziendaImportDlg').close();toast('IMPORT AZIENDE · Nuove '+created+' · Aggiornate '+updated+' · Ignorate '+ignored);await load();
}
function exportXlsx(){if(!window.XLSX){alert('Libreria Excel non disponibile');return}const data=filtered().map(r=>{const x={...r};delete x.user_id;return x});const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'AZIENDE');XLSX.writeFile(wb,'crm_aziende_export.xlsx')}
function boot(){
 const style=document.createElement('style');style.textContent=`.aziende-wrap{margin-top:14px}.az-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.az-filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px}.az-table{width:100%;border-collapse:collapse;font-size:11px}.az-table th,.az-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.az-table th{position:sticky;top:0;background:#111813;z-index:1}.az-status{padding:4px 7px;border-radius:8px;border:1px solid #465;font-weight:900;font-size:9px}.az-CLIENTE{color:var(--g)}.az-IN_TRATTATIVA{color:var(--gold)}.az-PERSO{color:var(--red)}.az-muted{color:var(--mut);font-size:10px}.az-empty{text-align:center;padding:30px;color:var(--mut)}.az-form{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.az-field{display:grid;gap:4px}.az-field.wide{grid-column:1/-1}.az-field label{font-size:9px;font-weight:900;color:var(--mut);text-transform:uppercase}.az-check{padding:9px;border:1px solid var(--line);border-radius:8px;font-size:10px}.az-interaction{padding:8px;border:1px solid var(--line);border-radius:8px;margin-top:6px}.az-scroll{overflow:auto}.az-modal{width:min(96vw,1100px)}@media(max-width:850px){.az-filters,.az-form{grid-template-columns:1fr}.az-table{min-width:1200px}}`;document.head.appendChild(style);
 $('azNew')?.addEventListener('click',()=>openForm());$('azSave')?.addEventListener('click',save);$('azDelete')?.addEventListener('click',del);$('azExport')?.addEventListener('click',exportXlsx);$('azImportTrigger')?.addEventListener('click',()=>$('azImportFile')?.click()); $('azImportFile')?.addEventListener('change',e=>importFile(e.target.files?.[0]));
 $('azImportConfirm')?.addEventListener('click',confirmImport);$('azTemplateAziende')?.addEventListener('click',()=>downloadTemplate('aziende'));$('azTemplatePrivati')?.addEventListener('click',()=>downloadTemplate('privati'));
 ['azSearch','azStatus','azSettore','azComune'].forEach(id=>$(id)?.addEventListener('input',render));['azStatus'].forEach(id=>$(id)?.addEventListener('change',render));
 document.querySelectorAll('[data-close-az]').forEach(b=>b.onclick=()=>$(b.dataset.closeAz).close());
 window.F1CRMAziende={load,downloadTemplate,openForm}; window.dispatchEvent(new CustomEvent('f1-crm-aziende-ready')); if(location.hash.replace('#','').toLowerCase()==='aziende')load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();