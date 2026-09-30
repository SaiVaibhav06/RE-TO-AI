from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import connect, get_models, get_policies, init_db, replace_models, set_policies
from .router_logic import route

Tier = Literal["small", "mid", "premium", "private", "tool"]


class RouteRequest(BaseModel):
    prompt: str
    user_id: str = "demo-user"


class ModelConfig(BaseModel):
    id: int
    name: str
    tier: Tier
    cost_per_1k_tokens: float
    region: str
    allowed_sensitive: bool
    enabled: bool


class PolicyConfig(BaseModel):
    pii_private_only: bool
    daily_budget_usd: float
    max_input_tokens: int
    rate_limit_per_minute: int


app = FastAPI(title="Smart LLM Router API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.post("/api/route")
async def route_prompt(request: RouteRequest):
    try:
        return await route(request.prompt, request.user_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/models")
def models():
    return get_models()


@app.put("/api/models")
def update_models(models_in: list[ModelConfig]):
    return replace_models([model.model_dump() for model in models_in])


@app.get("/api/policies")
def policies():
    return get_policies()


@app.put("/api/policies")
def update_policies(policies_in: PolicyConfig):
    return set_policies(policies_in.model_dump())


@app.get("/api/stats")
def stats():
    with connect() as db:
        total = db.execute("SELECT COUNT(*) FROM request_logs").fetchone()[0]
        aggregates = db.execute(
            """
            SELECT
              COALESCE(SUM(estimated_cost), 0) AS smart_router_cost,
              COALESCE(SUM(baseline_cost), 0) AS always_premium_cost,
              COALESCE(SUM(tokens * 0.0002 / 1000), 0) AS always_cheap_cost,
              COALESCE(AVG(escalated), 0) * 100 AS escalation_rate
            FROM request_logs
            """
        ).fetchone()
        daily = db.execute(
            """
            SELECT
              strftime('%m-%d', created_at) AS day,
              SUM(baseline_cost) AS always_premium,
              SUM(estimated_cost) AS smart_router,
              SUM(tokens * 0.0002 / 1000) AS always_cheap
            FROM request_logs
            GROUP BY day
            ORDER BY day DESC
            LIMIT 7
            """
        ).fetchall()
        traffic = db.execute(
            "SELECT tier, COUNT(*) AS value FROM request_logs GROUP BY tier"
        ).fetchall()
        last = db.execute(
            """
            SELECT
              id AS request_id, created_at, tier, chosen_model, task_type, sensitivity,
              estimated_cost, latency_ms, escalated
            FROM request_logs
            ORDER BY id DESC
            LIMIT 20
            """
        ).fetchall()

    smart = float(aggregates["smart_router_cost"])
    premium = float(aggregates["always_premium_cost"])
    percent_saved = 0 if premium == 0 else max(0, round((1 - smart / premium) * 100))
    return {
        "total_requests": total,
        "smart_router_cost": round(smart, 4),
        "always_premium_cost": round(premium, 4),
        "always_cheap_cost": round(float(aggregates["always_cheap_cost"]), 4),
        "percent_saved": percent_saved,
        "escalation_rate": round(float(aggregates["escalation_rate"]), 2),
        "daily_costs": [dict(row) for row in reversed(daily)],
        "tier_traffic": [dict(row) for row in traffic],
        "last_requests": [
            {**dict(row), "escalated": bool(row["escalated"])} for row in last
        ],
    }
