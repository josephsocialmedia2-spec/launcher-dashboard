(()=>{if(window.__acqChiudiContattoV1)return;window.__acqChiudiContattoV1=true;
function resetContatto(){
  try{[name,phone,address,note,next,date].forEach(el=>{if(el)el.value=''});}catch(e){}
  try{source.value='Giro zona';}catch(e){}
  try{out.value='Da richiamare';}catch(e){}
  try{cur=null;stack=[];}catch(e){}
  try{say.textContent='Contatto salvato. Scegli la prossima situazione.';}catch(e){}
}
window.closeContact=function(){
  try{
    const esito=(typeof out!=='undefined'&&out&&out.value)?out.value:'Da richiamare';
    const c={
      name:(typeof name!=='undefined'&&name?name.value:''),
      phone:(typeof phone!=='undefined'&&phone?phone.value:''),
      address:(typeof address!=='undefined'&&address?address.value:''),
      source:(typeof source!=='undefined'&&source?source.value:'Giro zona'),
      note:(typeof note!=='undefined'&&note?note.value:''),
      outcome:esito,
      next:(typeof next!=='undefined'&&next?next.value:''),
      date:(typeof date!=='undefined'&&date?date.value:''),
      ts:new Date().toISOString()
    };
    D.contacts.unshift(c);
    D.stats.c++;
    if(esito==='Appuntamento'||esito==='Valutazione')D.stats.a++;
    if(esito==='Nuovo immobile'||esito==='Possibile vendita')D.stats.i++;
    persist();
    try{if(outcome&&outcome.open)outcome.close();}catch(e){}
    resetContatto();
  }catch(err){
    console.error('Errore chiusura contatto',err);
    try{outcome.showModal();}catch(e){}
  }
};
})();
