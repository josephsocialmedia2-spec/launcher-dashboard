PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  cognome TEXT NOT NULL DEFAULT '',
  azienda TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  comune TEXT NOT NULL DEFAULT '',
  indirizzo TEXT NOT NULL DEFAULT '',
  civico TEXT NOT NULL DEFAULT '',
  tipo_contatto TEXT NOT NULL DEFAULT 'OTHER',
  stato TEXT NOT NULL DEFAULT 'DA_ANALIZZARE',
  fonte TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  pillar INTEGER NOT NULL DEFAULT 1,
  lead_score INTEGER NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL DEFAULT 'LOW',
  lead_reason TEXT NOT NULL DEFAULT '',
  immobile_id TEXT NOT NULL DEFAULT '',
  competitor_agency TEXT NOT NULL DEFAULT '',
  prossima_azione TEXT NOT NULL DEFAULT '',
  data_prossima_azione TEXT,
  last_contact TEXT,
  assigned_to TEXT NOT NULL DEFAULT '',
  privacy_basis TEXT NOT NULL DEFAULT '',
  do_not_contact INTEGER NOT NULL DEFAULT 0,
  rpo_status TEXT NOT NULL DEFAULT 'DA_VERIFICARE',
  market_data TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  property_id TEXT NOT NULL DEFAULT '',
  task_id TEXT,
  tipo TEXT NOT NULL DEFAULT 'NOTE',
  direction TEXT NOT NULL DEFAULT 'OUTBOUND',
  contenuto TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  prossima_azione TEXT NOT NULL DEFAULT '',
  data_prossima_azione TEXT,
  data_evento TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL DEFAULT '',
  property_id TEXT NOT NULL DEFAULT '',
  event_id TEXT NOT NULL DEFAULT '',
  pillar INTEGER NOT NULL DEFAULT 1,
  task_type TEXT NOT NULL DEFAULT 'REVIEW',
  reason TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  assigned_to TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN',
  completed_at TEXT,
  outcome TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contacts_nome ON contacts(nome, cognome);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(telefono);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_comune ON contacts(comune);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(stato);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(tipo_contatto);
CREATE INDEX IF NOT EXISTS idx_contacts_updated ON contacts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_contact_date ON notes(contact_id, data_evento DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);
