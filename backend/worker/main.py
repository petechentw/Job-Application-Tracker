"""
SQS Worker — polls for JD analysis jobs and processes them with Groq AI.

Flow:
  1. Receive message from SQS (contains job_id)
  2. Load job + attached resume from DB
  3. Call Groq to analyse the JD (and score against resume skills if available)
  4. Save results back to DB
  5. Delete the SQS message on success
"""

import json
import logging
import time

import boto3
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.job import Job
from app.models.resume import Resume
from app.services.ai import analyze_jd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

sqs = boto3.client(
    "sqs",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)


def process_message(body: dict, db: Session) -> None:
    job_id = body.get("job_id")
    if not job_id:
        log.warning("Message missing job_id, skipping")
        return

    job = db.get(Job, job_id)
    if not job:
        log.warning(f"Job {job_id} not found, skipping")
        return

    log.info(f"Analysing JD for job {job_id} ({job.company} – {job.role})")
    job.analysis_status = "processing"
    db.commit()

    try:
        # Load resume skills if a resume is attached
        resume_skills = None
        if job.resume_id:
            resume = db.get(Resume, job.resume_id)
            if resume and resume.parsed_skills:
                resume_skills = resume.parsed_skills

        # Single Groq call: analyse JD + compute fit score if resume skills exist
        result = analyze_jd(job.jd_text, resume_skills=resume_skills)

        job.jd_analysis = result
        job.analysis_status = "done"

        # fit_score and fit_reason come directly from the AI response
        if "fit_score" in result and result["fit_score"] is not None:
            job.fit_score = int(result["fit_score"])
            log.info(f"Fit score for job {job_id}: {job.fit_score}/100 — {result.get('fit_reason', '')}")
        else:
            log.info(f"No fit score returned for job {job_id} (no resume skills)")

        log.info(f"Done: job {job_id}")

    except Exception as e:
        job.analysis_status = "failed"
        log.error(f"Failed to analyse job {job_id}: {e}")

    db.commit()


def run() -> None:
    log.info("Worker started, polling SQS...")
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=settings.sqs_queue_url,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=10,  # long polling — reduces empty-receive API calls
            )
            messages = response.get("Messages", [])

            if not messages:
                continue

            db = SessionLocal()
            try:
                for msg in messages:
                    try:
                        body = json.loads(msg["Body"])
                        process_message(body, db)
                        sqs.delete_message(
                            QueueUrl=settings.sqs_queue_url,
                            ReceiptHandle=msg["ReceiptHandle"],
                        )
                    except Exception as e:
                        log.error(f"Error processing message: {e}")
            finally:
                db.close()

        except Exception as e:
            log.error(f"SQS polling error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    run()
