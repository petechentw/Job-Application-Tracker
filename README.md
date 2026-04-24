# Job Application Tracker

An AI-powered job search management platform that helps you track applications, analyze job descriptions, and identify skill gaps — built with a production-grade async architecture.

> **Live demo:** `http://<your-ec2-ip>:8000` · **API docs:** `/docs`

---

## Features

- **JD Analysis** — Paste any job description and get AI-extracted required skills, seniority level, and a fit score against your resume
- **Application Tracking** — Log every application with status, date, platform, and which resume version you used
- **Interview Notes** — Record interview rounds, questions asked, and your answers per application
- **Resume Management** — Upload multiple resume versions as PDF, stored on AWS S3
- **Analytics Dashboard** — Visualize application funnel, response rates, and the top skills appearing across all your JDs
- **Multi-user** — JWT-based auth so anyone can use it with their own data

---

## Architecture

```
┌─────────────────┐        ┌──────────────────────────────────────────────┐
│  React Frontend │        │                  AWS EC2                      │
│  (TypeScript)   │──────▶ │                                              │
└─────────────────┘        │  ┌─────────────┐      ┌──────────────────┐  │
                            │  │  FastAPI    │─────▶│   AWS SQS        │  │
                            │  │  REST API   │      │   (JD analysis   │  │
                            │  │  JWT auth   │      │    queue)        │  │
                            │  └──────┬──────┘      └────────┬─────────┘  │
                            │         │                       │            │
                            │         ▼                       ▼            │
                            │  ┌─────────────┐      ┌──────────────────┐  │
                            │  │ PostgreSQL  │◀─────│  Worker Service  │  │
                            │  │             │      │  (Docker)        │  │
                            │  └─────────────┘      │  OpenAI API      │  │
                            │                        └──────────────────┘  │
                            └──────────────────────────────────────────────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   AWS S3    │
                                   │ (Resumes)   │
                                   └─────────────┘
```

**Why async JD analysis?**
Calling OpenAI takes 3–8 seconds. Instead of blocking the API, the request is enqueued to AWS SQS immediately (`202 Accepted`), a Dockerized worker picks it up and runs the analysis, then updates the job record. The frontend polls `GET /jobs/:id` until status changes to `done`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Database | PostgreSQL (SQLAlchemy ORM) |
| Queue | AWS SQS |
| Storage | AWS S3 |
| Compute | AWS EC2 |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| AI | OpenAI API (GPT-4o) |
| Frontend | React, TypeScript |

---

## Database Schema

```
users
├── id (UUID, PK)
├── email
├── hashed_password
└── created_at

resumes
├── id (UUID, PK)
├── user_id (FK → users)
├── name
├── s3_key
└── uploaded_at

jobs
├── id (UUID, PK)
├── user_id (FK → users)
├── resume_id (FK → resumes)
├── company
├── role
├── platform
├── status  (applied | interview | offer | rejected)
├── applied_at
├── jd_text
├── jd_analysis (JSONB)  ← populated async by worker
└── analysis_status  (pending | processing | done | failed)

interviews
├── id (UUID, PK)
├── job_id (FK → jobs)
├── round
├── interview_date
├── interviewer
├── questions (JSONB)
└── notes
```

---

## API Endpoints

```
POST   /auth/register
POST   /auth/login

GET    /jobs               # list all applications
POST   /jobs               # add new application + enqueue JD analysis
GET    /jobs/:id           # get application + analysis status
PATCH  /jobs/:id           # update status, notes
DELETE /jobs/:id

POST   /resumes            # upload PDF → S3
GET    /resumes            # list uploaded resumes
GET    /resumes/:id/url    # get presigned download URL

POST   /interviews         # log interview round
GET    /interviews/:job_id # get all rounds for a job
PATCH  /interviews/:id     # update notes

GET    /analytics          # aggregated stats (response rate, top skills, etc.)
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- AWS account (EC2, S3, SQS)
- OpenAI API key

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/job-tracker.git
cd job-tracker

# 2. Set up environment variables
cp .env.example .env
# Fill in: DATABASE_URL, AWS credentials, OPENAI_API_KEY, JWT_SECRET

# 3. Start all services
docker-compose up --build

# 4. Run database migrations
docker-compose exec api alembic upgrade head

# 5. API is live at http://localhost:8000
#    Interactive docs at http://localhost:8000/docs
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@db:5432/jobtracker
JWT_SECRET=your-secret-key
JWT_EXPIRE_MINUTES=1440

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-west-2
S3_BUCKET_NAME=job-tracker-resumes
SQS_QUEUE_URL=https://sqs.us-west-2.amazonaws.com/<account-id>/jd-analysis

OPENAI_API_KEY=
```

### Production Deployment (EC2)

Deployment is automated via GitHub Actions. On every push to `main`:

1. Builds Docker images
2. Pushes to AWS ECR
3. SSHs into EC2 and runs `docker-compose pull && docker-compose up -d`

To set up manually on a fresh EC2 instance:

```bash
# Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose

# Clone and run
git clone https://github.com/<your-username>/job-tracker.git
cd job-tracker
docker-compose -f docker-compose.prod.yml up -d
```

---

## Project Structure

```
job-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/         # auth, jobs, resumes, interviews, analytics
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # business logic, OpenAI integration
│   │   └── core/            # config, JWT, database session
│   ├── worker/
│   │   └── main.py          # SQS polling + OpenAI analysis
│   ├── alembic/             # database migrations
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Applications, Analytics
│   │   ├── components/
│   │   └── api/             # axios client
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/
    └── workflows/
        └── deploy.yml       # CI/CD pipeline
```

---

## Roadmap

- [x] JWT auth + multi-user
- [x] Job CRUD + status tracking
- [x] Async JD analysis via SQS + Worker
- [x] Resume upload to S3
- [x] Interview notes
- [x] React dashboard
- [x] GitHub Actions CI/CD to EC2
- [ ] Email notifications when analysis completes
- [ ] Browser extension for one-click JD import
- [ ] Resume version comparison against JD fit score

---

## License

MIT
