from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.interview import Interview
from app.models.job import Job
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.interview import InterviewCreate, InterviewResponse, InterviewUpdate

router = APIRouter(prefix="/interviews", tags=["interviews"])


def _verify_job_ownership(job_id: str, user_id: str, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_job_ownership(payload.job_id, current_user.id, db)

    interview = Interview(
        job_id=payload.job_id,
        round=payload.round,
        interview_date=payload.interview_date,
        interviewer=payload.interviewer,
        questions=payload.questions,
        notes=payload.notes,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


@router.get("/{job_id}", response_model=list[InterviewResponse])
def list_interviews(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_job_ownership(job_id, current_user.id, db)
    return (
        db.query(Interview)
        .filter(Interview.job_id == job_id)
        .order_by(Interview.round)
        .all()
    )


@router.patch("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: str,
    payload: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    # verify ownership via job
    _verify_job_ownership(interview.job_id, current_user.id, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    return interview
