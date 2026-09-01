const API='https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1';
const KEY='sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu';
const comune=document.body.dataset.comune||'';
const slug=document.body.dataset.slug||comune.toLowerCase().replace(/\s+/g,'-');
let selling=false;
const $=id=>document.getElementById(id);
const val=id=>($(id)?.value||'').trim();
const num=id=>val(id)===''?null:Number(val(id));
const tri=id=>val(id)===''?null:val(id)==='true';
function mode(v){
  selling=v;
  $('onlyBuy').classList.toggle('active',!v);
  $('buySell').classList.toggle('active',v);
  $('sellSection').classList.toggle('on',v);
  $('sell_comune').required=v;
  $('buySell').setAttribute('aria-pressed',String(v));
  $('onlyBuy').setAttribute('aria-pressed',String(!v));
}
$('onlyBuy').addEventListener('click',()=>mode(false));
$('buySell').addEventListener('click',()=>mode(true));
function uuid(){return crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})}
async function insert(table,payload){
  const r=await fetch(`${API}/${table}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error((await r.text())||`HTTP ${r.status}`);
}
$('leadForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const status=$('status'),btn=$('submitBtn'),id=uuid();
  status.className='status'; status.textContent=''; btn.disabled=true; btn.textContent='INVIO IN CORSO…';
  try{
    await insert('f1_house_requests',{
      id,target_comune:comune,nome:val('nome'),telefono:val('telefono'),email:val('email')||null,
      budget_max:num('budget_max'),tipologia:val('tipologia'),min_mq:num('min_mq'),camere:num('camere'),
      giardino:tri('giardino'),box:tri('box'),tempistica:val('tempistica')||null,deve_vendere:selling,
      note:val('note')||null,consenso_privacy:true,fonte:`seo_${slug}`
    });
    if(selling){
      await insert('f1_properties_to_sell',{
        request_id:id,comune:val('sell_comune'),indirizzo:val('sell_indirizzo')||null,tipologia:val('sell_tipologia')||null,
        mq:num('sell_mq'),locali:num('sell_locali'),stato_immobile:val('sell_stato')||null,
        mutuo_residuo:num('mutuo_residuo'),valore_atteso:num('valore_atteso')
      });
    }
    status.className='status ok';
    status.textContent=`Richiesta registrata per ${comune}. Ti ricontatteremo dopo la verifica delle informazioni e delle opportunità compatibili.`;
    e.target.reset(); mode(false); status.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(err){
    status.className='status err';
    status.textContent='Invio non riuscito. La richiesta non viene considerata registrata finché il salvataggio non è confermato. Riprova o contatta F1.';
    console.error(err);
  }finally{btn.disabled=false;btn.textContent='INVIA LA RICHIESTA'}
});
mode(false);
