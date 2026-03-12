"""
Calendar Agent API — Skill-injection version.

Server-side keyword routing injects the relevant MD skill file into the
system prompt before the LLM sees it. This eliminates the extra LLM call
that the old SMK progressive-disclosure system required.
"""

import json
import os
import re
from enum import Enum
from typing import Optional

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from skill_engine import SkillEngine
from tools.calendar_tools import TOOL_REGISTRY

load_dotenv()

app = FastAPI(title="Calendar Agent API")

# ── Configuration ──────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY not set. Add it to .env file.")

anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


class AnthropicModel(str, Enum):
    claude_sonnet_old = "claude-3-5-sonnet-20241022"
    claude_sonnet_4 = "claude-sonnet-4-6"


DEFAULT_MODEL = AnthropicModel.claude_sonnet_4.value

# ── Skill Engine (replaces SMK Engine) ────────────────────────────────

skill_engine = SkillEngine(skills_dir="skills/")
BASE_PROMPT = skill_engine.build_base_prompt()

# ── Request/Response Models ───────────────────────────────────────────


class CalendarRequest(BaseModel):
    message: str
    email: Optional[str] = None
    password: Optional[str] = None
    conversation_id: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None


class CalendarResponse(BaseModel):
    response: str
    conversation_id: str
    completed: bool


# ── In-memory state ───────────────────────────────────────────────────

conversations = {}

# ── Tool Execution ────────────────────────────────────────────────────


def _arg(name: str) -> str:
    """Regex fragment matching both name='val' and 'val' (positional)."""
    return rf'(?:{name}=)?["\'](.+?)["\']'


def _opt_arg(name: str) -> str:
    """Regex for optional named arg."""
    return rf'(?:,\s*{name}=["\']([^"\']*)["\'])?'


