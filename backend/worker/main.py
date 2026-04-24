import json
import logging
import time

import boto3
from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.job import Job

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

openai_client = OpenAI(api_key=settings.openai_api_key)

sqs = boto3.client(
    "sqs",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)

SYSTEM_PROMPT = """You are a job description analyst. Given a job description, extract:
1. required_skills: list of technical and soft skills required
2. nice_to_have_skills: list of optional/preferred skills
3. seniority_level: one of "junior", "mid", "senior", "lead", "unknown"
4. summary: a 2-sentence summary of the role

Respond ONLY with valid JSON matching this schema:
{
  "skills": ["skill1", "skill2"],
  "nice_to_have_skills": ["skill1"],
  "seniority_level": "mid",
  "summary": "..."
}"""


def analyze_jd(jd_text: str) -> dict:
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": jd_text},
        ],
    )
    return json.loads(response.choices[0].message.content)


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
        result = analyze_jd(job.jd_text)
        job.jd_analysis = result
        job.analysis_status = "done"
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
                WaitTimeSeconds=10,  # long polling
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
