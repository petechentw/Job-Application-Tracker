import base64
import json

from openai import OpenAI

from app.core.config import settings

client = OpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a resume parser. Given a resume in PDF format, extract the following information and return ONLY valid JSON:

{
  "skills": ["skill1", "skill2"],
  "summary": "2-3 sentence professional summary of this resume",
  "tags": ["tag1", "tag2"],
  "work_experiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null if current",
      "is_current": false,
      "description": "brief description"
    }
  ],
  "educations": [
    {
      "school": "School Name",
      "degree": "Bachelor/Master/PhD",
      "field_of_study": "Computer Science",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "gpa": "3.8 or null"
    }
  ]
}

For tags, include: seniority level, main tech stack, domain (e.g. backend, frontend, data, ml), and key strengths."""


def parse_resume_pdf(pdf_bytes: bytes) -> dict:
    """Send PDF to OpenAI and extract structured resume data."""
    pdf_base64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    response = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Parse this resume and return the structured JSON.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:application/pdf;base64,{pdf_base64}",
                        },
                    },
                ],
            },
        ],
    )
    return json.loads(response.choices[0].message.content)
