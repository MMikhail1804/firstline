# FirstLine — AI Outreach Copilot

## Product Overview

**What:** Chrome extension with Side Panel that analyzes LinkedIn profiles, finds role-specific reasons to reach out, chooses the best approach, and generates goal-aware personalized outreach messages.

**Positioning:** Not a "message generator" — an AI copilot that adapts to your role (Sales, Recruiter, Founder), finds the right angle, applies goal-specific strategy, integrates sender context, and creates messages that get replies.

**Tagline:** Find the right reason to reach out.

**Target:** SDRs, recruiters, and founders doing LinkedIn outreach.

**Pricing (planned):** Free (5 sequences/day) → Pro $29/mo (unlimited).

**Model:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`). Configurable via `LLM_MODEL` env var.

**Domain:** [firstline.to](https://firstline.to)

**Backend URL:** https://firstline-bpg9.onrender.com

**Landing:** https://firstline.to (hosted on Netlify)

**GitHub:** https://github.com/MMikhail1804/firstline

**Chrome Web Store:** submitted for review

---

## Project Structure

```
outreach-ai/
├── extension/
│   ├── manifest.json          # Chrome Manifest V3, Side Panel, LinkedIn permissions
│   ├── content_script.js      # LinkedIn DOM parser + floating button + retry logic
│   ├── background.js          # Service worker: API proxy, storage (role + sender profile), side panel
│   ├── sidepanel.html         # Side Panel UI with role selector + feedback link
│   ├── sidepanel.js           # UI logic (vanilla JS, role-aware, auto-save)
│   ├── styles.css             # All styles including role selector + feedback link
│   └── icons/
│       ├── icon.svg           # Source SVG (chat bubble + direction arrow)
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── backend/
│   ├── main.py                # FastAPI app + CORS + /health + /stats
│   ├── schemas.py             # Pydantic models (with role field)
│   ├── llm.py                 # Claude API + role-specific prompt templates + JSON extraction
│   ├── analytics.py           # File-based analytics: log_event + get_stats
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── insights.py        # POST /api/insights (role-aware, with analytics)
│   │   └── generate.py        # POST /api/generate (role-aware, with analytics)
│   ├── requirements.txt
│   ├── Procfile               # Render deployment: uvicorn start command
│   ├── .env
│   └── .env.example
├── landing/
│   ├── index.html             # Landing page (self-contained HTML/CSS/JS)
│   └── privacy.html           # Privacy policy page
├── netlify.toml               # Netlify build config for landing
├── .gitignore
├── PRODUCT_SPEC.md
└── ROADMAP.md
```

---

## Tech Stack

- Extension: Chrome Manifest V3, Side Panel API, vanilla JS
- Backend: Python 3.13, FastAPI, uvicorn
- LLM: Claude Sonnet 4.5 via Anthropic API
- Dependencies: fastapi, uvicorn, anthropic, pydantic, python-dotenv
- Analytics: file-based JSONL logging (`backend/analytics.py`) with `/stats` endpoint
- Deployment: Render (backend), Netlify (landing)

---

## How to Run

### Backend
```bash
cd ~/Documents/outreach-ai/backend
python3.13 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add ANTHROPIC_API_KEY and LLM_MODEL
uvicorn main:app --reload
```

### Extension
1. chrome://extensions/ → Developer mode → Load unpacked → select extension/
2. Go to any LinkedIn profile → click "FirstLine" button or extension icon

---

## Deployment

### Backend (Render)
- Hosted at https://firstline-bpg9.onrender.com
- `Procfile` defines the start command: `web: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}`
- Environment variables set in Render dashboard: `ANTHROPIC_API_KEY`, `LLM_MODEL`
- Auto-deploys from GitHub repo

### Landing (Netlify)
- Hosted at https://firstline.to
- `netlify.toml` configures build: base directory `landing/`, publish `.`, no build command
- Custom domain `firstline.to` configured via Netlify DNS
- Privacy policy page at `/privacy.html`

### Domain
- Domain: `firstline.to`
- DNS managed via Netlify

### Chrome Web Store
- Extension submitted for review
- Listed as "FirstLine — AI Outreach Copilot"

---

## Analytics

`backend/analytics.py` provides simple file-based analytics:
- Every `/api/insights` and `/api/generate` call is logged to `analytics.jsonl`
- Each entry includes timestamp, event type, profile name, role, and goal
- `GET /stats` endpoint returns aggregated stats: total insights, total generates, unique profiles, breakdown by role and goal, and the 10 most recent events

---

## Feedback

- Landing page includes a feedback form via FormSubmit
- Extension side panel includes a "Send Feedback" link pointing to `https://firstline.to#feedback`

---

## Role System

Users select their role once. Everything adapts:

| | Sales / SDR | Recruiter | Founder |
|---|---|---|---|
| **Insight focus** | Pain points, tooling needs, growth signals | Career trajectory, skill gaps, openness to move | Partnership signals, shared problems, authority |
| **Goals** | Book Demo / Start Conversation | Pitch Role / Start Conversation | Book Meeting / Start Conversation |
| **Tone** | Confident, slightly direct | Warm, career-focused | Peer-to-peer, casual |
| **Sender label** | "About your product" | "About the role / company" | "About your startup" |
| **CTA style** | "15 min call this week?" | "Open to hearing about the role?" | "Worth comparing notes?" |

### Insight types per role:
- **Sales:** career_move, shared_interest, pain_signal, content_signal, expertise_signal
- **Recruiter:** career_trajectory, skill_signal, openness_signal, growth_pattern, unique_background
- **Founder:** shared_interest, authority_signal, domain_expertise, network_signal, partnership_potential

---

## API Endpoints

### GET /health
Returns `{"status": "ok"}`.

### GET /stats
Returns aggregated analytics: total insights, total generates, unique profiles, breakdown by role and goal, recent 10 events.

### POST /api/insights
Role-aware profile analysis.

