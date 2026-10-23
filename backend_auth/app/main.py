from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import users_collection
from app.routes import auth

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))


from Backend.prescription_analyzer.pres_ana import extract_prescription, is_pdf_bytes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enforce unique emails at the database level
    await users_collection.create_index("email", unique=True)
    yield


app = FastAPI(title="Auth API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/")
async def root():
    return {"message": "Auth API is running"}




from fastapi.concurrency import run_in_threadpool
    
MAX_FILE_SIZE_MB = 15
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | {"application/pdf"}


@app.post("/extract_pres")
async def extract(file: UploadFile = File(...)):
    """
    Upload a prescription as form-data (key: `file`).
    Accepts an image (jpg/png/webp/bmp/tiff) or a PDF.
    Everything is processed in memory; nothing is written to disk.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Upload an image or PDF.",
        )
 
    file_bytes = await file.read()
 
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
 
    if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max allowed is {MAX_FILE_SIZE_MB} MB.",
        )
 
    # Content-type headers can lie; PDFs are verified by their bytes
    if file.content_type == "application/pdf" and not is_pdf_bytes(file_bytes):
        raise HTTPException(status_code=400, detail="File is not a valid PDF.")
 
    # extract_prescription is blocking, so run it off the event loop
    data = await run_in_threadpool(
        extract_prescription, file_bytes, file.filename or "uploaded file"
    )
 
    if data is None:
        raise HTTPException(
            status_code=422,
            detail="Could not extract data from this file. Try a clearer image.",
        )
 
    return {
        "file_name": file.filename,
        "data": data,
    }
 