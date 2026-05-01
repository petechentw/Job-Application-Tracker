from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.education import Education
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.education import EducationCreate, EducationResponse, EducationUpdate

router = APIRouter(prefix="/educations", tags=["educations"])


@router.get("", response_model=list[EducationResponse])
def list_educations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Education)
        .filter(Education.user_id == current_user.id)
        .order_by(Education.order)
        .all()
    )


@router.post("", response_model=EducationResponse, status_code=status.HTTP_201_CREATED)
def create_education(
    payload: EducationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    edu = Education(user_id=current_user.id, **payload.model_dump())
    db.add(edu)
    db.commit()
    db.refresh(edu)
    return edu


@router.patch("/{edu_id}", response_model=EducationResponse)
def update_education(
    edu_id: str,
    payload: EducationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    edu = db.query(Education).filter(Education.id == edu_id, Education.user_id == current_user.id).first()
    if not edu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(edu, field, value)
    db.commit()
    db.refresh(edu)
    return edu


@router.delete("/{edu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    edu_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    edu = db.query(Education).filter(Education.id == edu_id, Education.user_id == current_user.id).first()
    if not edu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(edu)
    db.commit()