Request:
```json
{
  "profile": {
    "name": "Alex Kim",
    "headline": "Senior Backend Engineer at Stripe",
    "current_role": "Senior Backend Engineer",
    "current_company": "Stripe",
    "about": "Building distributed payment systems.",
    "experience": ["Senior Backend Engineer @ Stripe (2 years)", "Software Engineer @ Google Cloud (3 years)"]
  },
  "role": "recruiter"
}
```

Response (recruiter mode):
```json
{
  "insights": [
    {
      "type": "career_trajectory",
      "text": "Made a strategic move from Google Cloud to Stripe — leveled up while shifting to fintech",
      "relevance": "Shows ambition in fintech, not just pure infrastructure"
    },
    {
      "type": "growth_pattern",
      "text": "2 years at Stripe suggests potential readiness for next move",
      "relevance": "May be open to staff+ level roles"
    }
  ]
}
```

### POST /api/generate
Role-aware and goal-aware message generation.

Request:
```json
{
  "profile": { "..." },
  "selected_insights": [ "..." ],
  "goal": "pitch_role",
  "sender_profile": "Hiring Staff Backend Engineer at Coinbase. Remote, $220-280k",
  "role": "recruiter"
}
```

Response:
```json
{
  "angle": "fintech infrastructure evolution",
  "reason": "His move from Google Cloud to Stripe shows clear interest in payment infrastructure",
  "goal_applied": "Positioned the Staff role as a logical evolution of his fintech work",
  "message_1": "Your trajectory from Google Cloud infra to building Stripe's distributed payment systems is exactly the path we're looking for...",
  "message_2": "Curious if you've thought about the next layer — where payments meet programmable money..."
}
```

---

## User Flow

```
1. User opens LinkedIn profile
2. Clicks floating "FirstLine" button → Side Panel opens
3. Selects role: Sales / SDR | Recruiter | Founder (saved, one-time)
4. Fills sender context (auto-saved on generate)
5. Clicks "Analyze Profile"
   → content_script extracts profile with retry
   → POST /api/insights (with role) → returns role-specific insights
6. Selects relevant insights
7. Chooses goal (options depend on role)
8. Clicks "Generate Messages"
   → POST /api/generate (with role + goal) → returns angle + messages
9. Sees "Approach" card + 2 messages in tabs
10. Copies → pastes into LinkedIn
```

---

## Key Design Decisions

### Role-Specific Prompts (Plan B)
Separate INSIGHT_SYSTEM, GENERATE_SYSTEM, and GOAL_CONTEXT per role. Not conditional blocks in one prompt, but completely different prompt templates. Sales looks for pain points; recruiters look for career trajectory; founders look for partnership signals.

### Short, Human Messages
Messages are capped at 50 words max, 2-4 sentences. The system prompt enforces this with BAD/GOOD examples showing the difference between a 70-word "copywriter" message and a 30-word "human" message. The prompt explicitly states: "If your message is longer than 50 words, you have FAILED." Rules: no filler, no smooth transitions, fragments OK, start specific, end with question.

### Goal-Driven Generation
CRITICAL GOAL RULES with explicit good/bad CTA examples. `start_conversation` FORBIDS meeting language. `book_demo`/`pitch_role`/`book_meeting` REQUIRE next-step language.

### Sender Context Integration
SENDER CONTEXT RULES force the model to mention sender's product/role/startup naturally. Label changes per role: "About your product" → "About the role / company" → "About your startup".

### Approach Card
Shows angle + reason + goal_applied in compact UI. "Approach" label (user-friendly), `angle` field (backend).

### LinkedIn Parser
Modular functions with fallback selectors + heading-text detection for localized UIs. MutationObserver-based `waitForProfile()` waits for h1 to appear in DOM before extracting.

### Robust JSON Extraction
`_clean_json_string()` char-by-char parser handles raw control characters from LLM. Markdown block removal. Brace-matching fallback.

---

## Source Code

### backend/main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from analytics import get_stats
from routes.insights import router as insights_router
from routes.generate import router as generate_router

