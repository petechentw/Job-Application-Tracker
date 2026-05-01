from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str

    # JWT
    jwt_secret: str
    jwt_expire_minutes: int = 1440

    # AWS
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-west-2"
    s3_bucket_name: str = ""
    sqs_queue_url: str = ""

    # OpenAI
    openai_api_key: str = ""

    # Local file storage (used when S3_BUCKET_NAME is empty)
    local_upload_path: str = "/app/uploads"


settings = Settings()
