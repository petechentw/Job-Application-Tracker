import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.models.resume import Resume
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.resume import ResumeResponse, ResumeURLResponse
from app.services.s3 import LOCAL_STORAGE_PATH, _use_local, generate_presigned_url, upload_file
from app.services.resume_parser import parse_resume_pdf

router = APIRouter(prefix="/resumes", tags=["resumes"])

ALLOWED_CONTENT_TYPES = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
HISTORY_LIMIT = 50


def _parse_resume_background(resume_id: str, pdf_bytes: bytes) -> None:
    """Run in background: parse resume with OpenAI and update DB."""
    db = SessionLocal()
    try:
        resume = db.get(Resume, resume_id)
        if not resume:
            return
        resume.parse_status = "processing"
        db.commit()

        result = parse_resume_pdf(pdf_bytes)
        resume.parsed_skills = result.get("skills", [])
        resume.parsed_summary = result.get("summary")
        resume.tags = result.get("tags", [])
        resume.parse_status = "done"
        db.commit()
    except Exception:
        resume = db.get(Resume, resume_id)
        if resume:
            resume.parse_status = "failed"
            db.commit()
    finally:
        db.close()


def _enforce_history_limit(user_id: str, db: Session) -> None:
    """Keep at most HISTORY_LIMIT inactive resumes, delete oldest if exceeded."""
    history = (
        db.query(Resume)
        .filter(Resume.user_id == user_id, Resume.is_active == False)
        .order_by(Resume.uploaded_at.asc())
        .all()
    )
    while len(history) > HISTORY_LIMIT:
        db.delete(history.pop(0))
    db.commit()


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10 MB)")

    s3_key = f"resumes/{current_user.id}/{uuid.uuid4()}.pdf"
    upload_file(file_bytes, s3_key)

    resume = Resume(
        user_id=current_user.id,
        name=file.filename or s3_key,
        s3_key=s3_key,
        is_active=True,
        parse_status="pending",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Trigger AI parsing in background (no-op if OpenAI key not set)
    if settings_has_openai():
        background_tasks.add_task(_parse_resume_background, resume.id, file_bytes)

    return resume


def settings_has_openai() -> bool:
    from app.core.config import settings
    return bool(settings.openai_api_key)


@router.get("", response_model=list[ResumeResponse])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.is_active.desc(), Resume.uploaded_at.desc())
        .all()
    )


@router.patch("/{resume_id}/deactivate", response_model=ResumeResponse)
def deactivate_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a resume from Active to History."""
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    resume.is_active = False
    db.commit()
    _enforce_history_limit(current_user.id, db)
    db.refresh(resume)
    return resume


@router.patch("/{resume_id}/activate", response_model=ResumeResponse)
def activate_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move a resume from History back to Active."""
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    resume.is_active = True
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/{resume_id}/url", response_model=ResumeURLResponse)
def get_resume_url(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    url = generate_presigned_url(resume.s3_key)
    return ResumeURLResponse(url=url)


@router.get("/download/{s3_key:path}")
def download_local(s3_key: str):
    """Local development only: serve uploaded PDF directly."""
    if not _use_local():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not available in production")
    file_path = LOCAL_STORAGE_PATH / s3_key
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(file_path, media_type="application/pdf")