app = FastAPI(title="FirstLine API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insights_router)
app.include_router(generate_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/stats")
async def stats():
    return get_stats()
```

### backend/schemas.py

```python
from pydantic import BaseModel


class LinkedInProfile(BaseModel):
    name: str
    headline: str = ""
    current_role: str = ""
    current_company: str = ""
    location: str = ""
    about: str = ""
    experience: list[str] = []
    profile_url: str = ""


class Insight(BaseModel):
    type: str
    text: str
    relevance: str


class InsightRequest(BaseModel):
    profile: LinkedInProfile
    role: str = "sales"  # sales, recruiter, founder


class InsightResponse(BaseModel):
    insights: list[Insight]


class GenerateRequest(BaseModel):
    profile: LinkedInProfile
    selected_insights: list[Insight]
    goal: str
    sender_profile: str = ""
    role: str = "sales"  # sales, recruiter, founder


class GenerateResponse(BaseModel):
    angle: str = ""
    reason: str = ""
    goal_applied: str = ""
    message_1: str
    message_2: str
```

### backend/llm.py

```python
import json
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = os.getenv("LLM_MODEL", "claude-3-haiku-20240307")

BANNED_PHRASES = [
    "I came across your profile",
    "I hope this finds you well",
    "I hope you're doing well",
    "I noticed you're doing amazing work",
    "I'd love to pick your brain",
    "Quick question",
    "Hope you're having a great",
    "I was impressed by",
    "I'm reaching out because",
    "would love to connect",
    "reaching out because",
    "quick intro",
]

BANNED_BLOCK = "\n".join(f'- "{p}"' for p in BANNED_PHRASES)


# ── JSON extraction ──

def _clean_json_string(text: str) -> str:
    out = []
    in_string = False
    escape = False
    for ch in text:
        if escape:
            out.append(ch)
            escape = False
            continue
        if ch == '\\' and in_string:
            out.append(ch)
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            out.append(ch)
            continue
        if ord(ch) < 0x20:
            if in_string:
                out.append(' ')
            continue
        out.append(ch)
    return ''.join(out)


def extract_json(raw: str):
    raw = raw.strip()

    if "```" in raw:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        if match:
            raw = match.group(1).strip()

    for attempt in [raw, _clean_json_string(raw)]:
        try:
            return json.loads(attempt)
        except json.JSONDecodeError:
            pass

    cleaned = _clean_json_string(raw)
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        start = cleaned.find(start_char)
        end = cleaned.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                continue

    raise ValueError(f"Could not extract JSON from LLM response: {raw[:200]}")


# ── Profile → text ──

def profile_to_text(profile: dict) -> str:
    lines = []
    if profile.get("name"):
        lines.append(f"Name: {profile['name']}")
    if profile.get("headline"):
        lines.append(f"Headline: {profile['headline']}")
    if profile.get("current_role"):
        lines.append(f"Current role: {profile['current_role']}")
    if profile.get("current_company"):
        lines.append(f"Company: {profile['current_company']}")
    if profile.get("location"):
        lines.append(f"Location: {profile['location']}")
    if profile.get("about"):
        lines.append(f"About: {profile['about'][:500]}")
    if profile.get("experience"):
        lines.append(f"Experience: {'; '.join(profile['experience'][:3])}")
    return "\n".join(lines)


# ═══════════════════════════════════════════
# INSIGHT PROMPTS — per role
# ═══════════════════════════════════════════

_INSIGHT_BASE_RULES = """Rules:
- Never invent company events, funding, hiring, revenue, or personal interests
- Never infer facts that are not supported by the input
- Keep text concise and concrete

Return ONLY valid JSON as an array of objects:
[
  {
    "type": "one of the types listed above",
    "text": "short concrete insight",
    "relevance": "short reason this matters"
  }
]
"""

INSIGHT_SYSTEMS = {
    "sales": f"""You are a sales research assistant.

Read a LinkedIn profile and produce 3-5 HIGH-VALUE outreach insights for a salesperson.

A high-value insight suggests a reason to sell to this person RIGHT NOW.

Look for:
- Role changes (new role = new priorities, new budget)
- Stated priorities or interests in their About section
- Company growth signals from their experience trajectory
- Expertise that maps to specific product needs
- Patterns across their career that suggest pain points

Insight types: career_move, shared_interest, pain_signal, content_signal, expertise_signal

GOOD: "Recently stepped into Head of Sales role — likely revisiting tooling and process"
BAD: "Works in sales" / "Has experience" / "Seems impressive"

{_INSIGHT_BASE_RULES}""",

    "recruiter": f"""You are a recruiting research assistant.

Read a LinkedIn profile and produce 3-5 HIGH-VALUE insights for a recruiter evaluating this person as a potential candidate.

A high-value insight helps a recruiter craft a compelling outreach about a job opportunity.

Look for:
- Career trajectory and growth pattern (promotions, lateral moves, industry switches)
- Skills and specializations mentioned in headline/about/experience
- Signals of openness to new opportunities (recent role change, short tenure, "open to" in headline)
- Gaps between current role and potential next step
- Unique combination of experiences that makes them valuable

Insight types: career_trajectory, skill_signal, openness_signal, growth_pattern, unique_background

GOOD: "Moved from IC to management at Google, then back to IC at a startup — values hands-on work over titles"
BAD: "Has 5 years of experience" / "Works at a good company"

{_INSIGHT_BASE_RULES}""",

    "founder": f"""You are a business development research assistant.

Read a LinkedIn profile and produce 3-5 HIGH-VALUE insights for a startup founder looking to build a relationship.

A high-value insight suggests why this person would be a good connection — for partnerships, advice, investment, or early adoption.

Look for:
- Shared problem space or industry overlap
- Decision-making authority (VP+, Head of, Director)
- Experience building or scaling something relevant
- Stated interests that align with the founder's domain
- Network position (well-connected in a specific niche)

Insight types: shared_interest, authority_signal, domain_expertise, network_signal, partnership_potential

GOOD: "Led infrastructure scaling at Stripe — understands the exact pain point we're solving"
BAD: "Works at a big company" / "Has leadership experience"

{_INSIGHT_BASE_RULES}""",
}


def generate_insights(profile: dict, role: str = "sales") -> list[dict]:
    text = profile_to_text(profile)
    system = INSIGHT_SYSTEMS.get(role, INSIGHT_SYSTEMS["sales"])

    response = client.messages.create(
        model=MODEL,
        max_tokens=1200,
        system=system,
        messages=[
            {
                "role": "user",
                "content": f"Analyze this LinkedIn profile and return insights as a JSON array:\n\n{text}",
            }
        ],
    )

    raw = response.content[0].text.strip()
    return extract_json(raw)


# ═══════════════════════════════════════════
# GENERATE PROMPTS — per role
# ═══════════════════════════════════════════

_COMMON = f"""=== LENGTH — THIS IS THE MOST IMPORTANT RULE ===

Each message MUST be 2-4 sentences. MAX 50 words. One paragraph.
If your message is longer than 50 words, you have FAILED.

Write like a real person DMs on LinkedIn:
- Short sentences. Fragments OK.
- No filler words or smooth transitions
- Start with something specific to THEM, end with a question
- Sound like you spent 30 seconds writing this

NEVER use: {BANNED_BLOCK}
NEVER start two sentences the same way.
NEVER use "I" more than once per message.
NEVER write anything that sounds like marketing copy.

Use ONLY facts from the profile. Never invent anything.
message_2 must use a DIFFERENT angle than message_1.

Output ONLY valid JSON:
{{"angle":"2-5 words","reason":"one sentence","goal_applied":"one sentence","message_1":"...","message_2":"..."}}
"""

GENERATE_SYSTEMS = {
    "sales": f"""Short, sharp LinkedIn DMs for sales. Sound human, not like AI.

Pick the best angle → apply goal → write 2 DMs.

GOALS:
- book_demo: end with specific next step ("15 min this week?"). GOOD: "We do X for teams like yours. Worth 15 min?" BAD: "What are your thoughts?"
- start_conversation: NO call/meeting language (FORBIDDEN: call, chat, demo, meet, schedule, book, 15 min). End with curious question. GOOD: "Curious what's changing on the tooling side?" BAD: "Open to a quick call?"

SENDER CONTEXT: if provided, mention naturally in one sentence. Don't over-explain.

BAD (too long): "Sarah, six months into the Head of Sales seat at Datadog — that's usually when the real changes start. At TestForge, we're working with sales-led SaaS teams who realized their demo environments kept breaking. We built AI-powered test automation. Would a 15-min call make sense?"
GOOD (short, human): "Sarah — new Head of Sales at Datadog? We help sales teams keep demos from breaking mid-call. Worth 15 min?"

{_COMMON}""",

    "recruiter": f"""Short, personal LinkedIn DMs for recruiters. Not mass InMail.

Pick the best angle → apply goal → write 2 DMs.

GOALS:
- pitch_role: mention role + why THEY fit. GOOD: "Building something similar at Coinbase — open to hearing more?" BAD: "I have an exciting opportunity"
- start_conversation: NO role details or job descriptions. Just explore interest. GOOD: "What's keeping you engaged right now?" BAD: "We have a great position"

SENDER CONTEXT: mention company + what makes role interesting in one sentence. Focus on what's in it for THEM.

BAD (too long): "Your trajectory from Google Cloud infra to building Stripe's distributed payment systems is exactly what we're looking for in a Staff Backend Engineer at Coinbase. We're rebuilding our core custody infrastructure to handle crypto at institutional scale."
GOOD (short, human): "Your move from Google Cloud to Stripe payments caught my eye. Hiring Staff Backend at Coinbase — similar problems, but you'd own the architecture. Open to hearing more?"

{_COMMON}""",

    "founder": f"""Short, direct LinkedIn DMs as a founder. Peer-to-peer, no corporate tone.

Pick the best angle → apply goal → write 2 DMs.

GOALS:
- book_meeting: be direct, founders respect it. GOOD: "Got 15 min to compare notes?" BAD: "What are your thoughts?"
- start_conversation: NO meeting language (FORBIDDEN: call, chat, demo, meet, schedule, book). Ask about their work. GOOD: "What's been hardest about scaling that?" BAD: "Would love to hop on a call"

SENDER CONTEXT: mention what you're building in one sentence. Shared problem, not pitch.

BAD (too formal): "Saw you led the billing migration at Stripe — we're solving a similar problem for mid-market SaaS and your experience is exactly the perspective I need. Would you be open to a brief conversation?"
GOOD (founder-to-founder): "Saw you led billing at Stripe. Building something similar for mid-market — your take would be super useful. Got 15 min?"

{_COMMON}""",
}

GOAL_CONTEXTS = {
    "sales": {
        "book_demo": "GOAL: book_demo. End with a specific next step. Be direct but friendly.",
        "start_conversation": "GOAL: start_conversation. NO call/demo/meeting language. End with a curious question.",
    },
    "recruiter": {
        "pitch_role": "GOAL: pitch_role. Present the role, explain why they fit, suggest a conversation.",
        "start_conversation": "GOAL: start_conversation. NO role details. Explore their career interests.",
    },
    "founder": {
        "book_meeting": "GOAL: book_meeting. Be direct, suggest a short call.",
        "start_conversation": "GOAL: start_conversation. NO meeting language. Ask about their work.",
    },
}


def generate_messages(
    profile: dict,
    selected_insights: list[dict],
    goal: str,
    sender_profile: str,
    role: str = "sales",
) -> dict:
    text = profile_to_text(profile)

    insights_text = "\n".join(
        f"- [{i['type']}] {i['text']} | {i['relevance']}"
        for i in selected_insights
    )

    role_goals = GOAL_CONTEXTS.get(role, GOAL_CONTEXTS["sales"])
    goal_text = role_goals.get(goal, list(role_goals.values())[1])

    system = GENERATE_SYSTEMS.get(role, GENERATE_SYSTEMS["sales"])

    user_msg = f"""PROFILE
{text}

INSIGHTS
{insights_text}

SENDER
{sender_profile or "Not provided. Keep it general."}

{goal_text}

Remember: MAX 50 words per message. 2-4 sentences. Sound human. Return JSON only."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = response.content[0].text.strip()
    return extract_json(raw)
```

### backend/analytics.py

```python
"""Simple file-based analytics. Logs each API call with timestamp."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

LOG_FILE = Path(os.getenv("ANALYTICS_LOG", "analytics.jsonl"))


def log_event(event: str, data: dict):
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **data,
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


def get_stats() -> dict:
    if not LOG_FILE.exists():
        return {"total_insights": 0, "total_generates": 0, "events": []}

    insights = 0
    generates = 0
    profiles = set()
    roles = {}
    goals = {}
    recent = []

    for line in LOG_FILE.read_text().splitlines():
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue

        if e["event"] == "insights":
            insights += 1
        elif e["event"] == "generate":
            generates += 1

        name = e.get("profile", "")
        if name:
            profiles.add(name)

        role = e.get("role", "")
        if role:
            roles[role] = roles.get(role, 0) + 1

        goal = e.get("goal", "")
        if goal:
            goals[goal] = goals.get(goal, 0) + 1

        recent.append(e)

    return {
        "total_insights": insights,
        "total_generates": generates,
        "unique_profiles": len(profiles),
        "by_role": roles,
        "by_goal": goals,
        "recent_10": recent[-10:],
    }
```

### backend/routes/insights.py

```python
from fastapi import APIRouter, HTTPException

from analytics import log_event
from llm import generate_insights
from schemas import InsightRequest, InsightResponse, Insight

router = APIRouter()


@router.post("/api/insights", response_model=InsightResponse)
async def get_insights(req: InsightRequest):
    if not req.profile.name:
        raise HTTPException(400, "Profile name is required")

    try:
        raw_insights = generate_insights(req.profile.model_dump(), role=req.role)
        insights = [Insight(**i) for i in raw_insights]

        log_event("insights", {
            "profile": req.profile.name,
            "role": req.role,
            "insights_count": len(insights),
        })

        return InsightResponse(insights=insights)
    except Exception as e:
        raise HTTPException(502, f"LLM error: {str(e)}")
```

### backend/routes/generate.py

```python
from fastapi import APIRouter, HTTPException

from analytics import log_event
from llm import generate_messages
from schemas import GenerateRequest, GenerateResponse

router = APIRouter()


@router.post("/api/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    if not req.profile.name:
        raise HTTPException(400, "Profile name is required")
    if not req.selected_insights:
        raise HTTPException(400, "Select at least one insight")

    try:
        result = generate_messages(
            profile=req.profile.model_dump(),
            selected_insights=[i.model_dump() for i in req.selected_insights],
            goal=req.goal,
            sender_profile=req.sender_profile,
            role=req.role,
        )

        log_event("generate", {
            "profile": req.profile.name,
            "role": req.role,
            "goal": req.goal,
        })

        return GenerateResponse(
            angle=result.get("angle", ""),
            reason=result.get("reason", ""),
            goal_applied=result.get("goal_applied", ""),
            message_1=result["message_1"],
            message_2=result["message_2"],
        )
    except Exception as e:
        raise HTTPException(502, f"LLM error: {str(e)}")
```

### backend/requirements.txt

```
fastapi==0.115.6
uvicorn==0.34.0
anthropic==0.42.0
pydantic==2.10.4
python-dotenv==1.0.1
```

### backend/Procfile

```
web: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### backend/.env.example

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
LLM_MODEL=claude-sonnet-4-5-20250929
```

### extension/manifest.json

```json
{
  "manifest_version": 3,
  "name": "FirstLine — AI Outreach Copilot",
  "version": "0.1.0",
  "description": "Find the right reason to reach out. Generate personalized LinkedIn outreach that actually feels personal.",
  "permissions": ["activeTab", "scripting", "sidePanel", "storage"],
  "host_permissions": ["https://www.linkedin.com/*"],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["content_script.js"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### extension/content_script.js

```javascript
/**
 * LinkedIn Profile Parser — modular, section-based, with fallback selectors.
 */

// ── Selector helpers ──

function getFirst(...selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    const text = el?.innerText?.trim();
    if (text) return text;
  }
  return "";
}

function queryFirst(...selectors) {
  for (const s of selectors) {
    const els = document.querySelectorAll(s);
    if (els.length > 0) return els;
  }
  return [];
}

// ── Section parsers ──

function parseName() {
  return getFirst(
    "h1.text-heading-xlarge",
    "h1.inline.t-24",
    ".pv-top-card--list h1",
    ".ph5 h1",
    // Last resort: any h1 inside main content
    "main h1",
    "h1"
  );
}

function parseHeadline() {
  return getFirst(
    ".text-body-medium.break-words",
    ".pv-top-card--list .text-body-medium",
    ".ph5 .text-body-medium",
    "[data-generated-suggestion-target] .text-body-medium"
  );
}

function parseLocation() {
  return getFirst(
    ".text-body-small.inline.t-black--light.break-words",
    ".pv-top-card--list .text-body-small",
    ".ph5 span.text-body-small"
  );
}

function parseAbout() {
  // Try multiple strategies for the About section
  const text = getFirst(
    "#about ~ div .inline-show-more-text",
    "#about ~ div span[aria-hidden='true']",
    "#about + div + div span.visually-hidden",
    "#about ~ div .pv-shared-text-with-see-more span[aria-hidden]"
  );

  // Fallback: find section by heading text
  if (!text) {
    const headings = document.querySelectorAll("section h2 span, section h2");
    for (const h of headings) {
      const t = h.innerText?.trim()?.toLowerCase();
      if (t === "about" || t === "о себе" || t === "info") {
        const section = h.closest("section");
        if (section) {
          const span = section.querySelector(
            ".inline-show-more-text, span[aria-hidden='true'], .pv-shared-text-with-see-more span"
          );
          if (span) return span.innerText.trim();
        }
      }
    }
  }

  return text;
}

function parseExperience() {
  const items = queryFirst(
    "#experience ~ div .pvs-list__outer-container li.artdeco-list__item",
    "#experience ~ div ul li.artdeco-list__item",
    "section[id='experience'] li"
  );

  // Fallback: find experience section by heading text
  let expItems = Array.from(items);
  if (expItems.length === 0) {
    const headings = document.querySelectorAll("section h2 span, section h2");
    for (const h of headings) {
      const t = h.innerText?.trim()?.toLowerCase();
      if (t === "experience" || t === "опыт работы" || t === "опыт") {
        const section = h.closest("section");
        if (section) {
          expItems = Array.from(section.querySelectorAll("li"));
          break;
        }
      }
    }
  }

  return expItems
    .slice(0, 3)
    .map((li) => {
      const title =
        li.querySelector(".t-bold .visually-hidden")?.innerText?.trim() ||
        li.querySelector(".t-bold span[aria-hidden]")?.innerText?.trim() ||
        li.querySelector(".t-bold")?.innerText?.trim() ||
        "";
      const company =
        li.querySelector(".t-normal .visually-hidden")?.innerText?.trim() ||
        li.querySelector(".t-normal span[aria-hidden]")?.innerText?.trim() ||
        li.querySelector(".t-14.t-normal")?.innerText?.trim() ||
        "";
      return [title, company].filter(Boolean).join(" @ ");
    })
    .filter(Boolean);
}

function deriveCompanyAndRole(headline, experience) {
  const company =
    experience[0]?.split(" @ ")[1] ||
    headline.split(" at ").slice(1).join(" at ") ||
    headline.split(" @ ").slice(1).join(" @ ") ||
    "";

  const currentRole =
    experience[0]?.split(" @ ")[0] ||
    headline.split(" at ")[0]?.trim() ||
    headline.split(" @ ")[0]?.trim() ||
    "";

  return { company, currentRole };
}

// ── Main extraction ──

function extractLinkedInProfile() {
  const name = parseName();
  const headline = parseHeadline();
  const location = parseLocation();
  const about = parseAbout();
  const experience = parseExperience();
  const { company, currentRole } = deriveCompanyAndRole(headline, experience);

  return {
    name,
    headline,
    current_role: currentRole,
    current_company: company,
    location,
    about: (about || "").slice(0, 1000),
    experience,
    profile_url: window.location.href,
  };
}

// ── Wait for h1 to appear, then extract ──

function waitForProfile(timeoutMs = 15000) {
  return new Promise((resolve) => {
    // Try immediately first
    const profile = extractLinkedInProfile();
    if (profile.name) {
      resolve(profile);
      return;
    }

    // Watch DOM for h1 to appear
    let resolved = false;

    const done = () => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      clearTimeout(timeout);
      // Small delay after h1 appears — let LinkedIn finish rendering nearby elements
      setTimeout(() => resolve(extractLinkedInProfile()), 300);
    };

    const observer = new MutationObserver(() => {
      // Check if any h1 now has text content
      const h1 = document.querySelector("h1");
      if (h1 && h1.innerText.trim()) {
        done();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Timeout fallback — return whatever we have
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        resolve(extractLinkedInProfile());
      }
    }, timeoutMs);
  });
}

// ── Message listener ──

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "extractProfile") {
    waitForProfile().then(sendResponse);
    return true;
  }
  return true;
});

// ── Floating button ──

function injectFloatingButton() {
  if (document.getElementById("firstline-fab")) return;

  const btn = document.createElement("button");
  btn.id = "firstline-fab";
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>FirstLine</span>`;

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "9999",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
    transition: "all 0.2s ease",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "translateY(-2px)";
    btn.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.5)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = "0 4px 14px rgba(79, 70, 229, 0.4)";
  });

  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openSidePanel" });
  });

  document.body.appendChild(btn);
}

