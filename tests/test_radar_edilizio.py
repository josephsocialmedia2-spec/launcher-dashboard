import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_ROUTE = [
    'Susa','Mompantero','Meana di Susa','Gravere','Giaglione','Venaus','Mattie',
    'Chiomonte','Novalesa','Bussoleno','Chianocco','Moncenisio','San Giorio di Susa',
    'Exilles','Bruzolo','San Didero','Salbertrand'
]


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
            for row in db.get(group, []):
                self.assertFalse(forbidden.intersection(row.keys()))

    def test_same_geography_as_seller_radar(self):
        cfg = json.loads((ROOT / 'data/radar_sources.json').read_text(encoding='utf-8'))
        geo = cfg['geography']
        self.assertEqual(geo['logic'], 'SELLER_RADAR_SUSA_20KM')
        self.assertEqual(geo['center'], 'Susa')
        self.assertEqual(geo['max_radius_km'], 20)
        sources = cfg['sources']
        comuni = [x['comune'] for x in sources]
        self.assertEqual(comuni, EXPECTED_ROUTE)
        km = [float(x['km_from_susa']) for x in sources]
        self.assertEqual(km[0], 0.0)
        self.assertTrue(all(x <= 20 for x in km))
        self.assertEqual(km, sorted(km))
        self.assertNotIn('Sant’Ambrogio di Torino', comuni)

    def test_source_quality(self):
        cfg = json.loads((ROOT / 'data/radar_sources.json').read_text(encoding='utf-8'))
        urls = [x['url'] for x in cfg['sources']]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertEqual(len(cfg['sources']), 17)
        self.assertTrue(all(x.get('verified') for x in cfg['sources']))

    def test_history_seed_starts_from_susa(self):
        seed = json.loads((ROOT / 'data/radar_history_seed.json').read_text(encoding='utf-8'))
        self.assertEqual(seed['geography_logic'], 'SELLER_RADAR_SUSA_20KM')
        self.assertGreaterEqual(len(seed['records']), 1)
        self.assertEqual(seed['records'][0]['comune'], 'Susa')
        self.assertIn('PDC 1234/2024', seed['records'][0]['atto'])

    def test_history_seed_is_present_after_merge(self):
        db = json.loads((ROOT / 'data/radar_edilizio.json').read_text(encoding='utf-8'))
        keys = {(x.get('comune'), x.get('atto')) for x in db.get('backlog', [])}
        seed = json.loads((ROOT / 'data/radar_history_seed.json').read_text(encoding='utf-8'))
        for row in seed['records']:
            self.assertIn((row['comune'], row['atto']), keys)

    def test_scanner_imports_baseline_in_seller_zone(self):
        scanner = (ROOT / 'scripts/radar_edilizio_scan.py').read_text(encoding='utf-8')
        self.assertIn('SCHEMA_VERSION = 4', scanner)
        self.assertIn('BASELINE_IMPORTED', scanner)
        self.assertIn('BASELINE_SELLER_RADAR_20KM', scanner)
        self.assertIn('km_from_susa', scanner)
        self.assertIn('max_radius_km', scanner)

    def test_html_references_database_and_susa_rule(self):
        html = (ROOT / 'radar-edilizio.html').read_text(encoding='utf-8')
        self.assertIn('data/radar_edilizio.json', html)
        self.assertIn('RADAR EDILIZIO F1', html)
        self.assertIn('SUSA = KM 0', html)
        self.assertIn('KM_SUSA', html)
        self.assertIn('kmSusa', html)

    def test_seller_radar_imports_edilizio_with_20km_filter(self):
        html = (ROOT / 'seller-radar-unico.html').read_text(encoding='utf-8')
        self.assertIn("const EDILIZIO='./data/radar_edilizio.json'", html)
        self.assertIn('RADAR_EDILIZIO', html)
        self.assertIn('RIFERIMENTO PROFESSIONALE', html)
        self.assertIn('KM_SUSA', html)
        self.assertIn('kmSusa', html)
        self.assertIn('<=20', html.replace(' ', ''))
        self.assertIn('source_page', html)

    def test_continuous_schedule(self):
        workflow = (ROOT / '.github/workflows/radar-edilizio-daily.yml').read_text(encoding='utf-8')
        self.assertIn("cron: '*/15 * * * *'", workflow)
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
        self.assertIn("'./radar-edilizio.html'", sw)
        self.assertIn("'./data/radar_edilizio.json'", sw)
        self.assertIn("'./seller-radar-unico.html'", sw)
        self.assertIn("'./pwa.js'", sw)


if __name__ == '__main__':
    unittest.main()