TOOL_PATTERNS = {
    "get_current_datetime": re.compile(r'ACT:\s*get_current_datetime\(\)'),
    "login": re.compile(
        r'ACT:\s*login\('
        r'(?:(?:email=)?["\']([^"\']+)["\']\s*'
        r'(?:,\s*(?:password=)?(?:["\']([^"\']*)["\']|None)\s*)?'
        r')?'
        r'\)'
    ),
    "get_calendars": re.compile(rf'ACT:\s*get_calendars\({_arg("token")}\)'),
    "get_events": re.compile(rf'ACT:\s*get_events\({_arg("token")}\)'),
    "post_event": re.compile(
        rf'ACT:\s*post_event\({_arg("token")}\s*,\s*{_arg("calendar_id")}\s*,'
        rf'\s*{_arg("title")}\s*,\s*{_arg("start_time")}\s*,'
        rf'\s*{_arg("end_time")}\s*'
        rf'(?:\s*,\s*(?:description=)?["\']([^"\']*)["\'])?'
        rf'(?:\s*,\s*(?:reminder_minutes=)?\[([^\]]*)\])?'
        rf'\)'
    ),
    "patch_event": re.compile(
        rf'ACT:\s*patch_event\({_arg("token")}\s*,\s*{_arg("event_id")}\s*'
        rf'{_opt_arg("title")}\s*'
        rf'{_opt_arg("start_time")}\s*'
        rf'{_opt_arg("end_time")}\s*'
        rf'{_opt_arg("description")}\s*'
        rf'(?:,\s*reminder_minutes=\[([^\]]*)\])?\)'
    ),
    "delete_event": re.compile(
        rf'ACT:\s*delete_event\({_arg("token")}\s*,\s*{_arg("event_id")}\)'
    ),
    # Finance tools
    "get_accounts": re.compile(rf'ACT:\s*get_accounts\({_arg("token")}\)'),
    "get_transactions": re.compile(
        rf'ACT:\s*get_transactions\({_arg("token")}'
        rf'{_opt_arg("account_id")}'
        rf'{_opt_arg("start_date")}'
        rf'{_opt_arg("end_date")}'
        rf'{_opt_arg("transaction_type")}'
        rf'{_opt_arg("category_id")}'
        rf'\)'
    ),
    "create_transaction": re.compile(
        rf'ACT:\s*create_transaction\({_arg("token")}\s*,\s*{_arg("account_id")}\s*,'
        rf'\s*{_arg("transaction_type")}\s*,\s*{_arg("amount")}\s*,'
        rf'\s*{_arg("description")}'
        rf'{_opt_arg("date")}'
        rf'{_opt_arg("category_id")}'
        rf'{_opt_arg("notes")}'
        rf'\)'
    ),
    "create_transfer": re.compile(
        rf'ACT:\s*create_transfer\({_arg("token")}\s*,\s*{_arg("from_account_id")}\s*,'
        rf'\s*{_arg("to_account_id")}\s*,\s*{_arg("amount")}\s*,'
        rf'\s*{_arg("description")}'
        rf'{_opt_arg("date")}'
        rf'\)'
    ),
    "get_financial_dashboard": re.compile(rf'ACT:\s*get_financial_dashboard\({_arg("token")}\)'),
    "get_profit_loss": re.compile(
        rf'ACT:\s*get_profit_loss\({_arg("token")}'
        rf'{_opt_arg("account_id")}'
        rf'{_opt_arg("start_date")}'
        rf'{_opt_arg("end_date")}'
        rf'\)'
    ),
    "get_budget_status": re.compile(rf'ACT:\s*get_budget_status\({_arg("token")}\)'),
    "get_categories": re.compile(rf'ACT:\s*get_categories\({_arg("token")}\)'),
    "get_tax_summary": re.compile(
        rf'ACT:\s*get_tax_summary\({_arg("token")}'
        rf'{_opt_arg("year")}'
        rf'\)'
    ),
    "create_category": re.compile(
        rf'ACT:\s*create_category\({_arg("token")}\s*,\s*{_arg("name")}\s*,'
        rf'\s*{_arg("category_type")}'
        rf'{_opt_arg("is_tax_deductible")}'
        rf'{_opt_arg("tax_category")}'
        rf'{_opt_arg("color")}'
        rf'{_opt_arg("icon")}'
        rf'\)'
    ),
    "final_answer": re.compile(r'ACT:\s*final_answer\((?:answer=)?["\'](.+?)["\']\)', re.DOTALL),
}