// ── Button management via polling ──
// Show button on profile pages, hide on other pages.

setInterval(() => {
  const onProfile = window.location.pathname.startsWith("/in/");
  const btnExists = document.getElementById("firstline-fab");

  if (onProfile && !btnExists) {
    injectFloatingButton();
  } else if (!onProfile && btnExists) {
    btnExists.remove();
  }
}, 500);
```

### extension/background.js

```javascript
const API_BASE = "https://firstline-bpg9.onrender.com";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "openSidePanel") {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === "apiCall") {
    fetch(`${API_BASE}${msg.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.detail || err.message || String(err) }));
    return true;
  }

  if (msg.action === "saveSenderProfile") {
    chrome.storage.sync.set({ senderProfile: msg.value });
    sendResponse({ ok: true });
  }

  if (msg.action === "saveRole") {
    chrome.storage.sync.set({ role: msg.value });
    sendResponse({ ok: true });
  }

  if (msg.action === "loadSettings") {
    chrome.storage.sync.get(["senderProfile", "role"], (d) => {
      sendResponse({
        senderProfile: d.senderProfile || "",
        role: d.role || "sales",
      });
    });
    return true;
  }
});
```

### extension/sidepanel.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="header">
    <h1>FirstLine</h1>
    <p>AI Outreach Copilot</p>
  </div>

  <div class="container">
    <!-- Step 0: Role + Sender profile -->
    <section id="senderSection" class="section">
      <label class="label">I am a</label>
      <div class="role-selector" id="roleSelector">
        <button class="role-btn active" data-role="sales">Sales / SDR</button>
        <button class="role-btn" data-role="recruiter">Recruiter</button>
        <button class="role-btn" data-role="founder">Founder</button>
      </div>

      <label class="label" style="margin-top: 10px;" id="senderLabel">About you / your product</label>
      <textarea id="senderProfile" rows="3" placeholder="e.g. I sell an AI-powered QA tool that saves engineering teams 10+ hours/week"></textarea>
      <button id="saveSenderBtn" class="btn btn-sm">Save</button>
    </section>

    <!-- Step 1: Analyze -->
    <section class="section">
      <button id="analyzeBtn" class="btn btn-primary btn-full">Analyze Profile</button>
      <div id="profileInfo" class="profile-info hidden"></div>
      <div id="status" class="status"></div>
    </section>

    <!-- Step 2: Insights -->
    <section id="insightsSection" class="section hidden">
      <label class="label">Insights — select what to use</label>
      <div id="insightsList" class="insights-list"></div>
    </section>

    <!-- Step 3: Goal + Generate -->
    <section id="generateSection" class="section hidden">
      <label class="label">Outreach goal</label>
      <select id="goalSelect"></select>
      <button id="generateBtn" class="btn btn-primary btn-full" style="margin-top: 12px;">Generate Messages</button>
    </section>

    <!-- Step 4: Results -->
    <section id="resultsSection" class="section hidden">
      <div id="approachCard" class="approach-card hidden">
        <div class="approach-main">
          <span class="approach-label">Approach:</span>
          <span id="approachAngle"></span>
        </div>
        <div id="approachSub" class="approach-sub"></div>
      </div>
      <div class="tabs">
        <button class="tab active" data-tab="msg1">Initial</button>
        <button class="tab" data-tab="msg2">Follow-up</button>
      </div>

      <div id="msg1" class="tab-content active">
        <textarea id="message1" rows="8" readonly></textarea>
        <button class="btn btn-copy" data-target="message1">Copy</button>
      </div>

      <div id="msg2" class="tab-content">
        <textarea id="message2" rows="8" readonly></textarea>
        <button class="btn btn-copy" data-target="message2">Copy</button>
      </div>

      <button id="resetBtn" class="btn btn-sm" style="margin-top: 12px;">New Profile</button>
    </section>

    <!-- Feedback -->
    <div class="feedback-link">
      <a href="https://firstline.to#feedback" target="_blank" id="feedbackBtn">Send Feedback</a>
    </div>
  </div>

  <script src="sidepanel.js"></script>
</body>
</html>
```

### extension/sidepanel.js

```javascript
// ── State ──
let profile = null;
let insights = [];
let currentRole = "sales";

// ── Role config ──
const ROLE_CONFIG = {
  sales: {
    senderLabel: "About you / your product",
    senderPlaceholder: "e.g. I sell an AI-powered QA tool that saves engineering teams 10+ hours/week",
    goals: [
      { value: "book_demo", label: "Book a Demo / Meeting" },
      { value: "start_conversation", label: "Start a Conversation" },
    ],
  },
  recruiter: {
    senderLabel: "About the role / company",
    senderPlaceholder: "e.g. Hiring a Senior Backend Engineer at Acme Corp. Remote, $180-220k, building real-time data pipeline",
    goals: [
      { value: "pitch_role", label: "Pitch a Role" },
      { value: "start_conversation", label: "Start a Conversation" },
    ],
  },
  founder: {
    senderLabel: "About your startup",
    senderPlaceholder: "e.g. I'm building an AI tool for sales teams. Looking for design partners and early adopters in B2B SaaS",
    goals: [
      { value: "book_meeting", label: "Book a Meeting" },
      { value: "start_conversation", label: "Start a Conversation" },
    ],
  },
};

// ── DOM refs ──
const $ = (id) => document.getElementById(id);

const senderProfile = $("senderProfile");
const senderLabel = $("senderLabel");
const saveSenderBtn = $("saveSenderBtn");
const analyzeBtn = $("analyzeBtn");
const profileInfo = $("profileInfo");
const status = $("status");
const insightsSection = $("insightsSection");
const insightsList = $("insightsList");
const generateSection = $("generateSection");
const goalSelect = $("goalSelect");
const generateBtn = $("generateBtn");
const resultsSection = $("resultsSection");
const message1 = $("message1");
const message2 = $("message2");
const resetBtn = $("resetBtn");

// ── Helpers ──

function setStatus(text, isError = false) {
  status.textContent = text;
  status.className = isError ? "status error" : "status";
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

async function apiCall(endpoint, body) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "apiCall", endpoint, body },
      (res) => {
        if (res?.ok) resolve(res.data);
        else reject(new Error(res?.error || "API call failed"));
      }
    );
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ── Role Selector ──

function setRole(role) {
  currentRole = role;
  const config = ROLE_CONFIG[role];

  // Update active button
  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.role === role);
  });

  // Update sender label and placeholder
  senderLabel.textContent = config.senderLabel;
  senderProfile.placeholder = config.senderPlaceholder;

  // Update goal options
  goalSelect.innerHTML = "";
  config.goals.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.value;
    opt.textContent = g.label;
    goalSelect.appendChild(opt);
  });

  // Save role
  chrome.runtime.sendMessage({ action: "saveRole", value: role });
}

