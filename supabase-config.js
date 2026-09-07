window.F1_SUPABASE = {
  url: localStorage.getItem('f1SupabaseUrl') || 'https://nqnmlsmeiynxbdojeyjt.supabase.co',
  anonKey: localStorage.getItem('f1SupabaseAnonKey') || 'sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu',
  table: 'contacts',
  visitsTable: 'field_visits'
};

// Territori operativi F1 aggiornati il 7 settembre 2026.
// Riferimento geografico: Villar Dora; Sant'Ambrogio di Torino resta escluso dall'acquisizione.
window.F1_TERRITORIES_2026 = {
  left: [
    'chianocco',
    'bruzolo',
    'san didero',
    'san giorio di susa',
    'borgone susa',
    'villar focchiardo',
    'condove',
    'caprie',
    'sant antonino di susa',
    'vaie',
    'chiusa di san michele',
    'sant ambrogio di torino',
    'rubiana',
    'valgioie',
    'coazze',
    'giaveno'
  ],
  right: [
    'almese',
    'avigliana',
    'val della torre',
    'givoletto',
    'la cassa',
    'varisella',
    'fiano',
    'robassomero',
    'san gillio',
    'druento',
    'caselette',
    'pianezza',
    'alpignano',
    'buttigliera alta',
    'rosta',
    'reano',
    'villarbasse',
    'trana',
    'rivoli',
    'collegno',
    'grugliasco',
    'rivalta di torino',
    'bruino',
    'beinasco'
  ],
  excluded: ['sant ambrogio di torino', 'sant ambrogio']
};

(function installF1TerritoryOverride(){
  const clean = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const aliases = {
    'san giorio': 'san giorio di susa',
    'borgone di susa': 'borgone susa',
    'sant antonino': 'sant antonino di susa'
  };

  setTimeout(function(){
    if (typeof window.territoryData !== 'function') return;

    window.territoryData = function(r){
      let z = clean(`${r && r.zone ? r.zone : ''} ${r && r.note ? r.note : ''}`);

      for (const [alias, canonical] of Object.entries(aliases)) {
        if (z.includes(alias)) z += ' ' + canonical;
      }

      for (const x of window.F1_TERRITORIES_2026.excluded) {
        if (z.includes(x)) return {score:-100,label:'territorio escluso · Sant\'Ambrogio',excluded:true};
      }

      for (const place of window.F1_TERRITORIES_2026.left) {
        if (z.includes(place)) return {score:30,label:'territorio SINISTRA · verso Susa',excluded:false};
      }

      for (const place of window.F1_TERRITORIES_2026.right) {
        if (z.includes(place)) return {score:24,label:'territorio DESTRA · verso Torino',excluded:false};
      }

      return {score:0,label:'zona non riconosciuta',excluded:false};
    };

    if (typeof window.render === 'function') window.render();
  }, 0);
})();