let sectors=[];
const $=id=>document.getElementById(id);
const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function init(){
  const data=await fetch("./data/sectors.json").then(r=>r.json());
  sectors=data.sectors;
  $("sector").innerHTML=sectors.map(s=>"<option value='"+s.id+"'>"+s.label+"</option>").join("");
}
function selected(){return sectors.find(s=>s.id===$("sector").value)||sectors[0]}
function copy(){
  const s=selected(),c=$("company").value.trim()||"La tua attività",o=$("offer").value.trim()||"Offerta del mese",g=$("gift").value.trim()||"Vantaggio riservato",city=$("city").value.trim(),cta=$("cta").value.trim()||"Scopri l'offerta";
  return {
    subject:c+" — "+o,
    email:"Buongiorno,\n\nabbiamo preparato una nuova iniziativa per i clienti di "+c+(city?" a "+city:"")+" .\n\n"+o+".\n\nVantaggio: "+g+".\n\n"+cta+".\n\nTi aspettiamo.\n\n"+c,
    whatsapp:c+": "+o+". "+g+". "+cta+".",
    posts:[
      "POST 1 — "+o+". Un vantaggio pensato per i nostri clienti. "+cta+".",
      "POST 2 — "+g+". Passa da "+c+" e scopri l'iniziativa.",
      "POST 3 — "+(city?city+" · ":"")+o+". Prenota o chiedi informazioni.",
      "POST 4 — ULTIMO RICHIAMO: "+o+". "+cta+"."
    ],
    angles:s.angles
  }
}
function graphic(){
  const c=esc($("company").value||"LA TUA ATTIVITÀ"),o=esc($("offer").value||"OFFERTA DEL MESE"),g=esc($("gift").value||"VANTAGGIO RISERVATO"),city=esc($("city").value||""),cta=esc($("cta").value||"SCOPRI");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="#111"/><rect x="55" y="55" width="970" height="970" rx="24" fill="none" stroke="#d5b46a" stroke-width="3"/><text x="90" y="150" fill="#d5b46a" font-family="Arial" font-size="28" letter-spacing="5">REALMEDIAPRO · CAMPAGNA</text><text x="90" y="330" fill="white" font-family="Arial" font-size="64" font-weight="700">'+c+'</text><text x="90" y="470" fill="white" font-family="Arial" font-size="48" font-weight="700">'+o+'</text><text x="90" y="580" fill="#d5b46a" font-family="Arial" font-size="30">'+g+'</text><text x="90" y="860" fill="white" font-family="Arial" font-size="34">'+cta+'</text><text x="90" y="930" fill="#999" font-family="Arial" font-size="22">'+city+'</text></svg>'
}
function presentation(){
  const c=esc($("company").value||"LA TUA ATTIVITÀ"),s=esc(selected().label);
  return '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>'+c+' — RealMediaPro</title><style>body{font-family:Arial;color:#171717;margin:0}section{min-height:90vh;padding:55px;box-sizing:border-box;page-break-after:always}h1{font-size:46px}h2{font-size:30px}.box{border:1px solid #ccc;padding:22px;margin:18px 0}.price{font-size:36px;font-weight:700;color:#9b7a32}</style></head><body><section><h1>'+c+'</h1><p>'+s+'</p><h2>Un sistema per acquisire e riattivare clienti durante l’anno.</h2><div class="box"><div class="price">50 € attivazione</div><div class="price">100 € / mese</div><p>Nessun vincolo. Puoi disdire quando vuoi.</p></div></section><section><h2>Cosa comprende</h2><div class="box">1 campagna Email al mese</div><div class="box">1 campagna WhatsApp al mese</div><div class="box">4 contenuti al mese su 4 piattaforme</div><div class="box">CRM + automazioni</div></section><section><h2>Extra</h2><p>Le lavorazioni fuori standard vengono richieste separatamente.</p><div class="box"><b>100 €</b> per lavorazione aggiuntiva.</div><p>Eventuali costi esterni, API, advertising, stampa e servizi a consumo sono esclusi.</p></section></body></html>'
}
function download(name,data,type){
  const a=document.createElement("a"),u=URL.createObjectURL(new Blob([data],{type}));
  a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),500)
}
function render(){
  const c=$("company").value||"La tua attività",d=copy();
  $("output").innerHTML='<h2>Output — '+esc(c)+'</h2><div class="actions"><button id="svg">SCARICA GRAFICA</button><button id="pres">SCARICA PRESENTAZIONE A4</button><button id="email">COPIA EMAIL</button><button id="wa">COPIA WHATSAPP</button></div><div class="content"><b>EMAIL</b><pre>'+esc(d.subject+"\n\n"+d.email)+'</pre></div><div class="content"><b>WHATSAPP</b><pre>'+esc(d.whatsapp)+'</pre></div><div class="content"><b>4 CONTENUTI</b><pre>'+esc(d.posts.join("\n\n"))+'</pre></div><div class="content"><b>ANGOLI DEL SETTORE</b><p class="muted">'+esc(d.angles.join(" · "))+'</p></div>';
  $("svg").onclick=()=>download("campagna-"+c.replace(/\W+/g,"-")+".svg",graphic(),"image/svg+xml");
  $("pres").onclick=()=>download("presentazione-"+c.replace(/\W+/g,"-")+".html",presentation(),"text/html");
  $("email").onclick=()=>navigator.clipboard.writeText(d.subject+"\n\n"+d.email);
  $("wa").onclick=()=>navigator.clipboard.writeText(d.whatsapp);
}
$("generate").onclick=render;
init();