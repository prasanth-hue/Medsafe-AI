"""HTTP API tests. Requires fastapi + httpx + python-multipart (see requirements.txt); skipped otherwise."""
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["MEDSAFE_DB"] = os.path.join(tempfile.mkdtemp(), "api.db")

try:
    from fastapi.testclient import TestClient
    from backend.main import app
    HAVE = True
except Exception:  # pragma: no cover
    HAVE = False


@unittest.skipUnless(HAVE, "fastapi/httpx/python-multipart not installed")
class APITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c = TestClient(app)
        cls.c.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.c.__exit__(None, None, None)

    def test_health_and_patients(self):
        self.assertEqual(self.c.get("/api/health").json()["status"], "ok")
        self.assertTrue(any(p["is_demo"] for p in self.c.get("/api/patients").json()))

    def test_patient_flow(self):
        p = self.c.post("/api/patients", json={"name": "Asha", "age": 60, "allergies": ["Penicillin"], "conditions": []}).json()
        pid = p["id"]
        self.assertEqual(self.c.post(f"/api/patients/{pid}/medicines", json={"medicine": "crocin"}).json()["medicines"], ["paracetamol"])
        self.assertEqual(self.c.post(f"/api/patients/{pid}/medicines", json={"medicine": "nope"}).status_code, 404)
        s = self.c.post(f"/api/patients/{pid}/schedule", json={"medicine": "metformin", "period": "Morning"}).json()
        self.assertIn("Prescription timing not provided", s["timing_note"])
        self.assertEqual(self.c.put(f"/api/schedule/{s['id']}", json={"medicine": "metformin", "period": "Evening", "dose": "as written"}).json()["period"], "Evening")
        self.assertEqual(self.c.delete(f"/api/schedule/{s['id']}").status_code, 200)
        self.assertEqual(self.c.delete(f"/api/patients/{pid}").status_code, 200)
        self.assertEqual(self.c.get(f"/api/patients/{pid}/schedule").status_code, 404)

    def test_interactions_and_explain(self):
        r = self.c.post("/api/interactions/check", json={"medicines": ["warfarin", "aspirin", "omeprazole"], "patient_id": 1}).json()
        self.assertEqual(len(r["pairs"]), 3)
        e = self.c.post("/api/interactions/explain", json={"a": "warfarin", "b": "aspirin"}).json()
        self.assertTrue(e["graph"]["nodes"])
        self.assertEqual(self.c.post("/api/interactions/explain", json={"a": "warfarin", "b": "warfarin"}).status_code, 422)

    def test_scan_errors_are_friendly(self):
        r = self.c.post("/api/scan", files={"file": ("x.png", io.BytesIO(b"junk"), "image/png")})
        self.assertEqual(r.status_code, 422)
        self.assertIn("error", r.json())
        r = self.c.post("/api/scan", files={"file": ("x.txt", io.BytesIO(b"junk"), "text/plain")})
        self.assertEqual(r.status_code, 415)

    def test_chat_model_dashboard(self):
        self.assertEqual(self.c.post("/api/chat", json={"message": "Open scanner"}).json()["action"]["page"], "scanner")
        self.assertIn("available", self.c.get("/api/model/metrics").json())
        self.assertEqual(self.c.get("/api/dashboard/1").status_code, 200)
        self.assertEqual(self.c.get("/api/medicines/warfarin").json()["id"], "warfarin")


if __name__ == "__main__":
    unittest.main()
