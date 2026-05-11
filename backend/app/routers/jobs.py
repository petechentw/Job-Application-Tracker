import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.services.sqs import enqueue_jd_analysis

log = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _get_job_or_404(job_id: str, user_id: str, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


def _run_jd_analysis(job_id: str) -> None:
    """
    Background task: analyse the JD and compute fit score via Groq.
    Runs in-process when SQS is not configured (local dev).
    When SQS IS configured, the worker container handles it instead.
    """
    from app.core.database import SessionLocal
    from app.services.ai import analyze_jd

    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job or not job.jd_text:
            return

        # Skip analysis if JD text is too short to be meaningful (< 50 chars)
        if len(job.jd_text.strip()) < 50:
            job.analysis_status = "done"
            job.jd_analysis = {"error": "Job description is too short to analyse."}
            db.commit()
            return

        job.analysis_status = "processing"
        db.commit()

        # Load resume skills for fit score calculation
        resume_skills = None
        if job.resume_id:
            resume = db.get(Resume, job.resume_id)
            if resume and resume.parsed_skills:
                resume_skills = resume.parsed_skills

        # Single AI call: analyse JD + score against resume in one shot
        result = analyze_jd(job.jd_text, resume_skills=resume_skills)

        job.jd_analysis = result
        job.analysis_status = "done"

        if result.get("fit_score") is not None:
            job.fit_score = int(result["fit_score"])
            log.info(f"Job {job_id} fit score: {job.fit_score}/100")

        db.commit()
        log.info(f"JD analysis done for job {job_id}")

    except Exception as e:
        log.error(f"JD analysis failed for job {job_id}: {e}")
        if job:
            job.analysis_status = "failed"
            db.commit()
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Job)
        .filter(Job.user_id == current_user.id)
        .order_by(Job.applied_at.desc())
        .all()
    )


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(
    payload: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = Job(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        platform=payload.platform,
        resume_id=payload.resume_id,
        jd_text=payload.jd_text,
        analysis_status="pending" if payload.jd_text else "done",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    if payload.jd_text:
        if settings.sqs_queue_url:
            # Production: offload to the dedicated worker container via SQS
            enqueue_jd_analysis(job.id)
        else:
            # Local dev: run directly in a FastAPI background thread (no SQS needed)
            background_tasks.add_task(_run_jd_analysis, job.id)

    return job


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_job_or_404(job_id, current_user.id, db)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: str,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = _get_job_or_404(job_id, current_user.id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = _get_job_or_404(job_id, current_user.id, db)
    db.delete(job)
    db.commit()
