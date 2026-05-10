---
name: recruiter-assistant
description: "A comprehensive recruitment workflow assistant designed to automate resume screening, interview question generation, and interview note summarization. Optimized for engineering roles like Golang and PHP. Use when you need to: (1) Evaluate a candidate's resume against job requirements (dynamic language/experience), (2) Generate targeted technical interview questions, or (3) Summarize and format interview feedback."
---

# Recruiter Assistant 🦞

This skill implements the recruitment efficiency workflow designed for technical hiring teams.

## Workflows

### 1. Resume Screening
Evaluate a resume (text, PDF, or image) against dynamic job requirements.
- Use `node scripts/screen_resume.js` to process local files with custom criteria.
- Command syntax: `node scripts/screen_resume.js <path_to_resume> --lang <language> --yoe <years_of_experience>`
- Example: `node scripts/screen_resume.js resume.pdf --lang Golang --yoe 5-10`
- Result: Returns a structured evaluation (score, pros/cons, fit recommendation) based on the provided parameters.

### 2. Interview Question Generation
Generate deep-dive technical questions based on the candidate's specific project experience and the job role.
- Command syntax: `node scripts/generate_questions.js <path_to_screening_result_json>`
- Focus: Targets weak points identified during screening and role-specific core competencies.

### 3. Interview Note Summarization
Transform messy interview notes into a professional evaluation report.
- Command syntax: `node scripts/summarize_interview.js <path_to_notes_file>`
- Format: Uses the template in `assets/report-template.md`.

## Job Specific Criteria
Base hiring criteria for common roles are stored in [references/hiring-criteria.md](references/hiring-criteria.md). These act as default templates that are combined with user-provided dynamic arguments.

## Core Principles
- **Accuracy First**: Do not hallucinate skills; only extract what is explicitly mentioned.
- **Consistency**: Use the standard scoring rubric defined in references.
- **Dynamic Flexibility**: Always prioritize the `--lang` and `--yoe` arguments provided by the user over defaults.
