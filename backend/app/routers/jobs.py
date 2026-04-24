from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.job import Job
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.services.sqs import enqueue_jd_analysis

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _get_job_or_404(job_id: str, user_id: str, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("", response_model=list[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Job).filter(Job.user_id == current_user.id).order_by(Job.applied_at.desc()).all()


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(
    payload: JobCreate,
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
        enqueue_jd_analysis(job.id)

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
