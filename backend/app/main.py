from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analytics, auth, educations, interviews, jobs, profile, resumes, work_experiences

app = FastAPI(title="Job Application Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── v1 routers ────────────────────────────────────────────────────────────────
# All routes are prefixed with /v1 for versioning.
# When breaking changes are needed, add a /v2 prefix and keep /v1 intact
# so existing clients don't break.
app.include_router(auth.router,             prefix="/v1")
app.include_router(jobs.router,             prefix="/v1")
app.include_router(resumes.router,          prefix="/v1")
app.include_router(interviews.router,       prefix="/v1")
app.include_router(analytics.router,        prefix="/v1")
app.include_router(profile.router,          prefix="/v1")
app.include_router(work_experiences.router, prefix="/v1")
app.include_router(educations.router,       prefix="/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
