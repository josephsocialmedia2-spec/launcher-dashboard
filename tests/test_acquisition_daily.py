import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("acquisition_daily", ROOT / "scripts" / "acquisition_daily.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = mod
SPEC.loader.exec_module(mod)


class AcquisitionDailyTests(unittest.TestCase):
    def setUp(self):
        self.territory = {
            "version": 2,
            "reference_hub": "Villar Dora",
            "policy": "CENTRO_RADIALE",
            "sinistra": ["Condove"],
            "destra": ["Almese"],
        }
        self.engine = {
            "pillars": [1, 2, 3, 4, 5],
            "scoring": {
                "FSBO_NEW": 25,
                "NO_AGENCIES": 15,
                "AGENCY_CHANGE": 15,
                "RELISTED": 10,
                "PRICE_DROP": 10,
                "MULTIPLE_PRICE_DROPS": 15,
            },
        }

    def test_territory_is_single_source(self):
        allowed = mod.allowed_communes(self.territory)
        self.assertIn(mod.norm("Villar Dora"), allowed)
        self.assertIn(mod.norm("Condove"), allowed)
        self.assertIn(mod.norm("Almese"), allowed)
        self.assertNotIn(mod.norm("Susa"), allowed)

    def test_private_hint_is_candidate_verify_not_call(self):
        signal = {"seller_signal": "PRIVATO NO AGENZIE", "score": 5}
        c = mod.classify(signal)
        self.assertEqual(c["event_type"], "FSBO_CANDIDATE_FOUND")
        self.assertEqual(c["task_type"], "VERIFY")
        self.assertEqual(c["core_category"], "FSBO_CANDIDATE")
        self.assertEqual(mod.score(signal, c, self.engine), 40)

    def test_explicit_private_sale_can_be_fsbo_call_task(self):
        c = mod.classify({"seller_signal": "FSBO VENDITA PRIVATA"})
        self.assertEqual(c["event_type"], "FSBO_FOUND")
        self.assertEqual(c["task_type"], "CALL")
        self.assertEqual(c["core_category"], "FSBO")

    def test_disappearance_is_not_sold_or_certain_expired(self):
        c = mod.classify({"seller_signal": "NON PIÙ RILEVATO"})
        self.assertEqual(c["event_type"], "PROPERTY_NOT_SEEN")
        self.assertNotIn("VENDUTO", c["reason"].upper())
        self.assertNotEqual(c["reason"].upper(), "INCARICO SCADUTO")

    def test_public_payload_filters_outside_territory_and_pii(self):
        neighborhood = {
            "signals": [
                {
                    "signal_id": "SIG-1",
                    "comune": "Villar Dora",
                    "indirizzo": "Via Roma 1",
                    "seller_signal": "PRIVATO",
                    "score": "50",
                    "url_annuncio": "https://example.test/a",
                    "fonte": "Test",
                },
                {
                    "signal_id": "SIG-2",
                    "comune": "Susa",
                    "indirizzo": "Via Fuori 2",
                    "seller_signal": "PRIVATO",
                    "score": "90",
                    "url_annuncio": "https://example.test/b",
                    "fonte": "Test",
                },
            ]
        }
        payload = mod.build_payload(self.territory, self.engine, neighborhood)
        self.assertEqual(len(payload["tasks"]), 1)
        self.assertEqual(payload["tasks"][0]["comune"], "Villar Dora")
        self.assertEqual(payload["tasks"][0]["task_type"], "VERIFY")
        self.assertEqual(payload["events"][0]["event_type"], "FSBO_CANDIDATE_FOUND")
        mod.assert_public_safe(payload)

        forbidden = {
            "telefono", "phone", "email", "nome", "cognome",
            "phone_public", "email_public", "public_entities",
        }

        def assert_no_forbidden_keys(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    self.assertNotIn(key.lower(), forbidden)
                    assert_no_forbidden_keys(child)
            elif isinstance(value, list):
                for child in value:
                    assert_no_forbidden_keys(child)

        assert_no_forbidden_keys(payload)

    def test_task_ids_are_stable(self):
        signal = {
            "signal_id": "SIG-STABLE",
            "comune": "Villar Dora",
            "indirizzo": "Via Roma 1",
            "seller_signal": "PRIVATO",
            "score": "30",
            "url_annuncio": "https://example.test/stable",
        }
        _, a = mod.event_and_task(signal, self.engine, self.territory, "2026-09-12")
        _, b = mod.event_and_task(signal, self.engine, self.territory, "2026-09-12")
        self.assertEqual(a["task_id"], b["task_id"])


if __name__ == "__main__":
    unittest.main()
