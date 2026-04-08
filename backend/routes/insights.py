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
