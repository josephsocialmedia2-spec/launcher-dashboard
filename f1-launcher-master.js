(() => {
  "use strict";

  const page = (location.pathname.split("/").pop() || "ricerca-territoriale.html").toLowerCase();
  const slug = page.replace(/\.html?$/,"").replace(/[^a-z0-9]+/g,"-");
  const body = document.body;
  if (!body) return;

  body.classList.add("f1-master-ui", "f1-page-" + slug);

  const nav = [
    ["Dashboard","ricerca-territoriale.html","dashboard"],
    ["Ricerca territoriale","ricerca-territoriale.html#territorio","territorio"],
    ["Notizie","albero-fonti-notizie.html","notizie"],
    ["Immobili","crm.html#immobili","immobili"],
    ["Contatti","crm.html#contatti","contatti"],
    ["CRM","crm.html","crm"],
    ["Agenda","oggi.html#tasks","agenda"],
    ["Documenti","documenti-vendita.html","documenti"],
    ["Report","centrale-risultati.html","report"],
    ["Accessi ufficio","accessi-ufficio.html","accessi"],
    ["Impostazioni","setup-cloud.html?return=ricerca-territoriale.html","impostazioni"]
  ];

  const icons = {
    dashboard:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" stroke-width="1.7"/></svg>',
    territorio:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2" stroke="currentColor" stroke-width="1.7"/></svg>',
    notizie:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 11v2m3-5v8l9 3V5L7 8Zm9 2h3m-3-4 2-2m-2 12 2 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    immobili:'<svg viewBox="0 0 24 24" fill="none"><path d="m3 11 9-7 9 7v9h-6v-6H9v6H3v-9Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    contatti:'<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 20c.5-4 2.2-6 5.5-6s5 2 5.5 6M16 8h5m-2.5-2.5V10.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    crm:'<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5" rx="7" ry="3" stroke="currentColor" stroke-width="1.7"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5m-14 7v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" stroke="currentColor" stroke-width="1.7"/></svg>',
    agenda:'<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 3v4m8-4v4M4 10h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    documenti:'<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" stroke-width="1.7"/><path d="M14 3v5h5M9 12h6m-6 4h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    report:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 20V10m7 10V4m7 16v-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    accessi:'<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="m12 12 8-8m-3 3 3 3m-6 0 3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    impostazioni:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.5 6A7 7 0 0 0 9 7.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.5 18l.2 2.6h4L15 18a7 7 0 0 0 1.5-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  };

  function isActive(href){
    const u = href.split("#")[0].split("?")[0].toLowerCase();
    if (page !== u) return false;
    const hash = href.includes("#") ? "#" + href.split("#")[1] : "";
    if (!hash) return !location.hash || page !== "ricerca-territoriale.html";
    return location.hash === hash;
  }

  const existingSidebar = document.querySelector("aside.sidebar, .sidebar[aria-label*='Navigazione']");
  const isTreePage = page === "albero-fonti-notizie.html";

  if (!existingSidebar && !isTreePage){
    const aside = document.createElement("aside");
    aside.className = "f1-master-sidebar";
    aside.setAttribute("aria-label","Navigazione principale F1");
    aside.innerHTML =
      '<div class="f1-master-brand"><b>F1 IMMOBILIARE</b><span>CENTRO OPERATIVO DIGITALE</span></div>' +
      '<nav class="f1-master-nav">' +
      nav.map(([label,href,key]) =>
        '<a href="' + href + '" class="' + (isActive(href) ? 'is-active' : '') + '"' +
        (isActive(href) ? ' aria-current="page"' : '') + '>' +
        (icons[key] || '') + '<span>' + label + '</span></a>'
      ).join("") +
      '</nav>' +
      '<div class="f1-master-sidefoot"><b>PERSONE · CASE · TERRITORIO</b>Struttura unica, funzioni dedicate.</div>';
    body.prepend(aside);
    body.classList.add("f1-master-has-sidebar");
  } else {
    body.classList.add("f1-master-native-sidebar");
  }

  if (!isTreePage){
    const toggle = document.createElement("button");
    toggle.className = "f1-master-menu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label","Apri o chiudi navigazione");
    toggle.setAttribute("aria-expanded","false");
    toggle.textContent = "☰";
    toggle.addEventListener("click",() => {
      const open = body.classList.toggle("f1-master-menu-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "×" : "☰";
    });
    body.append(toggle);

    document.addEventListener("click",(ev) => {
      if (!body.classList.contains("f1-master-menu-open")) return;
      const target = ev.target;
      const side = document.querySelector(".f1-master-sidebar, aside.sidebar");
      if (target === toggle || side?.contains(target)) return;
      body.classList.remove("f1-master-menu-open");
      toggle.setAttribute("aria-expanded","false");
      toggle.textContent = "☰";
    });
  }

  // Keep active state synchronized with hash navigation without altering routing.
  window.addEventListener("hashchange",() => {
    document.querySelectorAll(".f1-master-nav a").forEach(a => {
      const href = a.getAttribute("href") || "";
      const active = isActive(href);
      a.classList.toggle("is-active", active);
      if (active) a.setAttribute("aria-current","page");
      else a.removeAttribute("aria-current");
    });
  });

  // Preserve existing anchors and make the territory target land below the sticky chrome.
  if (location.hash === "#territorio"){
    requestAnimationFrame(() => {
      const target = document.getElementById("territorio");
      if (target) target.style.scrollMarginTop = "84px";
    });
  }
  
  // Complete the operational menu without removing native entries.
  // Campaign destinations are intentionally separate: F1 campaign hub vs Real Media Pro campaign page.
  const campaignLinks = [
    {
      label: "CAMPAGNE REALMEDIAPRO",
      href: "https://f1immobiliare.com/pages/gggg",
      cls: "f1-campaign-realmedia",
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" stroke="currentColor" stroke-width="1.7"/><path d="M8 12h8M8 15h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
    },
    {
      label: "CAMPAGNE F1 IMMOBILIARE",
      href: "https://josephsocialmedia2-spec.github.io/open-social-scheduler/f1-content-hub/",
      cls: "f1-campaign-f1",
      icon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5h14v14H5z" stroke="currentColor" stroke-width="1.7"/><path d="M8 15.5 10.8 12l2.2 2 3-4 1 1.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  ];

  function ensureCampaignSection(sidebar){
    if (!sidebar || sidebar.querySelector(".f1-campaign-section")) return;
    const section = document.createElement("div");
    section.className = "f1-campaign-section";
    section.setAttribute("aria-label","Campagne");
    section.innerHTML =
      '<div class="f1-campaign-divider" aria-hidden="true"></div>' +
      '<div class="f1-campaign-title">CAMPAGNE</div>' +
      campaignLinks.map(item =>
        '<a class="f1-campaign-link ' + item.cls + '" href="' + item.href + '" target="_self">' +
          item.icon + '<span>' + item.label + '</span>' +
        '</a>'
      ).join("");
    sidebar.appendChild(section);
  }

  function ensureNativeEntries(sidebar){
    if (!sidebar) return;
    const existingHrefs = new Set(
      Array.from(sidebar.querySelectorAll("a")).map(a => (a.getAttribute("href") || "").split("#")[0])
    );
    const footer = sidebar.querySelector(".sidebar-footer");
    const entries = [
      ["Assegna giro","giro-acquisizione.html","<i class=\"fa-solid fa-route\"></i>"],
      ["Social Publisher","https://josephsocialmedia2-spec.github.io/open-social-scheduler/","<i class=\"fa-solid fa-share-nodes\"></i>"]
    ];
    const fragment = document.createDocumentFragment();
    entries.forEach(([label,href,icon]) => {
      const base = href.split("#")[0];
      if (existingHrefs.has(base)) return;
      const a = document.createElement("a");
      a.className = "side-item f1-added-side-item";
      a.href = href;
      a.innerHTML = icon + "<span>" + label + "</span>";
      fragment.appendChild(a);
    });
    if (footer) sidebar.insertBefore(fragment, footer);
    else sidebar.appendChild(fragment);
  }

  function completeNavigation(){
    document.querySelectorAll("aside.sidebar, .f1-master-sidebar").forEach(sidebar => {
      if (sidebar.classList.contains("f1-master-sidebar")){
        ensureCampaignSection(sidebar);
      } else {
        ensureNativeEntries(sidebar);
        ensureCampaignSection(sidebar);
      }
    });
  }

  completeNavigation();
  requestAnimationFrame(completeNavigation);

})();
