window.F1_SUPABASE = {
  url: localStorage.getItem('f1SupabaseUrl') || 'https://nqnmlsmeiynxbdojeyjt.supabase.co',
  anonKey: localStorage.getItem('f1SupabaseAnonKey') || 'sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu',
  table: 'contacts',
  visitsTable: 'field_visits'
};

// Unica source of truth territoriale: config/territory.json.
// Questo file configura esclusivamente l'accesso Supabase; non contiene liste di comuni.
window.F1_TERRITORY_CONFIG_URL = './config/territory.json';