def execute_tool(response_text: str, session: dict) -> tuple[str, str, bool]:
    """
    Parse ACT: line from LLM response and execute the matching tool.
    Returns (tool_name, observation, is_final).
    """
    # Check final_answer first
    match = TOOL_PATTERNS["final_answer"].search(response_text)
    if match:
        return "final_answer", match.group(1), True

    match = TOOL_PATTERNS["get_current_datetime"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_current_datetime"]()
        return "get_current_datetime", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["login"].search(response_text)
    if match:
        email = match.group(1) if match.group(1) else None
        password = match.group(2) if match.group(2) else None
        result = TOOL_REGISTRY["login"](email, password)
        try:
            data = json.loads(result)
            if "token" in data:
                session["token"] = data["token"]
        except (json.JSONDecodeError, TypeError):
            pass
        return "login", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_calendars"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_calendars"](match.group(1))
        return "get_calendars", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_events"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_events"](match.group(1))
        return "get_events", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["post_event"].search(response_text)
    if match:
        reminder = None
        if match.group(7):
            reminder = [int(x.strip()) for x in match.group(7).split(",") if x.strip()]
        result = TOOL_REGISTRY["post_event"](
            token=match.group(1),
            calendar_id=match.group(2),
            title=match.group(3),
            start_time=match.group(4),
            end_time=match.group(5),
            description=match.group(6) or "",
            reminder_minutes=reminder,
        )
        return "post_event", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["patch_event"].search(response_text)
    if match:
        reminder = None
        if match.group(7):
            reminder = [int(x.strip()) for x in match.group(7).split(",") if x.strip()]
        result = TOOL_REGISTRY["patch_event"](
            token=match.group(1),
            event_id=match.group(2),
            title=match.group(3) or None,
            start_time=match.group(4) or None,
            end_time=match.group(5) or None,
            description=match.group(6) or None,
            reminder_minutes=reminder,
        )
        return "patch_event", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["delete_event"].search(response_text)
    if match:
        result = TOOL_REGISTRY["delete_event"](match.group(1), match.group(2))
        return "delete_event", f"OBSERVE:\n{result}", False

    # Finance tools
    match = TOOL_PATTERNS["get_accounts"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_accounts"](match.group(1))
        return "get_accounts", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_transactions"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_transactions"](
            token=match.group(1),
            account_id=match.group(2) or None,
            start_date=match.group(3) or None,
            end_date=match.group(4) or None,
            transaction_type=match.group(5) or None,
            category_id=match.group(6) or None,
        )
        return "get_transactions", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["create_transaction"].search(response_text)
    if match:
        result = TOOL_REGISTRY["create_transaction"](
            token=match.group(1),
            account_id=match.group(2),
            transaction_type=match.group(3),
            amount=match.group(4),
            description=match.group(5),
            date_str=match.group(6) or None,
            category_id=match.group(7) or None,
            notes=match.group(8) or None,
        )
        return "create_transaction", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["create_transfer"].search(response_text)
    if match:
        result = TOOL_REGISTRY["create_transfer"](
            token=match.group(1),
            from_account_id=match.group(2),
            to_account_id=match.group(3),
            amount=match.group(4),
            description=match.group(5),
            date_str=match.group(6) or None,
        )
        return "create_transfer", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_financial_dashboard"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_financial_dashboard"](match.group(1))
        return "get_financial_dashboard", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_profit_loss"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_profit_loss"](
            token=match.group(1),
            account_id=match.group(2) or None,
            start_date=match.group(3) or None,
            end_date=match.group(4) or None,
        )
        return "get_profit_loss", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_budget_status"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_budget_status"](match.group(1))
        return "get_budget_status", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_categories"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_categories"](match.group(1))
        return "get_categories", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["get_tax_summary"].search(response_text)
    if match:
        result = TOOL_REGISTRY["get_tax_summary"](
            token=match.group(1),
            year=match.group(2) or None,
        )
        return "get_tax_summary", f"OBSERVE:\n{result}", False

    match = TOOL_PATTERNS["create_category"].search(response_text)
    if match:
        result = TOOL_REGISTRY["create_category"](
            token=match.group(1),
            name=match.group(2),
            category_type=match.group(3),
            is_tax_deductible=(match.group(4) or '').lower() == 'true',
            tax_category=match.group(5) or None,
            color=match.group(6) or '#9E9E9E',
            icon=match.group(7) or None,
        )
        return "create_category", f"OBSERVE:\n{result}", False

    return "unknown", "ERROR: Invalid ACT format. Use one of: get_current_datetime(), login(), get_calendars(), get_events(), post_event(), patch_event(), delete_event(), get_accounts(), get_transactions(), create_transaction(), create_transfer(), get_financial_dashboard(), get_profit_loss(), get_budget_status(), get_categories(), create_category(), get_tax_summary(), final_answer()", False


# ── LLM Call ──────────────────────────────────────────────────────────


def call_llm(model: str, messages: list, skill_context: str = "") -> str:
    system_prompt = BASE_PROMPT + skill_context
    message = anthropic_client.messages.create(
        model=model, max_tokens=2048, system=system_prompt, messages=messages
    )
    return message.content[0].text


# ── Endpoints ─────────────────────────────────────────────────────────


@app.get("/")
async def root():
    return {"status": "ok", "service": "Calendar Agent API"}


@app.get("/models")
async def list_models():
    anthropic_models = [
        {"name": m.value, "provider": "anthropic", "display_name": m.name.replace("_", " ").title()}
        for m in AnthropicModel
    ]
    return {
        "providers": ["anthropic"],
        "default_provider": "anthropic",
        "default_model": {
            "anthropic": DEFAULT_MODEL,
        },
        "models": {
            "anthropic": anthropic_models,
        },
    }


