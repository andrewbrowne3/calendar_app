"""
Skill Engine — Server-side skill routing and injection for Calendar Agent.

Loads markdown skill docs from skills/ directory at startup.
Routes user queries to the best matching skill using keyword matching.
Injects the skill context directly into the system prompt (no tool call needed).
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class SkillEngine:
    def __init__(self, skills_dir: str = "skills/"):
        self.skills_dir = Path(skills_dir)
        self.skill_docs = {}      # slug -> full markdown content
        self.skill_metadata = {}  # slug -> {name, description, keywords}
        self._load_all_skills()
        logger.info(f"SkillEngine loaded: {len(self.skill_docs)} skills from {self.skills_dir}")

    def _load_all_skills(self):
        """Load every .md file from skills/ and extract metadata."""
        if not self.skills_dir.exists():
            logger.warning(f"Skills directory not found: {self.skills_dir}")
            return

        for md_file in sorted(self.skills_dir.glob("*.md")):
            slug = md_file.stem
            content = md_file.read_text()
            self.skill_docs[slug] = content

            name, description, keywords = self._parse_header(content)
            self.skill_metadata[slug] = {
                "name": name,
                "description": description,
                "keywords": keywords,
                "slug": slug,
            }

    def _parse_header(self, content: str) -> tuple:
        """Extract name, description, and keywords from markdown header."""
        name = ""
        description = ""
        keywords = []

        for line in content.split("\n"):
            if line.startswith("# Skill:"):
                name = line.replace("# Skill:", "").strip().lower()
            elif line.startswith("**Keywords:**"):
                kw_text = line.split(":**", 1)[1].strip()
                keywords = [k.strip().lower() for k in kw_text.split(",")]
            elif name and not description and line.strip() and not line.startswith("#") and not line.startswith("**"):
                description = line.strip()
                break

        return name, description, keywords

    def build_base_prompt(self) -> str:
        """
        Base system prompt with all tools inlined and THINK/ACT/OBSERVE format.
        No skill catalog — routing is server-side.
        """
        return """You are a meticulous calendar and finance assistant that manages events and financial data using a structured reasoning process.

## Available Tools

Tools the agent can call in ACT steps:
  - get_current_datetime(): Returns current ISO 8601 datetime
  - login(email, password): Authenticates, returns JWT. Defaults: email=andrewbrowne161@gmail.com
  - get_calendars(token): Returns user's calendars (need calendar_id for events)
  - get_events(token): Returns all events for user
  - post_event(token, calendar_id, title, start_time, end_time, description, reminder_minutes): Creates new event
  - patch_event(token, event_id, title, start_time, end_time, description, reminder_minutes): Updates event fields (only sends changed fields)
  - delete_event(token, event_id): Deletes event by ID
  - get_accounts(token): Returns user's financial accounts (business, personal, joint)
  - get_transactions(token, account_id, start_date, end_date, transaction_type, category_id): Returns transactions with optional filters
  - create_transaction(token, account_id, transaction_type, amount, description, date, category_id, notes): Creates income/expense transaction
  - create_transfer(token, from_account_id, to_account_id, amount, description, date): Transfers money between accounts
  - get_financial_dashboard(token): Returns financial overview: balances, monthly income/expenses, budget alerts
  - get_profit_loss(token, account_id, start_date, end_date): Returns P&L report with income/expense breakdown by category
  - get_budget_status(token): Returns current budget utilization for all budgets
  - get_categories(token): Returns available transaction categories (income/expense)
  - get_tax_summary(token, year): Returns tax-deductible expense summary by category
  - final_answer(answer): Returns response to user, ends the loop

## How You Work

You reason step-by-step using THINK/ACT/OBSERVE.
A Skill Context section is provided below with the procedure to follow for this query.
Follow the procedure steps to help the user.
Always respond with exactly one THINK/ACT pair:
```
THINK:
[Your reasoning about what to do next]
ACT:
tool_name(arg1, arg2)
```

### Rules
- ALWAYS provide a tool call after ACT:, else you will fail
- When done, call final_answer() with your response to the user
- For datetime format use ISO 8601: "YYYY-MM-DDTHH:MM:SS-05:00" (Eastern timezone)
- When user mentions relative dates ("tomorrow", "next week"), call get_current_datetime() first
- You must login() before calling any calendar/event/finance tools
- After login, get calendar_id via get_calendars() before creating events
- For patch_event, first get_events() to find the event_id
- NEVER use Z (UTC) for timezone — always use Eastern offset from get_current_datetime()
"""

    def route_query(self, query: str) -> str:
        """
        Server-side skill routing. Returns the slug of the best matching skill.
        Uses keyword matching against the query text. Defaults to 'answer-question'.
        """
        query_lower = query.lower()

        best_match = None
        best_score = 0

        for slug, meta in self.skill_metadata.items():
            score = 0
            name = meta["name"]

            # Keyword phrase match (highest value — multi-word phrases)
            for kw in meta.get("keywords", []):
                if kw in query_lower:
                    # Multi-word keywords score higher
                    score += 5 + len(kw.split()) * 2

            # Skill name word overlap
            name_words = set(name.split())
            query_words = set(query_lower.split())
            overlap = name_words & query_words
            score += len(overlap) * 3

            if score > best_score:
                best_score = score
                best_match = slug

        # Low confidence → default to answer-question
        if best_score < 5:
            return "answer-question"

        return best_match

    def route_and_inject(self, query: str) -> str:
        """
        Main entry point: route query to a skill, return the markdown
        to inject into the system prompt.
        """
        slug = self.route_query(query)
        content = self.skill_docs.get(slug, "")

        if content:
            logger.info(f"[SkillEngine] Routed to: {slug}")
            return f"\n## Skill Context (auto-loaded: {slug})\n\n{content}\n\nFollow the procedure steps above."
        else:
            logger.warning(f"[SkillEngine] No skill doc found for slug: {slug}")
            return ""
