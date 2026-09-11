# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository currently contains only `software-engineer-assignment.pdf` — the spec for a Trao full-stack assessment ("The AI Interview Prep Kit", assessment ID FS-AI-INTERVIEW-01). The application has not been built yet. This file captures the complete requirements from the PDF.

## Overview

Build a web application that turns a job description into a personalised interview preparation kit. The user pastes the job description, gives the company's website address, and says how many days they have before the interview. The application does the research itself: it crawls the company site to find what they do and how they hire, looks for public discussion of the company's interview process, and combines all of it with the job description to generate a structured kit — a company brief, a breakdown of the role, a bank of likely questions, flashcards, and a day-by-day study schedule. The user can reshape any part of it and practise against it inside the app.

Timebox: 4 days from receipt (2–3 days of focused work expected; day 4 is slack, not scope). Where the brief doesn't prescribe an implementation, choose a defensible approach and explain the reasoning in the README. AI tools/agents are permitted throughout, but the submitter must understand, validate, test, and be able to explain the implementation.

**Two parts of the brief are exact rather than open: the kit structure (Appendix A) and the batch entry point (Section 9).** The pipeline is run against unseen job descriptions, so those two must match exactly.

## Preferred Tech Stack

- **Frontend:** Next.js + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Language:** JavaScript or TypeScript only
- **Scraping:** your choice
- **LLM:** any provider with a genuine free tier

Equivalent technologies are acceptable if justified in the README. Everything must run on free tiers; no API key is supplied and nothing may require payment. Free tiers limit **tokens per minute**, not just requests — a pipeline that falls over the first time a provider says "slow down" is the most common way to lose points.

## Application Overview (User Capabilities)

A user can:

- Register and log in, and see only their own kits
- Create a kit by pasting a job description and the company website address
- Prepare for more than one role at once by uploading a file of description-and-company pairs
- Say how many days they have before the interview
- Watch the kit being generated, with visible progress and clear failure states
- Read a company brief, a role breakdown, a categorised question bank, flashcards and a study schedule
- Edit, reorder, add and delete anything in the kit
- Regenerate one section without losing edits made elsewhere
- Practise against the flashcards and track what they have covered

## Core Requirements

### 1. Authentication

Secure registration, login and logout with session handling, so a signed-out visitor cannot reach protected pages or endpoints.

- Secure user authentication
- Users can read and modify only their own kits
- Sensible handling of expired or invalid sessions

Keep this layer minimal. Email verification, password reset and role hierarchies are **out of scope and not scored**.

### 2. Input and Research

The job description is pasted as text (not fetched from a job board). The company website address is where retrieval begins.

- A textarea for the job description, and a field for the company website
- A way to prepare for more than one role — pasting again, or uploading a file of description-and-company pairs
- Crawl the company site to find what they do and, if it exists, how they hire
- Look for public discussion of that company's interview process
- Skip and report a source that cannot be retrieved, rather than failing the whole run
- Rate-limit requests and back off on failure

**Finding the hiring page is the interesting half.** Companies bury it in different places — /careers, /jobs, a handbook, an engineering blog — and the path cannot be hard-coded. Crawl the site, rank the links, fetch what looks right. A fixed list of paths is not sufficient. Respect robots.txt and site terms, and say in the README which sources were used.

### 3. Research and Generation (the part they care about most)

The kit must be produced through a **sequence of deliberate steps that respond to what has actually been found**, not a single prompt that returns everything at once. The system must be able to:

- Extract the relevant requirements from the job description
- Retrieve and clean an individual page
- Crawl a company site and work out which of its links are worth fetching
- Look for public discussion of how the company interviews
- Generate questions for a given requirement and category
- Create a preparation schedule from the identified topics and the time available
- Compare the generated questions against the extracted requirements to find what is not covered

