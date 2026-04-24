from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.job import Job
from app.models.user import User
from app.routers.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(Job).filter(Job.user_id == current_user.id).all()
    total = len(jobs)

    # application funnel
    status_counts = Counter(j.status for j in jobs)

    # response rate = jobs that moved past "applied"
    responded = sum(1 for j in jobs if j.status != "applied")
    response_rate = round(responded / total * 100, 1) if total else 0

    # top skills from jd_analysis
    skill_counter: Counter = Counter()
    for job in jobs:
        if job.jd_analysis and isinstance(job.jd_analysis.get("skills"), list):
            skill_counter.update(job.jd_analysis["skills"])
    top_skills = [{"skill": s, "count": c} for s, c in skill_counter.most_common(10)]

    return {
        "total_applications": total,
        "status_breakdown": dict(status_counts),
        "response_rate_pct": response_rate,
        "top_skills": top_skills,
    }
