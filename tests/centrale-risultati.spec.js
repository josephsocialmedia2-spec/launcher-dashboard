const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

test('Centrale uses cloud approval source of truth and protected operations', async () => {
  const html=read('centrale-risultati.html'),cloud=read('centrale-cloud.js'),ui=read('centrale-risultati.js');
  expect(html).toContain('centrale-cloud.js');
  expect(html).toContain('supabase-sync.js');
  expect(html).toContain('f1-staff-data.js');
  expect(cloud).toContain("approval_queue?on_conflict=approval_id");
  expect(cloud).toContain("decision:'APPROVED'");
  expect(ui).toContain('APPROVED_PENDING_EXECUTION');
  expect(ui).toContain('PAGE_SIZE=50');
  expect(ui).toContain('STALE_HOURS=36');
});

test('Seller Radar completes only after dossier and canonical CRM upsert', async () => {
  const bridge=read('centrale-seller-bridge.js');
  expect(bridge).toContain("CROSS_VERSION='V4'");
  expect(bridge).toContain('F1AcquisitionData.upsertLead');
  expect(bridge).toContain("status:'DONE'");
  expect(bridge).toContain('dossier:result.cross');
  expect(bridge).toContain("status:'ERROR'");
  expect(bridge).toContain("action==='RETRY'");
});

test('Non Seller DONE never renders a dossier button', async () => {
  const ui=read('centrale-risultati.js');
  expect(ui).toContain("x?.module==='SELLER_RADAR'");
  expect(ui).toContain('COMPLETATO · DOSSIER');
  expect(ui).toContain('<span class="badge">COMPLETATO</span>');
});

test('Seller Radar archive hydrates approved dossiers from cloud', async () => {
  const bridge=read('seller-radar-cloud-archive.js');
  expect(bridge).toContain("module=eq.SELLER_RADAR&status=eq.DONE");
  expect(bridge).toContain("f1_territory_contacts_v1");
  expect(bridge).toContain("[CENTRALE:");
});

test('PWA keeps live feeds network-first and caches central shell', async () => {
  const sw=read('sw.js');
  for(const file of ['centrale-risultati.html','centrale-risultati.js','centrale-cloud.js','centrale-seller-bridge.js','seller-radar-cloud-archive.js'])expect(sw).toContain(file);
  for(const live of ['/data/approval-queue.json','/data/acquisition-public.json','/data/neighborhood_intelligence.json'])expect(sw).toContain(live);
  expect(sw).toContain('networkFirst(req)');
});

test('Seller Radar nightly refresh is bounded and V4', async () => {
  const workflow=read('.github/workflows/neighborhood-intelligence.yml'),engine=read('scripts/neighborhood_intelligence_v4.py');
  expect(workflow).toMatch(/F1_NEIGHBORHOOD_MAX_ENRICH:\s*'25'/);
  expect(engine).toContain("ENGINE_VERSION='4'");
  expect(engine).toContain("F1_NEIGHBORHOOD_MAX_ENRICH','25'");
});