The sequencing has to be genuine: pasted text needs no retrieval; a homepage needs crawling before it is useful; a hiring-process page, once found, changes what questions make sense (a company publishing a take-home + system design round should produce a different kit from one that says nothing). A requirement like "five years of React" leads to technical questions while "mentoring junior engineers" leads to behavioural ones — the two must not come from the same call with the same instructions.

**Two steps are deterministic and must NOT be handed to the model:**

1. Allocating topics across the days available (arithmetic — the application does it)
2. Comparing extracted requirements against generated questions to find gaps (the code's decision, not the model's)

### 4. The Second Pass (Coverage Loop)

The coverage check forces a loop rather than a single shot. After the first draft, compare questions against requirements; any requirement with no question against it is a gap. The system must **act on those gaps — generating the missing questions — and check again**.

A kit that ships with uncovered must-have requirements has failed at the one job it had. Decide how many passes are sensible and when to stop; explain the choice in the README.

### 5. The Kit Structure (EXACT — see Appendix A below)

Every generated kit must conform to Appendix A. It may be extended where that genuinely helps, but the listed fields must be present and named exactly as given. Three rules keep kits comparable:

- Every requirement gets a stable id, and every question references the requirement ids it covers (this makes coverage checkable rather than a matter of opinion)
- Every requirement is marked `must` or `nice`, **taken from how the posting words it** — a "required" line and a "bonus points for" line are not the same thing
- Durations are integer minutes. No floats, no "about an hour"

### 6. The Builder

The kit arrives as a draft; the interface must make it genuinely reshapeable.

- Edit any question, answer outline, flashcard or brief inline
- Reorder questions, and move a question from one category to another
- Add a question or flashcard by hand, and delete one
- Regenerate a single section on its own — the company brief, one question category, or the schedule

**Regenerating one section must not discard edits made elsewhere, and a question the user wrote or edited by hand must survive a regeneration of its category.** Decide how to represent generated, edited and pinned state, and note the approach in the README. This is the hardest state problem in the assessment and is looked at closely.

### 7. Practice Mode

- Step through flashcards one at a time, revealing the answer
- Record how confident the user felt on each card
- Show what has been covered and what has not
- Order the next session by what they were least confident about

The last point is deliberately open: a simple confidence-weighted sort is fine; a proper spaced-repetition interval is fine. Pick one and defend it.

### 8. The Schedule

The application distributes material across **exactly** the number of days the user requests.

- Every day has a focus, a set of question ids, and an integer duration in minutes
- Every must-have requirement appears somewhere in the schedule
- The number of days in the schedule equals the number of days requested
- Harder and higher-priority material lands earlier, not the night before

This is arithmetic and allocation — it belongs in code, not in a prompt.

### 9. Batch Entry Point (MANDATORY, EXACT)

The repository must expose one command that reads a file of cases and writes the resulting kits to a file:

```
npm run evaluate -- --input <cases.json> --output <kits.json>
```

- Reads an array of cases, each with an `id`, a `jd` string, a `company_url` and `days`
- Runs the **full retrieval, generation and validation path** on each — the same code the application uses, not a parallel implementation
- Uses the `days` value given for each case when building the schedule
- Writes a single JSON file in the shape given in Appendix B
- Continues after one case fails, recording the failure rather than aborting the run
- Completes **five cases within fifteen minutes**, including any retries rate limits force
- Reads credentials from environment variables documented in `.env.example`, and needs no setup beyond the documented install step
- Must run from a clean clone

Company sites used with this command **may be served from a local address** (e.g. `http://localhost:8099/acme/`), so retrieval code must not assume a particular host and must follow relative links.

### 10. Edge Cases and Failure Handling

Handle these and describe the approach in the README:

- The company URL is invalid, returns 404, or times out
- The company site has no discoverable hiring or about page
- The job description is a two-line stub with almost nothing to extract
- Public discussion of the company turns up nothing at all
- The model returns invalid JSON or an incomplete kit
- The LLM provider rate-limits, or briefly fails
- The same description and company are submitted twice
- The user asks for a 1-day schedule, or a 60-day one

