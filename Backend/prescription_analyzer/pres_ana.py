import os
import re
import json
import time
import warnings
from io import BytesIO
from pathlib import Path

import pymupdf
import vertexai
from dotenv import load_dotenv
from PIL import Image, ImageOps, ImageFilter
from vertexai.generative_models import (
    GenerationConfig,
    GenerativeModel,
    Part,
)

warnings.filterwarnings("ignore")

# =========================================================
# CONFIG
# =========================================================


BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=False)


credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if not credentials_path:
    raise ValueError(
        "CREDENTIALS not found."
    )

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(credentials_path)

PROJECT_ID = os.getenv("PROJECT_ID")
LOCATION = os.getenv("LOCATION", "global")

vertexai.init(project=PROJECT_ID, location=LOCATION)
print("Vertex AI Connected")

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
model = GenerativeModel(MODEL_NAME)

# =========================================================
# SETTINGS
# =========================================================

BATCH_SIZE = 200
DELAY_BETWEEN_PDFS = 2
DELAY_BETWEEN_BATCHES = 0

PDF_DPI = 200               # DPI used when rasterising PDF pages
MAX_IMAGE_DIMENSION = 2000  # long-side cap (px) for images sent to Gemini
JPEG_QUALITY = 90
MAX_PDF_PAGES = 20          # safety cap on pages sent in one request
MAX_RETRIES = 3

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


# =========================================================
# FILE TYPE DETECTION
# =========================================================

def is_pdf_bytes(data: bytes) -> bool:
    """PDFs start with %PDF (allow a little leading whitespace/garbage)."""
    return b"%PDF" in data[:1024]


# =========================================================
# PDF / IMAGE -> PREPROCESSED JPEG BYTES (all in memory)
# =========================================================

def preprocess_image_bytes(
    image_bytes: bytes,
    max_dim: int = MAX_IMAGE_DIMENSION,
    quality: int = JPEG_QUALITY,
) -> bytes:
    """
    Clean up a single page/photo and return JPEG bytes:
      - fix EXIF orientation (phone photos)
      - convert to RGB (handles RGBA / palette / CMYK)
      - downscale if too large
      - light autocontrast + sharpen to help with handwriting / faded print
    """
    with Image.open(BytesIO(image_bytes)) as im:
        im = ImageOps.exif_transpose(im)

        # Flatten transparency onto white
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            background = Image.new("RGB", im.size, (255, 255, 255))
            background.paste(im, mask=im.split()[-1])
            im = background
        else:
            im = im.convert("RGB")

        width, height = im.size
        longest = max(width, height)
        if longest > max_dim:
            scale = max_dim / float(longest)
            im = im.resize(
                (int(width * scale), int(height * scale)),
                Image.LANCZOS,
            )

        im = ImageOps.autocontrast(im, cutoff=1)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=3))

        buffer = BytesIO()
        im.save(buffer, format="JPEG", quality=quality, optimize=True)
        return buffer.getvalue()


def pdf_bytes_to_image_bytes(pdf_bytes: bytes, dpi: int = PDF_DPI) -> list:
    """Render every PDF page to PNG bytes in memory (no temp files)."""
    pages = []
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        for page_num in range(min(len(doc), MAX_PDF_PAGES)):
            pix = doc[page_num].get_pixmap(dpi=dpi)
            pages.append(pix.tobytes("png"))
    finally:
        doc.close()
    return pages


def build_page_images(file_bytes: bytes) -> list:
    """
    Accepts raw bytes of either a PDF or an image.
    Returns a list of preprocessed JPEG bytes (one per page / image).
    """
    if is_pdf_bytes(file_bytes):
        raw_pages = pdf_bytes_to_image_bytes(file_bytes)
        if not raw_pages:
            raise ValueError("PDF has no pages.")
        return [preprocess_image_bytes(p) for p in raw_pages]

    return [preprocess_image_bytes(file_bytes)]


# =========================================================
# PROMPT
# =========================================================

