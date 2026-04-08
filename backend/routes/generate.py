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