document.querySelectorAll(".role-btn").forEach((btn) => {
  btn.addEventListener("click", () => setRole(btn.dataset.role));
});

// ── Load saved settings ──

chrome.runtime.sendMessage({ action: "loadSettings" }, (res) => {
  if (res?.role) setRole(res.role);
  else setRole("sales");
  if (res?.senderProfile) senderProfile.value = res.senderProfile;
});

// ── Save sender profile ──

saveSenderBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "saveSenderProfile", value: senderProfile.value });
  saveSenderBtn.textContent = "Saved!";
  setTimeout(() => (saveSenderBtn.textContent = "Save"), 1500);
});

// ── Step 1: Analyze Profile ──

analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.disabled = true;
  setStatus("Reading profile...");

  try {
    const tab = await getActiveTab();

    if (!tab?.url?.includes("linkedin.com/in/")) {
      setStatus("Open a LinkedIn profile first", true);
      analyzeBtn.disabled = false;
      return;
    }

    // Try to extract profile from content script
    try {
      profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
    } catch {
      // Content script not loaded — inject programmatically
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content_script.js"],
      });
      await new Promise((r) => setTimeout(r, 300));
      profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
    }

    // If name not found (SPA navigation from feed) — reload page and retry once
    if (!profile?.name) {
      setStatus("Refreshing page...");
      await chrome.tabs.reload(tab.id);

      // Wait for page to load
      await new Promise((resolve) => {
        const onUpdated = (tabId, info) => {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
        // Safety timeout
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }, 10000);
      });

      // Wait a bit more for LinkedIn to render content
      await new Promise((r) => setTimeout(r, 1000));

      try {
        profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content_script.js"],
        });
        await new Promise((r) => setTimeout(r, 500));
        profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
      }
    }

    if (!profile?.name) {
      setStatus("Could not read profile. Scroll down and retry.", true);
      analyzeBtn.disabled = false;
      return;
    }

    profileInfo.innerHTML = `
      <div class="name">${profile.name}</div>
      <div class="headline">${profile.headline || profile.current_role}</div>
    `;
    show(profileInfo);

    setStatus("Finding insights...");
    const res = await apiCall("/api/insights", { profile, role: currentRole });
    insights = res.insights;

    renderInsights(insights);
    show(insightsSection);
    show(generateSection);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }

  analyzeBtn.disabled = false;
});

