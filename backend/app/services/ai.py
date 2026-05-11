from __future__ import annotations

"""
AI service — wraps Groq (OpenAI-compatible) for all LLM calls.

Two main functions:
  analyze_jd(jd_text, resume_skills)  → JD analysis + fit score in one call
  parse_resume_pdf(pdf_bytes)          → extract structured data from a resume PDF
"""

import base64
import json
import logging

from openai import OpenAI

from app.core.config import settings

log = logging.getLogger(__name__)

# Groq uses the OpenAI SDK — just swap the base_url and api_key
_client = OpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

# Best free Groq model as of 2025 — strong reasoning, fast
_MODEL = "llama-3.3-70b-versatile"


# ── JD Analysis + Fit Score ───────────────────────────────────────────────────

_JD_SYSTEM = """You are a job description analyst and career coach.

Given a job description and (optionally) a candidate's skills list, return a JSON object with:

{
  "skills": ["required skill 1", ...],          // must-have technical/soft skills
  "nice_to_have_skills": ["skill 1", ...],       // preferred but not required
  "seniority_level": "junior|mid|senior|lead|unknown",
  "summary": "2-sentence role summary",
  "fit_score": 0-100 or null,                   // null if no resume skills provided
  "fit_reason": "1-sentence explanation of the score" or null
}

Fit score rules (only when resume_skills is provided):
Count how many REQUIRED skills the candidate has, then score strictly:

- 90-100: Candidate has ALL required skills AND most nice-to-have skills
- 75-89:  Candidate has most required skills (80%+), minor gaps only
- 55-74:  Candidate has some required skills (50-79%), noticeable gaps
- 30-54:  Candidate has few required skills (25-49%), significant gaps
- 0-29:   Candidate has very few required skills (under 25%)

Rules:
- If the text is not a real job description (random characters, too vague, no skills mentioned), return empty skills lists, "unknown" seniority, and null for fit_score
- Count exact matches between required_skills list and candidate skills
- Be STRICT and DIFFERENTIATED — two different jobs must get different scores unless the match is truly identical
- Do NOT default to 75-85 range; spread scores across the full 0-100 range
- Nice-to-have skills can add up to 10 bonus points on top of the base score

Respond ONLY with valid JSON, no markdown."""


def analyze_jd(jd_text: str, resume_skills: list[str] | None = None) -> dict:
    """
    Analyse a job description with Groq.
    If resume_skills is provided, also compute an AI fit score (0-100).
    """
    user_content = f"Job Description:\n{jd_text}"
    if resume_skills:
        user_content += f"\n\nCandidate's skills: {', '.join(resume_skills)}"

    response = _client.chat.completions.create(
        model=_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _JD_SYSTEM},
            {"role": "user",   "content": user_content},
        ],
        temperature=0.2,  # low temperature for consistent, factual output
    )
    return json.loads(response.choices[0].message.content)


# ── Resume Parsing ────────────────────────────────────────────────────────────

_RESUME_SYSTEM = """You are a resume parser. Extract structured information from the resume text.

Return a JSON object:
{
  "skills": ["skill1", "skill2", ...],
  "summary": "2-3 sentence professional summary",
  "tags": ["tag1", ...],   // 3-6 high-level tags e.g. "Frontend", "ML", "Backend"
  "work_experiences": [
    {
      "company": "...",
      "title": "...",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null if current",
      "is_current": true/false,
      "description": "brief description"
    }
  ],
  "educations": [
    {
      "school": "...",
      "degree": "...",
      "field_of_study": "...",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM",
      "gpa": "..." or null
    }
  ]
}

Respond ONLY with valid JSON, no markdown."""


def parse_resume_text(resume_text: str) -> dict:
    """Parse a resume from plain text (extracted from PDF)."""
    response = _client.chat.completions.create(
        model=_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _RESUME_SYSTEM},
            {"role": "user",   "content": resume_text},
        ],
        temperature=0.1,
    )
    return json.loads(response.choices[0].message.content)


def parse_resume_pdf(pdf_bytes: bytes) -> dict:
    """
    Parse a resume PDF.
    Groq doesn't support vision/file uploads, so we use pdfminer to extract
    text first, then send the text to the LLM.
    """
    try:
        from pdfminer.high_level import extract_text
        import io
        text = extract_text(io.BytesIO(pdf_bytes))
    except Exception as e:
        log.warning(f"PDF text extraction failed: {e}. Sending raw bytes as base64 hint.")
        text = f"[PDF content — could not extract text: {e}]"

    if not text or len(text.strip()) < 50:
        log.warning("Extracted text is too short, resume parsing may be inaccurate.")

    return parse_resume_text(text.strip())
