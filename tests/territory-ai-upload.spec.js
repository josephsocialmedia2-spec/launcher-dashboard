const { test, expect } = require('@playwright/test');
const fs = require('fs');
const vm = require('vm');

test('F1 Territory exposes complete CRM AI upload flow', async () => {
  const html = fs.readFileSync('territory-mobile.html', 'utf8');
  expect(html).toContain('id="uploadCRMToAI"');
  expect(html).toContain('🤖 CARICA SU IA');
  expect(html).toContain('https://chatgpt.com/c/6a96ef0b-789c-83eb-80ea-b88137c3a5e1');
  expect(html).toContain("const AI_BRIDGE_URL='http://127.0.0.1:8765/chatgpt-upload'");
  expect(html).toContain("const AI_BRIDGE_PAIR_URL='http://127.0.0.1:8765/cloud-pair'");
  expect(html).toContain('id="pairAIWindowsBridge"');
  expect(html).toContain("f1_ai_upload_enqueue_v1");
  expect(html).toContain("f1_ai_upload_status_v1");
  expect(html).toContain("attachment_verified");
  expect(html).toContain("CARICATO DAVVERO SU IA");
  expect(html).toContain('function buildAIExport()');
  for (const sheet of ['IMMOBILI', "'NOTIZIE CRM'", 'CONTATTI', 'LETTERE', 'VIE', "'FOLLOW-UP'", 'NOTE']) {
    expect(html).toContain(sheet);
  }
  for (const field of ['TELEFONI_COLLEGATI', 'TELEFONO:n.phone_normalized', 'TELEFONO:x.phone', 'LEAD_COLLEGATI', 'APPUNTAMENTI']) {
    expect(html).toContain(field);
  }
  for (const id of ['propertyLocation','propertyStatus','propertyNotes','propertyRelations']) {
    expect(html).toContain('id="'+id+'"');
  }

  const marker = "(()=>{'use strict';";
  const start = html.indexOf(marker);
  const end = html.indexOf('</script>', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const js = html.slice(start, end);
  expect(() => new vm.Script(js, { filename: 'territory-mobile-inline.js' })).not.toThrow();
});

test('Windows bridge includes private ChatGPT uploader', async () => {
  const installer = fs.readFileSync('windows-bridge/INSTALLA_BRIDGE.bat', 'utf8');
  const bridge = fs.readFileSync('windows-bridge/f1_chatgpt_uploader.py', 'utf8');
  expect(installer).toContain('f1_chatgpt_uploader.py');
  expect(installer).toContain('--serve');
  expect(installer).toContain('F1 - ChatGPT Login');
  expect(bridge).toContain('127.0.0.1');
  expect(bridge).toContain('/chatgpt-upload');
  expect(bridge).toContain('Access-Control-Allow-Private-Network');
  expect(bridge).toContain('https://chatgpt.com/c/6a96ef0b-789c-83eb-80ea-b88137c3a5e1');
  expect(bridge).toContain('/cloud-pair');
  expect(bridge).toContain('f1_ai_bridge_claim_job_v1');
  expect(bridge).toContain('f1_ai_bridge_complete_job_v1');
  expect(bridge).toContain('attachment_verified');
  expect(bridge).toContain('cloud_worker');
  expect(bridge).toContain('shutil.rmtree(run_dir');
});