// ── Step 2: Render Insights ──

function renderInsights(items) {
  insightsList.innerHTML = "";

  items.forEach((insight, i) => {
    const div = document.createElement("div");
    div.className = "insight-item selected";
    div.innerHTML = `
      <input type="checkbox" checked data-index="${i}" />
      <div>
        <div class="insight-text">${insight.text}</div>
        <div class="insight-type">${insight.type.replace(/_/g, " ")}</div>
      </div>
    `;

    const checkbox = div.querySelector("input");
    div.addEventListener("click", (e) => {
      if (e.target === checkbox) return;
      checkbox.checked = !checkbox.checked;
      div.classList.toggle("selected", checkbox.checked);
    });
    checkbox.addEventListener("change", () => {
      div.classList.toggle("selected", checkbox.checked);
    });

    insightsList.appendChild(div);
  });
}

function getSelectedInsights() {
  const checkboxes = insightsList.querySelectorAll("input[type='checkbox']");
  return Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => insights[parseInt(cb.dataset.index)]);
}

// ── Step 3: Generate Messages ──

generateBtn.addEventListener("click", async () => {
  const selected = getSelectedInsights();

  if (selected.length === 0) {
    setStatus("Select at least one insight", true);
    return;
  }

  generateBtn.disabled = true;
  setStatus("Generating messages...");

  // Auto-save
  if (senderProfile.value) {
    chrome.runtime.sendMessage({ action: "saveSenderProfile", value: senderProfile.value });
  }

  try {
    const res = await apiCall("/api/generate", {
      profile,
      selected_insights: selected,
      goal: goalSelect.value,
      sender_profile: senderProfile.value,
      role: currentRole,
    });

    // Show approach card
    const approachCard = $("approachCard");
    if (res.angle) {
      $("approachAngle").textContent = res.angle;
      const parts = [res.reason, res.goal_applied].filter(Boolean);
      $("approachSub").textContent = parts.join(" — ");
      show(approachCard);
    } else {
      hide(approachCard);
    }

    message1.value = res.message_1;
    message2.value = res.message_2;
    show(resultsSection);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }

  generateBtn.disabled = false;
});