@app.post("/chat", response_model=CalendarResponse)
async def chat(request: CalendarRequest):
    """Non-streaming chat — runs the full THINK/ACT/OBSERVE loop."""
    conversation_id = request.conversation_id or str(hash(request.message))
    model = request.model or DEFAULT_MODEL

    if conversation_id not in conversations:
        conversations[conversation_id] = {
            "messages": [],
            "session": {"token": None},
        }

    conv = conversations[conversation_id]
    messages = conv["messages"]
    session = conv["session"]

    user_message = request.message
    if request.email and request.password:
        user_message = f"My credentials are: email={request.email}, password={request.password}. {user_message}"
    messages.append({"role": "user", "content": user_message})

    # Route and inject skill context before the loop
    skill_context = skill_engine.route_and_inject(user_message)

    iteration = 0
    max_iterations = 20
    final_response = ""
    is_final = False

    while iteration < max_iterations:
        iteration += 1
        try:
            assistant_message = call_llm(model, messages, skill_context)
            messages.append({"role": "assistant", "content": assistant_message})

            _, observation, is_final = execute_tool(assistant_message, session)

            if is_final:
                final_response = observation
                break

            messages.append({"role": "user", "content": observation})

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return CalendarResponse(
        response=final_response or "I wasn't able to complete the task.",
        conversation_id=conversation_id,
        completed=is_final,
    )


@app.post("/chat/stream")
async def chat_stream(request: CalendarRequest):
    """Streaming chat — emits think/act/observe events via SSE."""

    async def generate():
        conversation_id = request.conversation_id or str(hash(request.message))
        model = request.model or DEFAULT_MODEL

        if conversation_id not in conversations:
            conversations[conversation_id] = {
                "messages": [],
                "session": {"token": None},
            }

        conv = conversations[conversation_id]
        messages = conv["messages"]
        session = conv["session"]

        user_message = request.message
        if request.email and request.password:
            user_message = f"My credentials are: email={request.email}, password={request.password}. {user_message}"
        messages.append({"role": "user", "content": user_message})

        # Route and inject skill context before the loop
        skill_context = skill_engine.route_and_inject(user_message)

        yield f"data: {json.dumps({'type': 'start', 'conversation_id': conversation_id, 'message': request.message, 'provider': 'anthropic', 'model': model})}\n\n"

        iteration = 0
        max_iterations = 20
        final_response = ""
        is_final = False

        while iteration < max_iterations:
            iteration += 1
            try:
                assistant_message = call_llm(model, messages, skill_context)
                messages.append({"role": "assistant", "content": assistant_message})

                # Stream THINK/ACT components
                think_match = re.search(r'THINK:(.*?)(?=ACT:|$)', assistant_message, re.DOTALL)
                act_match = re.search(r'ACT:(.*?)$', assistant_message, re.DOTALL)

                if think_match:
                    yield f"data: {json.dumps({'type': 'think', 'content': think_match.group(1).strip(), 'iteration': iteration})}\n\n"
                if act_match:
                    yield f"data: {json.dumps({'type': 'act', 'content': act_match.group(1).strip(), 'iteration': iteration})}\n\n"

                tool_name, observation, is_final = execute_tool(assistant_message, session)

                if is_final:
                    final_response = observation
                    yield f"data: {json.dumps({'type': 'complete', 'response': final_response, 'conversation_id': conversation_id, 'iterations': iteration})}\n\n"
                    break

                yield f"data: {json.dumps({'type': 'observe', 'tool': tool_name, 'content': observation, 'iteration': iteration})}\n\n"
                messages.append({"role": "user", "content": observation})

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                break

        if not final_response:
            yield f"data: {json.dumps({'type': 'complete', 'response': 'I was not able to complete the task.', 'conversation_id': conversation_id, 'iterations': iteration})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str):
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"status": "deleted"}
    return {"status": "not_found"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4012)
