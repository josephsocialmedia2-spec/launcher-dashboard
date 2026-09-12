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
            "version": 3,
            "reference_hub": "Villar Dora",
            "policy": "CENTRO_RADIALE_SINISTRA_DESTRA",
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

    def test_territory_is_single_source_and_has_radial_sides(self):
        allowed = mod.allowed_communes(self.territory)
        self.assertIn(mod.norm("Villar Dora"), allowed)
        self.assertIn(mod.norm("Condove"), allowed)
        self.assertIn(mod.norm("Almese"), allowed)
        self.assertNotIn(mod.norm("Susa"), allowed)
        self.assertEqual(mod.territory_side(self.territory, "Villar Dora"), "CENTRO")
        self.assertEqual(mod.territory_side(self.territory, "Condove"), "SINISTRA")
        self.assertEqual(mod.territory_side(self.territory, "Almese"), "DESTRA")
        self.assertEqual(mod.territory_side(self.territory, "Susa"), "FUORI_LISTA")

    def test_private_hint_is_candidate_verify_not_call(self):
        signal = {"seller_signal": "PRIVATO NO AGENZIE", "score": 5}
        c = mod.classify(signal)
        self.assertEqual(c["event_type"], "FSBO_CANDIDATE_FOUND")
        self.assertEqual(c["task_type"], "VERIFY")
        self.assertEqual(c["core_category"], "FSBO_CANDIDATE")
        self.assertEqual(c["acquisition_stream"], "PRIVATI")
        self.assertEqual(mod.score(signal, c, self.engine), 40)

    def test_explicit_private_sale_can_be_fsbo_call_task(self):
        c = mod.classify({"seller_signal": "FSBO VENDITA PRIVATA"})
        self.assertEqual(c["event_type"], "FSBO_FOUND")
        self.assertEqual(c["task_type"], "CALL")
        self.assertEqual(c["core_category"], "FSBO")
        self.assertEqual(c["acquisition_stream"], "PRIVATI")

    def test_explicit_expired_is_distinguished_from_possible_expired(self):
        certain = mod.classify({"seller_signal": "INCARICO SCADUTO evidenza esplicita"})
        possible = mod.classify({"seller_signal": "NON PIÙ RILEVATO"})
        self.assertEqual(certain["event_type"], "LISTING_EXPIRED_CONFIRMED")
        self.assertEqual(certain["acquisition_stream"], "INCARICHI_SCADUTI")
        self.assertEqual(possible["event_type"], "PROPERTY_NOT_SEEN")
        self.assertEqual(possible["acquisition_stream"], "INCARICHI_SCADUTI")
        self.assertNotEqual(possible["reason"].upper(), "INCARICO SCADUTO")

    def test_competitor_listing_is_mandatory_crm_stream(self):
        c = mod.classify({"seller_signal": "INDIZIO_AGENZIA", "fonte": "Agenzia locale"})
        self.assertEqual(c["acquisition_stream"], "CONCORRENZA")
        self.assertEqual(c["task_type"], "VERIFY")

    def test_public_payload_filters_outside_territory_and_marks_crm_required(self):
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
                    "territorial_rank": 0,
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
        task = payload["tasks"][0]
        self.assertEqual(task["comune"], "Villar Dora")
        self.assertEqual(task["task_type"], "VERIFY")
        self.assertEqual(task["territory_side"], "CENTRO")
        self.assertTrue(task["crm_required"])
        self.assertEqual(task["acquisition_stream"], "PRIVATI")
        self.assertEqual(payload["events"][0]["event_type"], "FSBO_CANDIDATE_FOUND")
        self.assertEqual(payload["version"], 3)
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
