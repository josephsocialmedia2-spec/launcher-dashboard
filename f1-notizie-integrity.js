(function(){
'use strict';

function isHtmlForm(form){
  return typeof HTMLFormElement!=='undefined' && form instanceof HTMLFormElement;
}

function setMessage(message,text,isError=false){
  if(!message)return;
  message.textContent=text;
  message.className=isError?'msg err':'msg';
}

function safeResetForm(formOrId){
  const form=typeof formOrId==='string'?document.getElementById(formOrId):formOrId;
  if(!isHtmlForm(form)){
    console.warn('Form non trovato o non valido:',typeof formOrId==='string'?formOrId:'[riferimento form]');
    return false;
  }
  form.reset();
  return true;
}

function requireField(form,payload,name,label){
  const value=String(payload[name]??'').trim();
  payload[name]=value;
  if(value)return;
  const field=form.elements?.namedItem?.(name);
  if(field&&typeof field.focus==='function')field.focus();
  throw new Error('Campo obbligatorio mancante: '+label);
}

function createNewsRecord(form){
  if(!isHtmlForm(form))throw new Error('Submit notizia: form non valido');
  const fd=new FormData(form);
  const payload=Object.fromEntries(fd.entries());
  for(const key of ['level','title','comune','via','zona','source','detail','justification']){
    if(key in payload)payload[key]=String(payload[key]??'').trim();
  }
  payload.level=String(payload.level||'N0').toUpperCase();
  payload.usable=fd.has('usable');
  if(!/^N[0-6]$/.test(payload.level))throw new Error('Livello notizia non valido');
  requireField(form,payload,'title','Titolo notizia');
  requireField(form,payload,'comune','Comune');
  requireField(form,payload,'detail','Informazione concreta');
  requireField(form,payload,'justification','Giustificazione del livello');
  return payload;
}

async function saveNews(api,userId,record){
  if(!userId)throw new Error('Utente non disponibile');
  if(!record||typeof record!=='object')throw new Error('Record notizia mancante');
  if(!api||typeof api.addNews!=='function')throw new Error('Servizio salvataggio notizie non disponibile');
  const saved=await api.addNews(userId,record);
  if(!saved||!saved.news_id)throw new Error('Salvataggio notizia non confermato');
  if(saved.user_id&&String(saved.user_id)!==String(userId))throw new Error('Conferma salvataggio non coerente con l’utente');
  return saved;
}

function findSubmitButton(form){
  return form.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
}

function bindNewsForm({form,message,getUserId,refresh,api}={}){
  if(!isHtmlForm(form)){
    console.warn('Modulo notizie non trovato o non valido');
    return false;
  }
  if(form.dataset.f1NewsIntegrityBound==='1')return true;
  form.dataset.f1NewsIntegrityBound='1';

  form.onsubmit=async function handleNotiziaSubmit(event){
    event.preventDefault();
    const currentForm=event.currentTarget;
    if(!isHtmlForm(currentForm)){
      console.error('Submit notizia: form non valido');
      return;
    }
    if(currentForm.dataset.saving==='1')return;

    let record;
    try{
      if(!currentForm.checkValidity()){
        currentForm.reportValidity();
        throw new Error('Compila tutti i campi obbligatori');
      }
      record=createNewsRecord(currentForm);
    }catch(error){
      console.error('Validazione notizia:',error);
      setMessage(message,'SALVATAGGIO NON COMPLETATO — I DATI SONO STATI MANTENUTI. '+error.message,true);
      return;
    }

    const submitButton=findSubmitButton(currentForm);
    currentForm.dataset.saving='1';
    if(submitButton)submitButton.disabled=true;
    setMessage(message,'SALVATAGGIO NOTIZIA IN CORSO…');

    let saved;
    try{
      const userId=typeof getUserId==='function'?getUserId():getUserId;
      saved=await saveNews(api||window.F1StaffData,userId,record);
    }catch(error){
      console.error('Errore salvataggio notizia:',error);
      setMessage(message,'SALVATAGGIO NON COMPLETATO — I DATI SONO STATI MANTENUTI. '+error.message,true);
      currentForm.dataset.saving='';
      if(submitButton&&submitButton.isConnected)submitButton.disabled=false;
      return;
    }

    // Da questo punto la persistenza è confermata. Solo ora è consentito pulire l'interfaccia.
    const resetOk=safeResetForm(currentForm);
    if(!resetOk){
      console.error('Notizia salvata ma reset form non eseguito');
      setMessage(message,'NOTIZIA SALVATA · INTERFACCIA NON RIPULITA. I DATI SONO AL SICURO.',true);
    }

    try{
      if(typeof refresh==='function')await refresh(saved);
      setMessage(message,'NOTIZIA REGISTRATA · '+(saved.level||record.level));
    }catch(error){
      console.error('Notizia salvata, aggiornamento interfaccia fallito:',error);
      setMessage(message,'NOTIZIA SALVATA · AGGIORNAMENTO INTERFACCIA NON COMPLETATO. RICARICA I DATI.',true);
    }finally{
      currentForm.dataset.saving='';
      if(submitButton&&submitButton.isConnected)submitButton.disabled=false;
    }
  };
  return true;
}

window.F1NotizieIntegrity={safeResetForm,createNewsRecord,saveNews,bindNewsForm};
})();
