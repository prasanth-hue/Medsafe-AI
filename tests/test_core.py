"""Core logic tests (standard library + numpy + Pillow). Run: python -m unittest discover -s tests -v"""
import io
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_tmp = tempfile.mkdtemp()
os.environ["MEDSAFE_DB"] = os.path.join(_tmp, "test.db")

from backend.ml.graph import build_graph, normalized_adjacency  # noqa: E402
from backend.services import db, interactions, ocr  # noqa: E402
from backend.services.assistant import Assistant  # noqa: E402
from backend.services.knowledge import get_knowledge  # noqa: E402

K = get_knowledge()


def tearDownModule():
    shutil.rmtree(_tmp, ignore_errors=True)


class KnowledgeTests(unittest.TestCase):
    def test_resolution_brands_and_typos(self):
        self.assertEqual(K.resolve("Tylenol 500 mg"), "paracetamol")
        self.assertEqual(K.resolve("acetaminophen"), "paracetamol")
        self.assertEqual(K.resolve("warfrin"), "warfarin")
        self.assertIsNone(K.resolve("notamedicine"))

    def test_search_and_public_info(self):
        self.assertTrue(any(m["id"] == "metformin" for m in K.search("metf")))
        info = K.public("warfarin")
        self.assertIn("Follow the prescription or label instruction", info["prescription_note"])
        self.assertTrue(info["known_interactions"])
        self.assertTrue(all(e["kind"] in ("local-demo", "search-link") for e in info["evidence"]))

    def test_interaction_data_valid(self):
        for (a, b), it in K.interactions.items():
            self.assertIn(a, K.medicines)
            self.assertIn(b, K.medicines)
            self.assertIn(it["severity"], ("HIGH", "MODERATE", "LOW"))


class GraphTests(unittest.TestCase):
    def test_graph_and_adjacency(self):
        d = build_graph()
        self.assertEqual(d.n_drugs, len(K.medicines))
        a = normalized_adjacency(d, [])
        self.assertTrue((a == a.T).all())
        a2 = normalized_adjacency(d, d.positives[:3])
        self.assertNotEqual(float(a.sum()), float(a2.sum()))

    def test_no_leakage_between_splits(self):
        d = build_graph()
        held = d.positives[0]
        a = normalized_adjacency(d, d.positives[1:])
        u, v = d.drug_nodes[held[0]], d.drug_nodes[held[1]]
        self.assertEqual(float(a[u, v]), 0.0)


class InteractionTests(unittest.TestCase):
    def test_demo_patient_pairs(self):
        r = interactions.check(["Warfarin", "Aspirin", "Omeprazole"], {"age": 45, "conditions": ["Hypertension"], "allergies": ["None recorded"]})
        self.assertEqual(len(r["pairs"]), 3)
        wa = next(p for p in r["pairs"] if {p["a"], p["b"]} == {"warfarin", "aspirin"})
        self.assertEqual(wa["risk"], "HIGH")
        self.assertIn("bleeding", wa["concern"].lower())
        self.assertEqual(r["overall_risk"], "HIGH")
        self.assertIn("does not diagnose", r["disclaimer"])

    def test_unknown_pair_is_not_called_safe(self):
        r = interactions.check(["metformin", "levothyroxine"])
        self.assertEqual(r["pairs"][0]["risk"], "UNKNOWN")

    def test_unresolved_names_reported(self):
        r = interactions.check(["warfarin", "zzzz"])
        self.assertEqual(r["unresolved"], ["zzzz"])
        self.assertEqual(r["pairs"], [])

    def test_explain_has_graph(self):
        e = interactions.explain("warfarin", "amiodarone", {"age": 70, "conditions": [], "allergies": []})
        ids = {n["id"] for n in e["graph"]["nodes"]}
        self.assertIn("drug:warfarin", ids)
        self.assertTrue(e["important_relationships"])
        self.assertTrue(any("65" in f or "Age 70" in f for f in e["patient_factors"]))

    def test_sildenafil_nitrate_high(self):
        self.assertEqual(interactions.check(["sildenafil", "nitroglycerin"])["pairs"][0]["risk"], "HIGH")