PRESCRIPTION_PROMPT = """You are reading a medical prescription (printed, handwritten, or mixed). It may span multiple pages/images; treat all of them as ONE prescription and merge the results.

Extract the following fields and return them as JSON.

PATIENT
- `patient_name`: name of the patient.
- `patient_age`: age exactly as written (e.g. "34 Y", "6 months").
- `patient_gender`: "Male", "Female", "Other", or null.
- `patient_weight`: as written (with unit) or null.
- `patient_contact`: phone number or address of the patient if printed, else null.

PRESCRIPTION
- `prescription_date`: date of the prescription in YYYY-MM-DD format (e.g. 2025-06-03). Look for 'Date', 'Dt', 'Dated'. If the date is ambiguous, null.
- `diagnosis`: diagnosis / complaints / 'Dx' / 'C/O' / 'Impression' if written, else null.
- `vitals`: object with any of `bp`, `pulse`, `temperature`, `spo2`, `weight`, `height` if written; omit missing ones.

DOCTOR / CLINIC
- `doctor_name`: prescribing doctor's name (put qualifications in `doctor_qualification`).
- `doctor_qualification`: e.g. MBBS, MD, MS, BAMS - or null.
- `doctor_registration_number`: look for 'Reg No', 'Registration No', 'MCI', 'NMC', 'State Medical Council' - exactly as printed, else null.
- `clinic_name`: hospital / clinic / nursing home name from the letterhead.
- `clinic_address`: address from the letterhead, else null.
- `clinic_phone`: phone number from the letterhead, else null.

MEDICINES (`medicines` list - one entry per drug, across ALL pages)
For each medicine extract:
- `name`: brand or generic name as written (without dose form prefix such as Tab./Cap./Syp. - put that in `form`).
- `form`: Tab / Cap / Syp / Inj / Drops / Cream / Ointment / Gel / Inhaler / Powder / etc., or null.
- `strength`: e.g. "500 mg", "5 ml", "10 mg/5 ml", or null.
- `dosage`: how much per intake, e.g. "1 tablet", "5 ml", "2 puffs", or null.
- `frequency`: as written or expanded, e.g. "1-0-1", "BD", "TDS", "OD", "HS", "SOS", "twice daily".
- `duration`: e.g. "5 days", "2 weeks", "1 month", or null.
- `route`: Oral / Topical / IV / IM / Inhalation / etc., only if written or clearly implied by the form, else null.
- `timing`: e.g. "after food", "before food", "at bedtime", or null.
- `instructions`: any extra instruction written for that drug, or null.
- `quantity`: total quantity to dispense if written, else null.

OTHER
- `investigations`: list of tests advised (blood tests, X-ray, etc.), or [].
- `advice`: general advice / diet / precautions as a single string, or null.
- `follow_up`: follow-up instruction or date as written, or null.

RULES
- Read carefully; handwriting may be messy. Common abbreviations: OD = once daily, BD/BID = twice daily, TDS/TID = three times daily, QID = four times daily, HS = at bedtime, SOS = if needed, AC = before food, PC = after food, Tab = tablet, Cap = capsule, Syp = syrup, Inj = injection.
- Do NOT infer, assume, or guess any value. If a field is not explicitly present or is illegible, use null (or [] for lists).
- If a drug name or dose is only partly legible, return your best literal reading and add "uncertain": true to that medicine entry.
- Do not invent medicines that are not written. Do not include printed advertisements or pharmacy stamps as medicines.
- Accuracy is more important than completeness.

Return ONLY this JSON structure:
{
  "patient_name": null,
  "patient_age": null,
  "patient_gender": null,
  "patient_weight": null,
  "patient_contact": null,
  "prescription_date": null,
  "diagnosis": null,
  "vitals": {},
  "doctor_name": null,
  "doctor_qualification": null,
  "doctor_registration_number": null,
  "clinic_name": null,
  "clinic_address": null,
  "clinic_phone": null,
  "medicines": [
    {
      "name": null,
      "form": null,
      "strength": null,
      "dosage": null,
      "frequency": null,
      "duration": null,
      "route": null,
      "timing": null,
      "instructions": null,
      "quantity": null
    }
  ],
  "investigations": [],
  "advice": null,
  "follow_up": null
}
"""


# =========================================================
# GEMINI CALL
# =========================================================

def _call_gemini(page_images: list, prompt: str) -> str:
    """Send all page images (JPEG bytes) + prompt to Gemini on Vertex AI."""
    parts = [Part.from_data(data=img, mime_type="image/jpeg") for img in page_images]
    parts.append(
        prompt + "\n\nReturn ONLY valid JSON. No preamble, no markdown fences, no explanation."
    )

    generation_config = GenerationConfig(
        temperature=0,
        top_p=1,
        max_output_tokens=8192,
        response_mime_type="application/json",
    )

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = model.generate_content(
                parts,
                generation_config=generation_config,
            )
            return response.text.strip()
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                wait = 2 ** attempt
                print(f"Gemini call failed (attempt {attempt}): {e}. Retrying in {wait}s...")
                time.sleep(wait)

    raise last_error


def generate(file_bytes: bytes, prompt: str = PRESCRIPTION_PROMPT):
    page_images = build_page_images(file_bytes)
    text = _call_gemini(page_images, prompt)
    return text, f"vertex-{MODEL_NAME}"


# =========================================================
# JSON PARSING / CLEANUP
# =========================================================

def _parse_json(raw_output: str):
    raw_output = raw_output.strip()

    # Strip accidental markdown fences
    raw_output = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_output, flags=re.IGNORECASE)

    try:
        return json.loads(raw_output)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", raw_output)
        if not match:
            print("\nNo JSON object found.")
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            print("Could not parse JSON:")
            print(match.group(0))
            return None