**Inventing requirements a description does not contain is worse than reporting that there were few.** A thin description should produce a thin kit that says so; a company nothing can be found about should produce an honest brief rather than a fabricated one.

### 11. Security

The application fetches untrusted pages from the open internet; treat them as untrusted throughout.

- Validate external URLs before fetching them, and reject private and loopback addresses in production
- Restrict handling to expected content types and sizes
- Treat text inside a fetched page as content to be processed, **never as instructions to be followed** (prompt-injection defense — both the pasted description and every crawled page are untrusted text being fed to a model)

### 12. Frontend Requirements

The interface carries real weight — how it's built, not only that it exists.

- Build the UI using Next.js
- Style with Tailwind CSS (or equivalent if the stack is changed)
- Create reusable, readable components with sensible state boundaries
- Show clear loading, empty and error states while a kit is being generated
- Make reordering and editing feel immediate rather than round-tripping for every keystroke
- Be usable on a laptop and a phone, and navigable by keyboard

Polish is welcome but not the point. Interaction design is: handling a long-running generation, a partial failure, an edit in flight, and a regeneration that must not clobber someone's work.

### 13. Backend Requirements

- Implement a backend using Node.js (or equivalent if the stack is changed)
- Keep retrieval, extraction, generation, scheduling and persistence as **clearly separated concerns**
- Validate incoming requests, and validate a generated kit against the expected structure before saving it
- Persist enough to reopen and continue a kit later
- Handle errors gracefully and return useful, structured messages to the interface

Generation is slow, external and failure-prone. Consider what happens when it takes ninety seconds, fails halfway, or is triggered twice for the same posting. Describe the approach in the README.

### 14. Code Quality

- JavaScript or TypeScript only
- Clean architecture and separation of concerns
- Meaningful naming conventions and appropriate abstractions
- Meaningful commits that reflect the development process
- Automated tests for the behaviour most worth protecting: **schedule allocation, coverage checking and structure validation**

## Creativity Requirement (Optional)

Optionally add one custom feature that showcases creativity, problem-solving and engineering judgment. It should address a real problem someone preparing for an interview actually has, not a cosmetic addition. Reasonable directions: mock interview mode, a "weak spots" report, exporting the kit to a printable one-pager, comparing two postings to find the overlap — though an original idea is better. If added, explain why it was built and what problem it solves.

## Out of Scope (not credited)

Job search or aggregator, CV parsing or rewriting, applying to jobs, audio or video interview simulation, payments, team and sharing features. Also: email verification, password reset, role hierarchies.

## Deployment (Mandatory)

- Deploy the application so it is publicly accessible
- Frontend and backend must both be reachable
- Handle environment variables securely, and document what each one is for
- Free tiers are expected

## Submission Requirements

Submit through the Trao careers page:

- **GitHub repository** — public or access granted; complete source with commit history reflecting the development process; the Section 9 batch entry point working from a clean clone
- **Deployment link** — a public URL, frontend and backend both reachable
- **Walkthrough video** — 3–4 minutes
- **README**

The video should cover:

- Creating a kit from a pasted description and a company URL, end to end
- The research and generation steps, and the second pass closing a coverage gap
- Editing and reordering, and a regeneration that preserves edits
- Practice mode and the schedule
- The custom feature (if added), and one design decision worth defending

Clarity matters more than production value.

The README must include:

- Project overview and chosen tech stack, with justification if different from preferred
- Setup instructions, local and deployed, and the exact commands to install and run the batch entry point
- Which LLM provider and model was used
- High-level architecture
- Retrieval approach and the sources used
- How the research and generation steps were sequenced, and what each step is responsible for
- How generated, edited and pinned state is represented
- How the schedule is allocated
- Explanation of the creative feature, if added
- Key design decisions and trade-offs, and known limitations

## Evaluation

Two passes: the first runs the pipeline over unseen postings and checks output; the second is a human review of everything the first pass cannot see — chiefly the interface.