class OCRTests(unittest.TestCase):
    @staticmethod
    def _img(text):
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new("RGB", (900, 220), "white")
        ImageDraw.Draw(img).text((30, 60), text, fill="black", font=ImageFont.load_default(size=72))
        b = io.BytesIO()
        img.save(b, "PNG")
        return b.getvalue()

    def test_match_text(self):
        self.assertEqual(ocr.match_text("Tab. Metformin 500mg")[0]["id"], "metformin")
        self.assertEqual(ocr.match_text("xyz abc 123"), [])

    def test_bad_image_friendly_error(self):
        with self.assertRaises(ocr.OCRError) as cm:
            ocr.read_label(b"not an image")
        self.assertIn("Unable to read this image", str(cm.exception))

    def test_read_label_when_tesseract_present(self):
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
        except Exception:
            self.skipTest("Tesseract not available")
        r = ocr.read_label(self._img("AMLODIPINE 5 mg"))
        self.assertTrue(r["confident"])
        self.assertEqual(r["detected"]["id"], "amlodipine")

    def test_blank_image_not_confident(self):
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
        except Exception:
            self.skipTest("Tesseract not available")
        from PIL import Image
        b = io.BytesIO()
        Image.new("RGB", (400, 300), "white").save(b, "PNG")
        r = ocr.read_label(b.getvalue())
        self.assertFalse(r["confident"])
        self.assertIn("could not be confidently identified", r["message"])


class DBTests(unittest.TestCase):
    def setUp(self):
        db.init_db()

    def test_demo_patient_seeded(self):
        demo = [p for p in db.list_patients() if p["is_demo"]][0]
        self.assertEqual(demo["medicines"], ["warfarin", "aspirin", "omeprazole"])

    def test_patient_crud_and_schedule(self):
        p = db.create_patient({"name": "Test", "age": 70, "allergies": ["Penicillin"], "conditions": ["Diabetes"]})
        self.assertEqual(db.get_patient(p["id"])["allergies"], ["Penicillin"])
        db.update_patient(p["id"], {"name": "Test 2", "age": 71})
        self.assertEqual(db.get_patient(p["id"])["name"], "Test 2")
        s = db.create_schedule(p["id"], {"medicine_id": "metformin", "dose": "as written", "period": "Morning"})
        db.update_schedule(s["id"], {"medicine_id": "metformin", "period": "Evening", "food": "With food"})
        self.assertEqual(db.get_schedule(s["id"])["period"], "Evening")
        self.assertTrue(db.delete_schedule(s["id"]))
        self.assertTrue(db.delete_patient(p["id"]))
        self.assertIsNone(db.get_patient(p["id"]))


class AssistantTests(unittest.TestCase):
    A = Assistant(K)

    def test_navigation(self):
        r = self.A.reply("Open scanner")
        self.assertEqual(r["action"]["page"], "scanner")
        self.assertEqual(self.A.reply("Open medication schedule")["action"]["page"], "schedule")

    def test_medicine_info_and_check(self):
        self.assertIn("anticoagulant", self.A.reply("What is warfarin used for?")["reply"].lower())
        r = self.A.reply("Check aspirin and warfarin.")
        self.assertIn("HIGH", r["reply"])
        self.assertEqual(r["action"]["page"], "checker")

    def test_safety_behaviours(self):
        self.assertEqual(self.A.reply("how much warfarin should I take?")["intent"], "dose_refusal")
        self.assertEqual(self.A.reply("I have chest pain")["intent"], "emergency")
        self.assertEqual(self.A.reply("")["intent"], "empty")


if __name__ == "__main__":
    unittest.main()
