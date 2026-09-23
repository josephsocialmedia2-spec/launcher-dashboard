(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.F1CascadeEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const STOPWORDS=new Set(('a ad al alla alle allo ai agli anche ancora avere abbiamo avete aveva avevi avevano che chi ci cioè con come da dal dalla dalle dallo dei del della delle dello dentro di e ed è era erano essere fa fai fanno fare fino fra gli ha hai hanno ho i il in io la le lei li lo lui ma mi mia mie miei mio ne nei nel nella nelle nello no non noi o ogni per perché piu più può quando quale quali quanto questa queste questi questo se sei senza si sia siamo sono su sul sulla sulle tra tu tua tue tuoi tuo un una uno vi voi un una uno degli delle della dello del dei'.split(/\s+/)));
  const WEAK=new Set(('cliente persona persone cosa cose lavoro lavorare lavorato fare fatto fatta fatti oggi giorno giorni volta modo parte punto primo prima dopo dove serve usare avere essere viene vengono andare molto solo sempre nuovo nuova nuovi nuove elemento elementi concetto concetti'.split(/\s+/)));

  const CONCEPT_MODEL=[
    {id:'MENTALITA',label:'MENTALITÀ',type:'BASE',rx:/testa|mental|insicur|fortuna|costanz|disciplina|convin[ct]|paura|atteggiamento/i},
    {id:'OBIETTIVI',label:'OBIETTIVI E NUMERI',type:'OBJECTIVE',rx:/obiettivo|kpi|quota|traguard|misur|agenda|settimana|target/i},
    {id:'RELAZIONI',label:'RELAZIONI',type:'SOURCE',rx:/rubrica|famigli|parent|amic|conoscen|scuola|sport|hobby|collegh|vicin|social|whatsapp|facebook|instagram|linkedin/i},
    {id:'ZONA',label:'ZONA',type:'SOURCE',rx:/zona|porta a porta|quartiere|territorio|ricerca in zona|proprietar/i},
    {id:'INFLUENZA',label:'CENTRI DI INFLUENZA',type:'SOURCE',rx:/centri? di influenza|barista|edicolante|parrucchiere|commercialista|farmacista|medico|assicuratore|benzinaio|negozi/i},
    {id:'TELEFONO',label:'TELEFONO',type:'ACTION',rx:/telefono|telefonat|chiam|contatti|richiam|prospecting/i},
    {id:'FORMAZIONE',label:'PREPARAZIONE',type:'PREREQUISITE',rx:/formazione|role play|prepar|conversazioni a voce alta|allenamento/i},
    {id:'ASCOLTO',label:'ASCOLTO E COMPRENSIONE',type:'ACTION',rx:/ascolt|capire|parlare troppo|silenz|difender|tensione|domande|comprendere/i},
    {id:'NOTIZIA',label:'NOTIZIA',type:'RESULT',rx:/notizia|segnalaz|materia prima/i},
    {id:'APPUNTAMENTO',label:'APPUNTAMENTO',type:'RESULT',rx:/appuntament|fissare appunt/i},
    {id:'INCARICO',label:'INCARICO',type:'RESULT',rx:/incaric|presa incarico|prese incarico/i},
    {id:'COMPRAVENDITA',label:'COMPRAVENDITA',type:'RESULT',rx:/compravend|transazion|vendita/i},
    {id:'FATTURATO',label:'FATTURATO',type:'KPI',rx:/fatturato|provvig|commission/i}
  ];

  function norm(s){
    return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }
  function sourceRecords(text){
    const rows=String(text||'').replace(/\r/g,'').split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
    const seen=new Set(), out=[];
    for(const row of rows){
      const k=norm(row);
      if(!seen.has(k)){seen.add(k);out.push({id:out.length+1,text:row});}
    }
    return out;
  }
  function tokens(text){
    return (norm(text).match(/[a-z0-9%€]+/g)||[]).filter(w=>w.length>=3&&!STOPWORDS.has(w)&&!WEAK.has(w)&&!/^\d+$/.test(w));
  }
  function cueLabel(text){
    const s=String(text||'').trim();
    const numeric=(s.match(/(?:€\s*)?\d[\d. ]*(?:,\d+)?\s*(?:%|€|euro)?/gi)||[])
      .map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>/%|€|euro/i.test(x));
    const ts=tokens(s), seen=new Set(), words=[];
    for(const w of ts){
      if(!seen.has(w)){seen.add(w);words.push(w.toUpperCase());}
      if(words.length>=3)break;
    }
    const prefix=numeric.slice(0,1).map(x=>x.toUpperCase());
    return [...prefix,...words].slice(0,4).join(' • ')||s.slice(0,42).toUpperCase()||'CONCETTO';
  }
  function parseNumber(raw){
    let s=String(raw||'').toLowerCase().replace(/\s+/g,'').replace(/€/g,'').replace(/euro/g,'');
    if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
    else if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');
    else s=s.replace(',','.');
    return Number(s);
  }
  function euro(n){const s=String(Math.round(Number(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');return s+' €';}
  function pct(n){const v=Math.round(Number(n)*100)/100;return String(v).replace('.',',')+'%';}
  function moneyValues(text){
    const out=[]; let m;
    const re=/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?|\d{4,})\s*(?:€|euro)?/gi;
    while((m=re.exec(String(text||'')))){
      const n=parseNumber(m[1]);
      const ctx=String(text||'').slice(Math.max(0,m.index-28),Math.min(String(text||'').length,re.lastIndex+28)).toLowerCase();
      if(Number.isFinite(n)&&n>=100&&(/[€]|euro/.test(m[0].toLowerCase())||/prezzo|casa|immobile|fatturato|provvig|commission|vendit|acquir|operazione|transaz/.test(ctx)))out.push(n);
    }
    return [...new Set(out.map(n=>Math.round(n)))];
  }
  function percentageValues(text){
    const out=[]; let m; const re=/(\d+(?:[.,]\d+)?)\s*%/g;
    while((m=re.exec(String(text||'')))){const n=parseNumber(m[1]);if(Number.isFinite(n))out.push(n);}
    return out;
  }
  function matchIndex(text,rx){
    const r=new RegExp(rx.source,rx.flags.replace('g',''));
    const m=r.exec(text);
    return m?m.index:-1;
  }
  function relationFromText(text){
    const s=norm(text);
    if(/\+|somma|totale|complessiv/.test(s))return {type:'SUMS_TO',label:'somma a'};
    if(/genera|porta a|produce|ottien|diventa|si traduce|risulta|quindi|percio|pertanto/.test(s))return {type:'LEADS_TO',label:'porta a'};
    if(/richiede|necessita|serve prima|prima di/.test(s))return {type:'REQUIRES',label:'richiede'};
    if(/parte di|rientra in|appartiene/.test(s))return {type:'PART_OF',label:'fa parte di'};
    if(/si divide|due lati|due transaz|entrambi i lati/.test(s))return {type:'SPLITS_INTO',label:'si divide in'};
    if(/prima|poi|successiv|dopo/.test(s))return {type:'SEQUENCE',label:'poi'};
    return {type:'RELATED',label:'collegato'};
  }
  function jaccard(a,b){
    const A=new Set(a),B=new Set(b);
    if(!A.size||!B.size)return 0;
    let i=0; for(const x of A)if(B.has(x))i++;
    return i/(A.size+B.size-i);
  }
  function genericClusters(records){
    if(!records.length)return [];
    const n=records.length,parent=Array.from({length:n},(_,i)=>i);
    const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
    const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
    const tok=records.map(r=>tokens(r.text));
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      const shared=tok[i].filter(x=>tok[j].includes(x)).length;
      const score=jaccard(tok[i],tok[j]);
      if(score>=0.28 || shared>=2)union(i,j);
    }
    const groups=new Map();
    records.forEach((r,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);});
    return [...groups.values()];
  }
  function clusterLabel(records){
    const freq=new Map();
    for(const r of records)for(const t of tokens(r.text))freq.set(t,(freq.get(t)||0)+1);
    const ranked=[...freq.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).slice(0,3).map(x=>x[0].toUpperCase());
    return ranked.join(' • ')||cueLabel(records[0]?.text||'ALTRI CONCETTI');
  }
  function detectEconomy(records){
    const all=records.map(r=>r.text).join(' ');
    const low=norm(all);
    if(!/compravend|immobil|casa|provvig|commission|venditore|acquirente|fatturato|transazion/.test(low))return null;
    const vals=moneyValues(all).sort((a,b)=>b-a);
    const percs=percentageValues(all);
    if(!vals.length)return null;
    const sourceIds=records.filter(r=>/compravend|immobil|casa|provvig|commission|venditore|acquirente|fatturato|transazion|\d+[.,]?\d*\s*%/i.test(r.text)).map(r=>r.id);
    const property=vals[0];
    const explicitTotal=vals.find(v=>v<property&&v/property>=0.005&&v/property<=0.20)||null;
    const hasSeller=/venditore/.test(low),hasBuyer=/acquirente/.test(low),hasTwo=/due\s+transazion|2\s+transazion|due\s+lati/.test(low);
    let sellerPct=null,buyerPct=null;
    if(percs.length>=2){sellerPct=percs[0];buyerPct=percs[1];}
    let seller=null,buyer=null,total=explicitTotal;
    if(sellerPct!=null&&buyerPct!=null){
      seller=property*sellerPct/100; buyer=property*buyerPct/100;
      if(total==null)total=seller+buyer;
    }else if(total!=null&&(hasTwo||(hasSeller&&hasBuyer))){
      seller=total/2;buyer=total/2;
    }
    if(!seller&&!buyer&&!total)return null;
    const nodes=[],edges=[];
    const add=(id,label,type,value,unit)=>nodes.push({id,label,type,sourceIds:[...sourceIds],value:value??null,unit:unit||null,description:label,parentIds:[],childIds:[],confidence:1,level:1});
    add('econ-property',euro(property)+' IMMOBILE','DATA',property,'EUR');
    if(hasTwo||(seller!=null&&buyer!=null))add('econ-split','2 TRANSAZIONI','STRUCTURE',2,'COUNT');
    if(seller!=null)add('econ-seller',euro(seller)+' VENDITORE'+(sellerPct!=null?' ('+pct(sellerPct)+')':''),'CALCULATION',seller,'EUR');
    if(buyer!=null)add('econ-buyer',euro(buyer)+' ACQUIRENTE'+(buyerPct!=null?' ('+pct(buyerPct)+')':''),'CALCULATION',buyer,'EUR');
    if(total!=null)add('econ-total',euro(total)+' FATTURATO','RESULT',total,'EUR');
    const E=(from,to,type,label)=>edges.push({id:'e'+(edges.length+1),from,to,type,label,sourceIds:[...sourceIds],confidence:1});
    if(nodes.some(n=>n.id==='econ-split'))E('econ-property','econ-split','SPLITS_INTO','si divide in');
    if(nodes.some(n=>n.id==='econ-seller'))E(nodes.some(n=>n.id==='econ-split')?'econ-split':'econ-property','econ-seller','SPLITS_INTO','lato venditore');
    if(nodes.some(n=>n.id==='econ-buyer'))E(nodes.some(n=>n.id==='econ-split')?'econ-split':'econ-property','econ-buyer','SPLITS_INTO','lato acquirente');
    if(nodes.some(n=>n.id==='econ-total')){
      if(nodes.some(n=>n.id==='econ-seller'))E('econ-seller','econ-total','SUMS_TO','+');
      if(nodes.some(n=>n.id==='econ-buyer'))E('econ-buyer','econ-total','SUMS_TO','+');
    }
    return {nodes,edges,sourceIds};
  }
  function analyze(text){
    const sources=sourceRecords(text);
    const byConcept=new Map(CONCEPT_MODEL.map(c=>[c.id,[]]));
    const sourceConcepts=new Map();
    const unmatched=[];
    for(const r of sources){
      const hits=[];
      for(const c of CONCEPT_MODEL){
        if(c.rx.test(r.text)){byConcept.get(c.id).push(r);hits.push(c.id);}
      }
      sourceConcepts.set(r.id,hits);
      if(!hits.length)unmatched.push(r);
    }

    let nodes=[{id:'root',label:'MAPPA DEL BLOCCO 2',type:'ROOT',sourceIds:sources.map(s=>s.id),value:null,unit:null,description:'Sintesi dell’intero Blocco 2',parentIds:[],childIds:[],confidence:1,level:1}];
    let edges=[];

    for(const c of CONCEPT_MODEL){
      const rs=byConcept.get(c.id);
      if(rs.length){
        nodes.push({id:'c-'+c.id.toLowerCase(),label:c.label,type:c.type,sourceIds:rs.map(r=>r.id),value:null,unit:null,description:rs.map(r=>r.text).join(' '),parentIds:['root'],childIds:[],confidence:1,level:1});
      }
    }

    const genericGroups=genericClusters(unmatched);
    const genericMacros=[];
    const singleton=[];
    genericGroups.forEach((g,i)=>{
      if(g.length===1)singleton.push(...g);
      else genericMacros.push({id:'g-'+i,label:clusterLabel(g),type:'CONCEPT',sourceIds:g.map(r=>r.id),value:null,unit:null,description:g.map(r=>r.text).join(' '),parentIds:['root'],childIds:[],confidence:0.75,level:1});
    });
    nodes.push(...genericMacros);
    if(singleton.length){
      nodes.push({id:'g-other',label:'ALTRI CONCETTI',type:'CONCEPT',sourceIds:singleton.map(r=>r.id),value:null,unit:null,description:singleton.map(r=>r.text).join(' '),parentIds:['root'],childIds:[],confidence:0.55,level:1});
    }

    const economy=detectEconomy(sources);
    if(economy){
      nodes=nodes.filter(n=>!['c-compravendita','c-fatturato'].includes(n.id));
      nodes.push(...economy.nodes);
    }

    const macroNodes=nodes.filter(n=>n.level===1&&n.id!=='root');
    for(const n of macroNodes){
      if(n.id.startsWith('econ-'))continue;
      edges.push({id:'root-'+n.id,from:'root',to:n.id,type:'CONTAINS',label:'comprende',sourceIds:[...n.sourceIds],confidence:1});
    }

    for(const r of sources){
      const hits=sourceConcepts.get(r.id)||[];
      if(hits.length>=2){
        const rel=relationFromText(r.text);
        const ordered=[...hits].sort((a,b)=>{
          const A=CONCEPT_MODEL.find(c=>c.id===a),B=CONCEPT_MODEL.find(c=>c.id===b);
          return matchIndex(r.text,A.rx)-matchIndex(r.text,B.rx);
        });
        for(let i=0;i<ordered.length-1;i++){
          const from='c-'+ordered[i].toLowerCase(),to='c-'+ordered[i+1].toLowerCase();
          if(nodes.some(n=>n.id===from)&&nodes.some(n=>n.id===to)){
            const key=from+'>'+to+'>'+rel.type;
            if(!edges.some(e=>e.from+'>'+e.to+'>'+e.type===key))edges.push({id:'rel-'+r.id+'-'+i,from,to,type:rel.type,label:rel.label,sourceIds:[r.id],confidence:0.85});
          }
        }
      }
    }
    if(economy)edges.push(...economy.edges);

    const detailNodes=[];
    const detailEdges=[];
    for(const r of sources){
      const id='s-'+r.id;
      detailNodes.push({id,label:cueLabel(r.text),type:'DETAIL',sourceIds:[r.id],value:null,unit:null,description:r.text,parentIds:[],childIds:[],confidence:1,level:2});
      const parents=[];
      for(const n of nodes.filter(n=>n.id!=='root'&&n.level===1)){
        if(n.sourceIds.includes(r.id))parents.push(n.id);
      }
      if(!parents.length)parents.push('root');
      for(const p of parents)detailEdges.push({id:'detail-'+id+'-'+p,from:p,to:id,type:'DETAIL_OF',label:'dettaglio',sourceIds:[r.id],confidence:1});
    }

    nodes.push(...detailNodes);
    edges.push(...detailEdges);

    for(const e of edges){
      const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);
      if(a&&!a.childIds.includes(e.to))a.childIds.push(e.to);
      if(b&&!b.parentIds.includes(e.from))b.parentIds.push(e.from);
    }

    const essentialNodes=nodes.filter(n=>n.level===1);
    const essentialEdges=edges.filter(e=>!String(e.id).startsWith('detail-'));
    return {
      version:'evidence-graph-1',
      sources,
      nodes,
      edges,
      essentialNodes,
      essentialEdges,
      metrics:{
        input:sources.length,
        analyzed:sources.length,
        clusters:essentialNodes.filter(n=>n.id!=='root').length,
        nodes:essentialNodes.length,
        detailNodes:detailNodes.length,
        relations:essentialEdges.length,
        coverage:sources.length?1:0
      }
    };
  }

  return {analyze,sourceRecords,cueLabel,relationFromText};
});