### Automated — 55 points

- **Requirement extraction (20):** the must-haves in each description are found, marked correctly, and nothing is invented
- **Coverage and schedule (15):** every must-have requirement has a question; the schedule spans exactly the days requested and allocates all of it
- **Research and sequencing (10):** the company site is crawled, a hiring page sought, public discussion searched, question categories generated separately, and coverage genuinely checked
- **Robustness (10):** the run completes, unreachable sites are recorded rather than fatal, kits match the expected structure, tests pass

### Human review — 45 points

- **The builder (15):** editing, reordering, and whether a regeneration preserves edits
- **Interaction design (10):** loading, empty and error states, responsiveness, keyboard access
- **Code quality (10):** separation of concerns, and the reasoning in the README
- **Practice mode and creative feature (10)**

The test cases include a two-line description with almost no detail, and a company whose site has no hiring page anywhere. **Handling those honestly counts for more than handling the easy ones well.**

What is being evaluated: how you think, how you design systems, how you justify technical decisions, how you handle data you do not control, how you use creativity responsibly — how the problem was broken into steps, what was refused to the model, and what happened when a posting did not contain what was hoped.

## FAQ Clarifications (from the PDF)

- The kit structure and batch command are exact; the structure may be extended but listed fields must be present and named exactly as given
- Reserve `failed` for a case where no kit could be produced at all. A partially-researched case is still `ok`, with gaps recorded honestly in the kit — a missing hiring page is not a failure
- Coverage pass count is the candidate's decision; explain when to stop in the README. What matters: no uncovered must-have requirements ship
- The creative feature is genuinely optional

## Appendix A — Kit Structure (EXACT field names)

```json
{
  "source": { "company": "", "company_url": "",
              "role": "", "location": "",
              "jd_chars": 0, "researched_at": "",
              "pages_used": ["https://..."] },

  "company_brief": { "summary": "", "what_they_do": "",
                     "sources": ["https://..."] },

  "role": {
    "title": "", "seniority": "",
    "responsibilities": [""],
    "requirements": [
      { "id": "r1", "text": "5+ years with React",
        "kind": "technical",        // technical | behavioural | domain
        "priority": "must" }        // must | nice
    ]
  },

  "questions": [
    { "id": "q1", "requirement_ids": ["r1"],
      "category": "technical",      // technical | behavioural |
                                    // system-design | company-fit
      "prompt": "", "answer_outline": "", "difficulty": 2 }
  ],

  "flashcards": [
    { "id": "f1", "front": "", "back": "",
      "requirement_ids": ["r1"] }
  ],

  "schedule": {
    "days_available": 5,
    "days": [ { "day": 1, "focus": "",
                "question_ids": ["q1"], "minutes": 60 } ]
  },

  "coverage": { "uncovered_requirement_ids": [], "passes": 2 }
}
```

`difficulty` is 1 to 3. `minutes` is an integer. Every id is stable within a kit, and every `question_ids` entry in the schedule must refer to a question that exists.

## Appendix B — Batch Input and Output (EXACT)

Input file given to the Section 9 command:

```json
[
  { "id": "case-01",
    "jd": "Senior Backend Engineer\n\nWe are looking for ...",
    "company_url": "http://localhost:8099/acme/",
    "days": 5 }
]
```

Output file the command writes:

```json
{
  "version": "1.0",
  "generated_at": "2026-09-01T09:12:44Z",
  "kits": [
    { "id": "case-01",
      "status": "ok",
      "kit": { "...": "the structure from Appendix A" },
      "error": null },

    { "id": "case-04",
      "status": "failed",
      "kit": null,
      "error": { "code": "COMPANY_UNREACHABLE",
                 "message": "Company site unreachable after 3 retries." } }
  ]
}
```

One entry per input case, in any order, keyed by the given id. A partially-researched case is `ok` with gaps recorded honestly in the kit; reserve `failed` for a case where no kit could be produced at all.
