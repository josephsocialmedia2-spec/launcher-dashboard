import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RadarTests(unittest.TestCase):
    def test_json_valid(self):
        for path in [ROOT / 'data/radar_edilizio.json', ROOT / 'data/radar_sources.json', ROOT / 'data/radar_seen.json']:
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

    def test_html_references_database(self):
        html = (ROOT / 'radar-edilizio.html').read_text(encoding='utf-8')
        self.assertIn('data/radar_edilizio.json', html)
        self.assertIn('RADAR EDILIZIO F1', html)

    def test_oggi_integration_hook(self):
        oggi = (ROOT / 'oggi.html').read_text(encoding='utf-8')
        pwa = (ROOT / 'pwa.js').read_text(encoding='utf-8')
        self.assertIn('pwa.js', oggi)
        self.assertIn('radar-edilizio.html', pwa)
        self.assertIn('radar-edilizio-f1', pwa)


if __name__ == '__main__':
    unittest.main()
