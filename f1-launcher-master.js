(() => {
  "use strict";

  const page = (location.pathname.split("/").pop() || "ricerca-territoriale.html").toLowerCase();
  const slug = page.replace(/\.html?$/,"").replace(/[^a-z0-9]+/g,"-");
  const body = document.body;
  if (!body) return;

  body.classList.add("f1-master-ui", "f1-page-" + slug);

  const groups = [
    {
      label: "OGGI",
      items: [
        ["Notizie calde","oggi.html","hot"],
        ["Dashboard","oggi.html#dashboard","dashboard"],
        ["Agenda","oggi.html#tasks","agenda"],
        ["Telefonate","telefonate-oggi.html","telefonate"]
      ]
    },
    {
      label: "TERRITORIO",
      items: [
        ["Ricerca territoriale","ricerca-territoriale.html","territorio"],
        ["Notizie","albero-fonti-notizie.html","notizie"]
      ]
    },
    {
      label: "CLIENTI E IMMOBILI",
      items: [
        ["Contatti","crm.html#contatti","contatti"],
        ["Immobili","crm.html#immobili","immobili"],
        ["CRM","crm.html","crm"],
        ["Email Radar","f1-email-radar.html","email"]
      ]
    },
    {
      label: "LAVORO",
      items: [
        ["Documenti","documenti-vendita.html","documenti"],
        ["Report","centrale-risultati.html","report"]
      ]
    },
    {
      label: "FORMAZIONE",
      items: [
        ["F1 Academy","mike-ferry-script-trainer/","academy"]
      ]
    },
    {
      label: "SISTEMA",
      items: [
        ["Accessi ufficio","accessi-ufficio.html","accessi"],
        ["Impostazioni","setup-cloud.html?return=ricerca-territoriale.html","impostazioni"]
      ]
    }
  ];

  const icons = {
    hot:'<svg viewBox="0 0 24 24" fill="none"><path d="M13.2 3.5c.7 3-1 4.2-2.2 5.5-1.1 1.2-1.8 2.4-1.1 4.1.5-1.1 1.3-1.8 2.4-2.6-.1 2.1 1.8 2.7 1.8 5a3.9 3.9 0 0 1-7.8 0c0-4.8 3.8-6.7 6.9-12Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15.5 8.5c1.8 1.7 2.8 3.7 2.8 6.4a6.3 6.3 0 0 1-12.6 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    dashboard:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" stroke-width="1.7"/></svg>',
    territorio:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2" stroke="currentColor" stroke-width="1.7"/></svg>',
    notizie:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 11v2m3-5v8l9 3V5L7 8Zm9 2h3m-3-4 2-2m-2 12 2 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    immobili:'<svg viewBox="0 0 24 24" fill="none"><path d="m3 11 9-7 9 7v9h-6v-6H9v6H3v-9Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    contatti:'<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 20c.5-4 2.2-6 5.5-6s5 2 5.5 6M16 8h5m-2.5-2.5V10.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    crm:'<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5" rx="7" ry="3" stroke="currentColor" stroke-width="1.7"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5m-14 7v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" stroke="currentColor" stroke-width="1.7"/></svg>',
    agenda:'<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 3v4m8-4v4M4 10h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    telefonate:'<svg viewBox="0 0 24 24" fill="none"><path d="M7 4h3l1.2 4-2 1.4a14 14 0 0 0 5.4 5.4l1.4-2L20 14v3c0 1.7-1.3 3-3 3C9.8 20 4 14.2 4 7c0-1.7 1.3-3 3-3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    email:'<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    documenti:'<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" stroke-width="1.7"/><path d="M14 3v5h5M9 12h6m-6 4h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    report:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 20V10m7 10V4m7 16v-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    academy:'<svg viewBox="0 0 24 24" fill="none"><path d="m3 9 9-5 9 5-9 5-9-5Z" stroke="currentColor" stroke-width="1.7"/><path d="M7 12v4c3 2 7 2 10 0v-4M21 9v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    accessi:'<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="m12 12 8-8m-3 3 3 3m-6 0 3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    impostazioni:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.5 6A7 7 0 0 0 9 7.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.5 18l.2 2.6h4L15 18a7 7 0 0 0 1.5-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  };

  function hrefPage(href){
    return href.split("#")[0].split("?")[0].replace(/^\.\//,"").replace(/\/$/,"/index.html").toLowerCase();
  }

  function isActive(href){
    const target = hrefPage(href);
    const current = page === "" ? "index.html" : page;
    if (target.includes("/")) return location.pathname.toLowerCase().endsWith(target);
    if (current !== target) return false;
    const hash = href.includes("#") ? "#" + href.split("#")[1] : "";
    if (!hash) return !location.hash;
    return location.hash === hash;
  }

  function itemHtml([label,href,key]){
    const active=isActive(href);
    const hot=key==='hot';
    return '<a href="'+href+'" class="'+(active?'is-active ':'')+(hot?'f1-hot-news-link':'')+'"'+(active?' aria-current="page"':'')+(hot?' data-hot-news-nav="1"':'')+'>'+
      (icons[key]||'')+'<span>'+label+'</span></a>';
  }

  function masterNavHtml(){
    return groups.map(group =>
      '<section class="f1-master-nav-group" aria-label="'+group.label+'">'+
      '<span class="f1-master-nav-label">'+group.label+'</span>'+
      group.items.map(itemHtml).join("")+
      '</section>'
    ).join("");
  }

  const existingSidebar = document.querySelector("aside.sidebar, .sidebar[aria-label*='Navigazione']");
  const isTreePage = page === "albero-fonti-notizie.html";

  if (!existingSidebar && !isTreePage){
    const aside = document.createElement("aside");
    aside.className = "f1-master-sidebar";
    aside.setAttribute("aria-label","Navigazione principale F1");
    aside.innerHTML =
      '<div class="f1-master-brand"><b>F1 IMMOBILIARE</b><span>CENTRALE OPERATIVA</span></div>' +
      '<nav class="f1-master-nav">' + masterNavHtml() + '</nav>' +
      '<div class="f1-master-sidefoot"><b>PERSONE · CASE · TERRITORIO</b>Parti dalla Dashboard. Gli strumenti sono raggruppati per attività.</div>';
    body.prepend(aside);
    body.classList.add("f1-master-has-sidebar");
  } else {
    body.classList.add("f1-master-native-sidebar");
  }

  function nativeGroupFor(href){
    const p=hrefPage(href);
    if(p==="ricerca-territoriale.html") return href.includes("#territorio") ? "TERRITORIO" : "OGGI";
    if(p==="oggi.html"||p==="telefonate-oggi.html") return "OGGI";
    if(p==="albero-fonti-notizie.html"||p==="territory-mobile.html") return "TERRITORIO";
    if(p==="crm.html"||p==="f1-email-radar.html") return "CLIENTI E IMMOBILI";
    if(p==="documenti-vendita.html"||p==="centrale-risultati.html") return "LAVORO";
    if(p.startsWith("mike-ferry-script-trainer/")) return "FORMAZIONE";
    if(p==="accessi-ufficio.html"||p==="setup-cloud.html") return "SISTEMA";
    return "";
  }

  function groupNativeSidebar(sidebar){
    if(!sidebar || sidebar.querySelector(".nav-group-label,.f1-nav-group-label")) return;
    let previous="";
    [...sidebar.querySelectorAll("a.side-item")].forEach(link=>{
      const group=nativeGroupFor(link.getAttribute("href")||"");
      if(group && group!==previous){
        const label=document.createElement("span");
        label.className="f1-nav-group-label";
        label.textContent=group;
        link.before(label);
        previous=group;
      }
    });
  }

  groupNativeSidebar(existingSidebar);

  function syncNativeActive(){
    if(!existingSidebar) return;
    existingSidebar.querySelectorAll("a.side-item").forEach(a=>{
      const href=a.getAttribute("href")||"";
      const active=isActive(href);
      a.classList.toggle("f1-route-active",active);
      if(active)a.setAttribute("aria-current","page");
      else if(!a.classList.contains("active")&&!a.classList.contains("active-secondary"))a.removeAttribute("aria-current");
    });
  }
  syncNativeActive();

  if (!isTreePage){
    const toggle = document.createElement("button");
    toggle.className = "f1-master-menu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label","Apri navigazione");
    toggle.setAttribute("aria-expanded","false");
    toggle.textContent = "☰";
    toggle.addEventListener("click",() => {
      const open = body.classList.toggle("f1-master-menu-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Chiudi navigazione" : "Apri navigazione");
      toggle.textContent = open ? "×" : "☰";
    });
    body.append(toggle);

    document.addEventListener("click",(ev) => {
      if (!body.classList.contains("f1-master-menu-open")) return;
      const target = ev.target;
      const side = document.querySelector(".f1-master-sidebar, aside.sidebar");
      if (target === toggle) return;
      if (side?.contains(target) && target.closest("a")){
        body.classList.remove("f1-master-menu-open");
        toggle.setAttribute("aria-expanded","false");
        toggle.setAttribute("aria-label","Apri navigazione");
        toggle.textContent = "☰";
        return;
      }
      if (side?.contains(target)) return;
      body.classList.remove("f1-master-menu-open");
      toggle.setAttribute("aria-expanded","false");
      toggle.setAttribute("aria-label","Apri navigazione");
      toggle.textContent = "☰";
    });
  }

  window.addEventListener("hashchange",() => {
    document.querySelectorAll(".f1-master-nav a").forEach(a => {
      const href = a.getAttribute("href") || "";
      const active = isActive(href);
      a.classList.toggle("is-active", active);
      if (active) a.setAttribute("aria-current","page");
      else a.removeAttribute("aria-current");
    });
    syncNativeActive();
  });

  if (location.hash === "#territorio"){
    requestAnimationFrame(() => {
      const target = document.getElementById("territorio");
      if (target) target.style.scrollMarginTop = "84px";
    });
  }
})();
