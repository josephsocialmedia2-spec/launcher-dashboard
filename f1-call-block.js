(function(){
  'use strict';
  const TARGET='telefonate-oggi.html';
  const START=9*60+30;
  const END=12*60+30;
  const CHECK_MS=15000;
  let redirectTimer=null;

  function inCallBlock(d=new Date()){
    const day=d.getDay();
    const minutes=d.getHours()*60+d.getMinutes();
    return day>=1&&day<=5&&minutes>=START&&minutes<END;
  }

  function secondsToEnd(d=new Date()){
    const end=new Date(d);
    end.setHours(12,30,0,0);
    return Math.max(0,Math.floor((end-d)/1000));
  }

  function fmt(sec){
    return String(Math.floor(sec/3600)).padStart(2,'0')+':'+
      String(Math.floor((sec%3600)/60)).padStart(2,'0')+':'+
      String(sec%60).padStart(2,'0');
  }

  function ensureOverlay(){
    let el=document.getElementById('f1CallBlockGate');
    if(el)return el;
    el=document.createElement('div');
    el.id='f1CallBlockGate';
    el.innerHTML='<div class="f1-call-gate-card"><div class="f1-call-gate-kicker">BLOCCO OPERATIVO OBBLIGATORIO</div><div class="f1-call-gate-title">09:30–12:30 · TELEFONATE</div><div id="f1CallGateText" class="f1-call-gate-text">Preparazione della coda da 50 contatti…</div><a class="f1-call-gate-button" href="'+TARGET+'">APRI TELEFONATE ORA</a></div>';
    const style=document.createElement('style');
    style.id='f1CallBlockGateStyle';
    style.textContent='#f1CallBlockGate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(2,5,3,.92);backdrop-filter:blur(9px)}.f1-call-gate-card{width:min(92vw,620px);padding:28px;border:2px solid #39f28a;border-radius:18px;background:#0b120d;color:#fff;text-align:center;box-shadow:0 24px 90px rgba(0,0,0,.55)}.f1-call-gate-kicker{color:#39f28a;font:900 11px/1.2 Arial,sans-serif;letter-spacing:.14em}.f1-call-gate-title{margin:10px 0 8px;font:900 clamp(28px,7vw,48px)/1 Arial,sans-serif}.f1-call-gate-text{margin:0 0 18px;color:#c3cdc6;font:700 13px/1.5 Arial,sans-serif}.f1-call-gate-button{display:block;padding:16px 18px;border-radius:12px;background:#39f28a;color:#061009!important;text-decoration:none!important;font:900 15px/1 Arial,sans-serif}';
    document.head.appendChild(style);
    document.body.appendChild(el);
    return el;
  }

  function removeOverlay(){
    document.getElementById('f1CallBlockGate')?.remove();
    if(redirectTimer){clearTimeout(redirectTimer);redirectTimer=null;}
  }

  function enforce(){
    const now=new Date();
    if(!inCallBlock(now)){removeOverlay();return;}
    if(location.pathname.endsWith('/'+TARGET)||location.pathname.endsWith(TARGET))return;
    ensureOverlay();
    const text=document.getElementById('f1CallGateText');
    if(text)text.textContent='Fino alle 12:30 fai solo chiamate. Tempo residuo: '+fmt(secondsToEnd(now))+'. Apertura automatica della coda in corso.';
    if(!redirectTimer){
      redirectTimer=setTimeout(()=>{location.href=TARGET;},2500);
    }
  }

  window.addEventListener('DOMContentLoaded',enforce);
  setInterval(enforce,CHECK_MS);
})();