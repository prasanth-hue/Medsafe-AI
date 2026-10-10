"""OCR of medicine labels with Tesseract + matching against the known medicine list.

OCR reads visible text only. It never identifies a pill from its shape or colour.
"""
from __future__ import annotations

import difflib
import io
import os
import re
from typing import List

from backend.services.knowledge import Knowledge, get_knowledge

ALLOWED = {"jpg", "jpeg", "png", "webp"}
MAX_BYTES = 12 * 1024 * 1024


class OCRError(Exception):
    """User-facing OCR problem (message is safe to show)."""


def _prepare(image_bytes: bytes):
    from PIL import Image, ImageOps
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()
    except Exception as exc:
        raise OCRError("Unable to read this image. Please upload a clearer medicine label.") from exc
    img = ImageOps.exif_transpose(img).convert("L")
    if img.width < 1200:
        scale = 1200 / img.width
        img = img.resize((int(img.width * scale), int(img.height * scale)))
    if img.width > 3000:
        img = img.resize((3000, int(img.height * 3000 / img.width)))
    return ImageOps.autocontrast(img)


def configure_tesseract(pytesseract) -> None:
    """Honour TESSERACT_CMD, else try the default Windows install path."""
    cmd = os.environ.get("TESSERACT_CMD")
    if not cmd:
        for guess in (r"C:\Program Files\Tesseract-OCR\tesseract.exe", r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"):
            if os.path.exists(guess):
                cmd = guess
                break
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd


def extract_text(image_bytes: bytes) -> dict:
    if len(image_bytes) > MAX_BYTES:
        raise OCRError("This image is too large. Please upload a file under 12 MB.")
    img = _prepare(image_bytes)
    words, confs = [], []
    tesseract_ok = False
    try:
        import pytesseract
        configure_tesseract(pytesseract)
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config="--psm 6")
        for w, c in zip(data["text"], data["conf"]):
            w = (w or "").strip()
            try:
                c = float(c)
            except (TypeError, ValueError):
                c = -1
            if w and c >= 0:
                words.append(w)
                confs.append(c)
        if words:
            tesseract_ok = True
    except Exception:
        tesseract_ok = False

    if not tesseract_ok:
        # Fall back to Windows built-in OCR (winocr)
        try:
            import winocr
            res = winocr.recognize_pil(img).get()
            raw_text = res.text or ""
            words = [w.strip() for w in raw_text.split() if w.strip()]
            confs = [85.0] * len(words)
        except Exception:
            pass

    if not words:
        raise OCRError("We couldn't confidently read the medicine label. Please enter the medicine name manually.")
    return {"text": " ".join(words), "mean_confidence": round(sum(confs) / len(confs), 1) if confs else 0.0, "word_count": len(words)}


def match_text(text: str, k: Knowledge | None = None) -> List[dict]:
    """Find supported medicines mentioned in OCR text. Returns candidates sorted by score (0-1)."""
    k = k or get_knowledge()
    low = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    tokens = [t for t in low.split() if len(t) >= 4]
    cands = {}
    for name, mid in ((n, k._alias[n]) for n in k.all_names()):
        n = re.sub(r"[^a-z0-9\s]", " ", name).strip()
        if len(n) < 4:
            continue
        if re.search(rf"\b{re.escape(n)}\b", low):
            score, how = 1.0, "exact"
        else:
            best = max((difflib.SequenceMatcher(None, n, t).ratio() for t in tokens if abs(len(t) - len(n)) <= 3), default=0.0)
            if best < 0.82:
                continue
            score, how = round(best, 2), "fuzzy"
        if mid not in cands or score > cands[mid]["score"]:
            cands[mid] = {"id": mid, "name": k.medicines[mid]["name"], "score": score, "matched_on": name, "match_type": how}
    return sorted(cands.values(), key=lambda c: -c["score"])


def read_label(image_bytes: bytes, k: Knowledge | None = None) -> dict:
    k = k or get_knowledge()
    ocr = extract_text(image_bytes)
    cands = match_text(ocr["text"], k)
    best = cands[0] if cands else None
    confident = bool(best and (best["match_type"] == "exact" and ocr["word_count"] >= 1 or best["score"] >= 0.9))
    return {
        "text": ocr["text"], "ocr_confidence": ocr["mean_confidence"], "candidates": cands[:5],
        "confident": confident, "detected": best if confident else None,
        "message": ("Medicine name detected. Please confirm it is correct." if confident
                    else "Medicine name could not be confidently identified. Enter the medicine name manually."),
        "note": "OCR reads visible text only. MedSafe AI does not identify pills from shape or colour, and does not infer dose from an image.",
    }