// ── Tabs ──

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ── Copy ──

document.querySelectorAll(".btn-copy").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const textarea = document.getElementById(btn.dataset.target);
    await navigator.clipboard.writeText(textarea.value);
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
});

// ── Reset ──

resetBtn.addEventListener("click", () => {
  profile = null;
  insights = [];
  hide(profileInfo);
  hide(insightsSection);
  hide(generateSection);
  hide(resultsSection);
  hide($("approachCard"));
  insightsList.innerHTML = "";
  message1.value = "";
  message2.value = "";
  setStatus("");
});
```

### extension/styles.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f7f8fa;
  color: #1a1a2e;
  font-size: 13px;
  width: 100%;
}

/* Header */
.header {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  padding: 14px 16px;
}
.header h1 { font-size: 16px; font-weight: 700; }
.header p  { font-size: 11px; opacity: 0.8; margin-top: 1px; }

.container { padding: 12px 14px; }

.section { margin-bottom: 12px; }

/* Role selector */
.role-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}
.role-btn {
  flex: 1;
  padding: 7px 4px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.role-btn:hover { border-color: #4f46e5; color: #4f46e5; }
.role-btn.active {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
}

.label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 5px;
}

textarea, select, input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  transition: border-color 0.15s;
}
textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #4338ca; }
.btn-full { width: 100%; }
.btn-sm { padding: 5px 10px; font-size: 11px; margin-top: 4px; background: #eaeaef; color: #444; border-radius: 5px; }
.btn-sm:hover { background: #dddde5; }
.btn-copy { background: #4f46e5; color: #fff; margin-top: 6px; width: 100%; }
.btn-copy:hover { background: #4338ca; }

/* Profile info */
.profile-info {
  margin-top: 8px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e8e8ef;
}
.profile-info .name { font-weight: 700; font-size: 13px; }
.profile-info .headline { color: #666; font-size: 11px; margin-top: 1px; }

/* Insights */
.insights-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.insight-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e0e0e8;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.insight-item:hover { border-color: #4f46e5; }
.insight-item.selected { border-color: #4f46e5; background: #f5f4ff; }

.insight-item input[type="checkbox"] {
  width: 15px;
  height: 15px;
  min-width: 15px;
  margin-top: 1px;
  accent-color: #4f46e5;
  cursor: pointer;
}

.insight-text { font-size: 12px; line-height: 1.35; }
.insight-type {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: #4f46e5;
  margin-top: 2px;
  letter-spacing: 0.3px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 0;
  border-bottom: 1px solid #ddd;
}
.tab {
  flex: 1;
  padding: 7px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  font-family: inherit;
  color: #888;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.tab.active { color: #4f46e5; border-bottom-color: #4f46e5; }
.tab:hover { color: #4f46e5; }
.tab-content { display: none; padding-top: 8px; }
.tab-content.active { display: block; }

/* Status */
.status {
  text-align: center;
  margin-top: 6px;
  font-size: 11px;
  color: #888;
  min-height: 16px;
}
.status.error { color: #dc2626; }

/* Approach card */
.approach-card {
  padding: 6px 10px;
  background: #f8f7ff;
  border-left: 3px solid #4f46e5;
  border-radius: 0 6px 6px 0;
  margin-bottom: 10px;
}
.approach-main {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 3px;
}
.approach-main .approach-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #4f46e5;
  margin-right: 4px;
}
.approach-sub {
  font-size: 11px;
  color: #666;
  line-height: 1.35;
}

/* Feedback link */
.feedback-link {
  text-align: center;
  padding: 12px 0 4px;
  border-top: 1px solid #e8e8ef;
  margin-top: 8px;
}
.feedback-link a {
  font-size: 11px;
  color: #888;
  text-decoration: none;
}
.feedback-link a:hover {
  color: #4f46e5;
}

.hidden { display: none !important; }
```

