from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analytics, auth, educations, interviews, jobs, profile, resumes, work_experiences

app = FastAPI(title="Job Application Tracker", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(interviews.router)
app.include_router(analytics.router)
app.include_router(profile.router)
app.include_router(work_experiences.router)
app.include_router(educations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
