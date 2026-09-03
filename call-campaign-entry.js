(()=>{
  const p=new URLSearchParams(location.search);
  const phone=(p.get('phone')||'').trim();
  if(!phone)return;
  const key=s=>String(s||'').replace(/\D/g,'').replace(/^39(?=3|0)/,'');
  let done=false,tries=0;
  const timer=setInterval(()=>{
    if(done||++tries>80){clearInterval(timer);return}
    if(!window.F1CallCampaign||!document.querySelector('#addProspect'))return;
    const q=(()=>{try{return JSON.parse(localStorage.getItem('f1CallCampaignQueue')||'[]')}catch(e){return[]}})();
    const existing=q.find(x=>key(x.phone)===key(phone)&&!x.done);
    if(existing){F1CallCampaign.selectProspect(existing.id);done=true;clearInterval(timer);return}
    document.querySelector('#pName').value=p.get('name')||'';
    document.querySelector('#pPhone').value=phone;
    document.querySelector('#pCity').value=p.get('city')||'';
    document.querySelector('#pSource').value=p.get('source')||'CRM F1';
    document.querySelector('#pReason').value=p.get('reason')||'Richiamo / campagna F1';
    document.querySelector('#addProspect').click();
    done=true;clearInterval(timer);
  },150);
})();
