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
