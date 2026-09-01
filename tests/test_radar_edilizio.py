import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RadarTests(unittest.TestCase):
    def test_json_valid(self):
        for path in [
            ROOT / 'data/radar_edilizio.json',
            ROOT / 'data/radar_sources.json',
            ROOT / 'data/radar_seen.json',
            ROOT / 'data/radar_history_seed.json',
        ]:
            json.loads(path.read_text(encoding='utf-8'))

    def test_unique_ids_and_urls(self):
        db = json.loads((ROOT / 'data/radar_edilizio.json').read_text(encoding='utf-8'))
        ids = [x['id'] for x in db['opportunities']]
        self.assertEqual(len(ids), len(set(ids)))
        urls = [x['source_url'] for x in db['opportunities'] if x.get('source_url')]
        self.assertEqual(len(urls), len(set(urls)))

    def test_privacy_no_private_owner_fields(self):
        db = json.loads((ROOT / 'data/radar_edilizio.json').read_text(encoding='utf-8'))
        forbidden = {'residenza_privata', 'telefono_proprietario', 'email_proprietario', 'codice_fiscale_privato'}
        for group in ('opportunities', 'contacts'):
            for row in db[group]:
                self.assertFalse(forbidden.intersection(row.keys()))

    def test_all_f1_comuni_configured(self):
        cfg = json.loads((ROOT / 'data/radar_sources.json').read_text(encoding='utf-8'))
        comuni = [x['comune'] for x in cfg['sources']]
        self.assertEqual(len(comuni), 33)
        self.assertEqual(len(comuni), len(set(comuni)))

    def test_source_quality(self):
        cfg = json.loads((ROOT / 'data/radar_sources.json').read_text(encoding='utf-8'))
        urls = [x['url'] for x in cfg['sources']]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertGreaterEqual(sum(1 for x in cfg['sources'] if x.get('verified')), 30)

    def test_history_seed_is_present_after_merge(self):
        db = json.loads((ROOT / 'data/radar_edilizio.json').read_text(encoding='utf-8'))
        keys = {(x.get('comune'), x.get('atto')) for x in db.get('backlog', [])}
        seed = json.loads((ROOT / 'data/radar_history_seed.json').read_text(encoding='utf-8'))
        for row in seed['records']:
            self.assertIn((row['comune'], row['atto']), keys)

    def test_html_references_database(self):
        html = (ROOT / 'radar-edilizio.html').read_text(encoding='utf-8')
        self.assertIn('data/radar_edilizio.json', html)
        self.assertIn('RADAR EDILIZIO F1', html)

    def test_seller_radar_imports_edilizio(self):
        html = (ROOT / 'seller-radar-unico.html').read_text(encoding='utf-8')
        self.assertIn("const EDILIZIO='./data/radar_edilizio.json'", html)
        self.assertIn('RADAR_EDILIZIO', html)
        self.assertIn('RIFERIMENTO PROFESSIONALE', html)
        self.assertIn('GIRO + INTELLIGENCE + RADAR EDILIZIO RICONCILIATI', html)

    def test_continuous_schedule(self):
        workflow = (ROOT / '.github/workflows/radar-edilizio-daily.yml').read_text(encoding='utf-8')
        self.assertIn("cron: '15 * * * *'", workflow)
        self.assertIn('seller-radar-unico.html', workflow)
        self.assertIn('F1 Radar Edilizio Continuous', workflow)

    def test_oggi_integration_hook(self):
        oggi = (ROOT / 'oggi.html').read_text(encoding='utf-8')
        pwa = (ROOT / 'pwa.js').read_text(encoding='utf-8')
        self.assertIn('pwa.js', oggi)
        self.assertIn('radar-edilizio.html', pwa)
        self.assertIn('radar-edilizio-f1', pwa)

    def test_pwa_cache_contains_radar(self):
        sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
        self.assertIn('f1-operativo-v20260901-radar-edilizio-1', sw)
        self.assertIn("'./radar-edilizio.html'", sw)
        self.assertIn("'./data/radar_edilizio.json'", sw)
        self.assertIn("'./seller-radar-unico.html'", sw)
        self.assertIn("'./pwa.js'", sw)


if __name__ == '__main__':
    unittest.main()