### netlify.toml

```toml
[build]
  base = "landing"
  publish = "."
  command = ""
```

### .gitignore

```
__pycache__/
*.pyc
.env
venv/
node_modules/
.DS_Store
analytics.jsonl
```

---

## Known Issues & Fixes

1. **LinkedIn DOM selectors** — LinkedIn frequently changes CSS classes. Parser uses multiple fallback selectors + heading-text detection. May need updating.
2. **LLM JSON parsing** — Claude sometimes returns JSON with raw control characters. Fixed with `_clean_json_string()`.
3. **Model availability** — Set `LLM_MODEL` in `.env`. List available models via `GET https://api.anthropic.com/v1/models`.

---

## Landing Page

`landing/index.html` — self-contained single HTML file.

Sections: Hero, Product Preview, Problem, How it Works, Benefits, Differentiator, Trust, CTA, FAQ, Footer.

Privacy policy page at `landing/privacy.html`.

Feedback form on landing page via FormSubmit (accessible from extension via "Send Feedback" link).

---

## Icon

Chat bubble with direction arrow on gradient background (#4f46e5 → #7c3aed). SVG source: `icons/icon.svg`. PNGs: 16, 48, 128.

---

## Next Steps

See `ROADMAP.md` for detailed phased plan covering deploy, auth, billing, launch, and iteration.
