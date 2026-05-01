from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.profile import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


def _get_or_create_profile(user_id: str, db: Session) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=ProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_or_create_profile(current_user.id, db)


@router.patch("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = _get_or_create_profile(current_user.id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return profile
