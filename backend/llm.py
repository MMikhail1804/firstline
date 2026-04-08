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