def _normalize(data: dict) -> dict:
    """Light cleanup: empty strings -> None, make sure list fields are lists."""

    def clean(value):
        if isinstance(value, str):
            value = value.strip()
            return value if value else None
        if isinstance(value, dict):
            return {k: clean(v) for k, v in value.items() if clean(v) is not None}
        if isinstance(value, list):
            return [clean(v) for v in value]
        return value

    data = clean(data)

    if not isinstance(data.get("medicines"), list):
        data["medicines"] = []
    if not isinstance(data.get("investigations"), list):
        data["investigations"] = []

    data["medicines"] = [m for m in data["medicines"] if isinstance(m, dict) and m.get("name")]
    data["medicine_count"] = len(data["medicines"])

    return data


# =========================================================
# CORE: EXTRACT FROM BYTES
# =========================================================

def extract_prescription(file_bytes: bytes, name: str = "uploaded file"):
    """
    Main entry point for API / web use.
    `file_bytes` can be the raw bytes of a PDF OR an image (jpg/png/webp/...).
    Returns a dict, or None on failure. No temp files are written.
    """
    start_time = time.time()

    try:
        if not file_bytes:
            raise ValueError("Empty file.")

        kind = "PDF" if is_pdf_bytes(file_bytes) else "Image"
        size_mb = round(len(file_bytes) / (1024 * 1024), 2)
        print(f"{name}")
        print(f"Type: {kind} | Size: {size_mb} MB")

        raw_output, engine_used = generate(file_bytes)
        print(f"Engine used: {engine_used}")

        data = _parse_json(raw_output)
        if data is None:
            return None

        data = _normalize(data)

        print(f"Processing Time: {round(time.time() - start_time, 2)} sec")
        return data

    except Exception as e:
        print(f"\nProcessing Failed After {round(time.time() - start_time, 2)} sec")
        print(f"Error: {e}")
        return None


# =========================================================
# CONVENIENCE WRAPPER (bytes / file path / folder / list)
# =========================================================

def _read_bytes(path) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def get_ocr_data(input_data):
    """
    input_data can be:
      - bytes                      -> single PDF or image
      - str/Path to a file         -> single PDF or image
      - str/Path to a folder       -> all PDFs + images inside
      - list of bytes / paths      -> batch
    """
    # SINGLE: raw bytes
    if isinstance(input_data, (bytes, bytearray)):
        return extract_prescription(bytes(input_data))

    # SINGLE: file path
    if isinstance(input_data, (str, Path)) and os.path.isfile(input_data):
        return extract_prescription(_read_bytes(input_data), name=os.path.basename(input_data))

    # BATCH: folder
    if isinstance(input_data, (str, Path)) and os.path.isdir(input_data):
        files = sorted(
            p for p in Path(input_data).iterdir()
            if p.suffix.lower() == ".pdf" or p.suffix.lower() in IMAGE_EXTENSIONS
        )
        items = [(p.name, p) for p in files]

    # BATCH: list
    elif isinstance(input_data, list):
        items = []
        for i, entry in enumerate(input_data, start=1):
            if isinstance(entry, (bytes, bytearray)):
                items.append((f"file_{i}", bytes(entry)))
            else:
                items.append((Path(entry).name, Path(entry)))

    else:
        raise ValueError(
            "Input must be bytes, a file path, a folder path, or a list of those."
        )

    print("batch call")
    overall_start = time.time()
    total = len(items)
    print(f"\nFound {total} files")

    all_results = []

    for batch_start in range(0, total, BATCH_SIZE):
        batch = items[batch_start: batch_start + BATCH_SIZE]
        print(f"\nBatch {(batch_start // BATCH_SIZE) + 1}")

        for name, source in batch:
            file_bytes = source if isinstance(source, bytes) else _read_bytes(source)
            result = extract_prescription(file_bytes, name=name)

            if result:
                all_results.append({"file_name": name, "data": result})
                print(f"RESULT: {name}")
                print(json.dumps(result, indent=2, ensure_ascii=False))

            print(f"\nWaiting {DELAY_BETWEEN_PDFS} sec...")
            time.sleep(DELAY_BETWEEN_PDFS)

        if batch_start + BATCH_SIZE < total and DELAY_BETWEEN_BATCHES > 0:
            print(f"Sleeping {DELAY_BETWEEN_BATCHES} sec...")
            time.sleep(DELAY_BETWEEN_BATCHES)

    minutes = round((time.time() - overall_start) / 60, 2)
    print("ALL PROCESSING COMPLETED.............................")
    print(f"Total Processed : {len(all_results)}")
    print(f"Total Time      : {minutes} minutes")

    return all_results


if __name__ == "__main__":
    # Works with either a PDF or an image
    sample = r"C:\Users\ce\Downloads\1_3xUyINxRtDf2qowd-kkGQA.jpg"
    print(json.dumps(get_ocr_data(sample), indent=2, ensure_ascii=False))