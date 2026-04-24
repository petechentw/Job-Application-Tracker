import json
import boto3

from app.core.config import settings

_client = None


def get_sqs_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "sqs",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
    return _client


def enqueue_jd_analysis(job_id: str) -> None:
    """Send a job_id to SQS for async JD analysis. No-op if queue URL is not configured."""
    if not settings.sqs_queue_url:
        return

    client = get_sqs_client()
    client.send_message(
        QueueUrl=settings.sqs_queue_url,
        MessageBody=json.dumps({"job_id": job_id}),
    )
