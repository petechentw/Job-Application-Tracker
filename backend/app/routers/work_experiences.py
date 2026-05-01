from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.work_experience import WorkExperience
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.work_experience import WorkExperienceCreate, WorkExperienceResponse, WorkExperienceUpdate

router = APIRouter(prefix="/work-experiences", tags=["work_experiences"])


@router.get("", response_model=list[WorkExperienceResponse])
def list_work_experiences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(WorkExperience)
        .filter(WorkExperience.user_id == current_user.id)
        .order_by(WorkExperience.order)
        .all()
    )


@router.post("", response_model=WorkExperienceResponse, status_code=status.HTTP_201_CREATED)
def create_work_experience(
    payload: WorkExperienceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exp = WorkExperience(user_id=current_user.id, **payload.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@router.patch("/{exp_id}", response_model=WorkExperienceResponse)
def update_work_experience(
    exp_id: str,
    payload: WorkExperienceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exp = db.query(WorkExperience).filter(WorkExperience.id == exp_id, WorkExperience.user_id == current_user.id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exp, field, value)
    db.commit()
    db.refresh(exp)
    return exp


@router.delete("/{exp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_experience(
    exp_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exp = db.query(WorkExperience).filter(WorkExperience.id == exp_id, WorkExperience.user_id == current_user.id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(exp)
    db.commit()
