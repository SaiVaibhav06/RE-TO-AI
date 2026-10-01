import json
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import current_user, router as auth_router
from database import connect, get_models, get_policies, init_db, replace_models, set_policies
from router_logic import ModelKeyMissingError, route

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


class ChatCreate(BaseModel):
    title: str = "New chat"


class ChatPrompt(BaseModel):
    prompt: str


def get_owned_chat(chat_id: int, user_id: int):
    with connect() as db:
        return db.execute(
            "SELECT * FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, user_id),
        ).fetchone()


app = FastAPI(title="Smart LLM Router API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.post("/api/route")
async def route_prompt(request: RouteRequest):
    try:
        return await route(request.prompt, request.user_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except ModelKeyMissingError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.get("/api/chats")
def list_chats(user=Depends(current_user)):
    with connect() as db:
        rows = db.execute(
            """
            SELECT chats.id, chats.title, chats.created_at, chats.updated_at,
                   COUNT(chat_messages.id) AS message_count
            FROM chats
            LEFT JOIN chat_messages ON chat_messages.chat_id = chats.id
            WHERE chats.user_id = ?
            GROUP BY chats.id
            ORDER BY chats.updated_at DESC, chats.id DESC
            """,
            (user["id"],),
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/chats")
def create_chat(payload: ChatCreate, user=Depends(current_user)):
    title = " ".join(payload.title.split())[:80] or "New chat"
    with connect() as db:
        cursor = db.execute(
            "INSERT INTO chats (user_id, title) VALUES (?, ?)",
            (user["id"], title),
        )
        row = db.execute("SELECT * FROM chats WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: int, user=Depends(current_user)):
    chat = get_owned_chat(chat_id, user["id"])
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    with connect() as db:
        rows = db.execute(
            "SELECT id, role, content, metadata, created_at FROM chat_messages WHERE chat_id = ? ORDER BY id",
            (chat_id,),
        ).fetchall()
    messages = []
    for row in rows:
        message = dict(row)
        message["metadata"] = json.loads(message["metadata"]) if message["metadata"] else None
        messages.append(message)
    return {"chat": dict(chat), "messages": messages}


@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: int, user=Depends(current_user)):
    with connect() as db:
        cursor = db.execute(
            "DELETE FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, user["id"]),
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"ok": True}


@app.post("/api/chats/{chat_id}/messages")
async def send_chat_message(chat_id: int, payload: ChatPrompt, user=Depends(current_user)):
    chat = get_owned_chat(chat_id, user["id"])
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="Prompt cannot be empty")
    if len(prompt) > 4000:
        raise HTTPException(status_code=422, detail="Prompt must be 4000 characters or fewer")

    try:
        result = await route(prompt, str(user["id"]))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except ModelKeyMissingError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    with connect() as db:
        has_prior_messages = db.execute(
            "SELECT 1 FROM chat_messages WHERE chat_id = ? LIMIT 1",
            (chat_id,),
        ).fetchone()
        title = chat["title"]
        if not has_prior_messages:
            title = " ".join(prompt.split())[:80]
        db.execute(
            "INSERT INTO chat_messages (chat_id, role, content) VALUES (?, 'user', ?)",
            (chat_id, prompt),
        )
        db.execute(
            "INSERT INTO chat_messages (chat_id, role, content, metadata) VALUES (?, 'assistant', ?, ?)",
            (chat_id, result["answer"], json.dumps(result)),
        )
        db.execute(
            "UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (title, chat_id, user["id"]),
        )
        messages = db.execute(
            "SELECT id, role, content, metadata, created_at FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT 2",
            (chat_id,),
        ).fetchall()
    response_messages = []
    for row in reversed(messages):
        message = dict(row)
        message["metadata"] = json.loads(message["metadata"]) if message["metadata"] else None
        response_messages.append(message)
    return {"chat_title": title, "messages": response_messages}


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
