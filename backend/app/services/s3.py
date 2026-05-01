import os
from pathlib import Path

import boto3

from app.core.config import settings

# If S3_BUCKET_NAME is not set, fall back to local file storage.
# LOCAL_UPLOAD_PATH can be overridden via env var (useful for tests).
LOCAL_STORAGE_PATH = Path(settings.local_upload_path)

_client = None


def _use_local() -> bool:
    return not settings.s3_bucket_name


def get_s3_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
    return _client


def upload_file(file_bytes: bytes, s3_key: str, content_type: str = "application/pdf") -> None:
    if _use_local():
        dest = LOCAL_STORAGE_PATH / s3_key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(file_bytes)
        return

    client = get_s3_client()
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=s3_key,
        Body=file_bytes,
        ContentType=content_type,
    )


def generate_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    if _use_local():
        # Return a local download endpoint instead of a presigned URL
        return f"/resumes/download/{s3_key}"

    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": s3_key},
        ExpiresIn=expires_in,
    )
