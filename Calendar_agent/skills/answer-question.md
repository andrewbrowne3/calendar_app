# Skill: Answer Question

**Keywords:** what, help, how, why, can you, tell me, explain
**Inputs:** User question or general request
**Output:** Helpful answer to the user's question
**When to use:** Default fallback — user asks a general question, needs help, or the request doesn't match a specific skill

## Procedure:

1. If the question is about calendar/finance capabilities, call `final_answer()` explaining what you can do
2. If the user needs to see their data to answer the question:
   a. Call `login()` to authenticate
   b. Use the appropriate tool to fetch data (events, accounts, dashboard, etc.)
   c. Call `final_answer()` with the answer based on the data
3. If it's a simple question, call `final_answer()` directly with the answer

### If things go wrong
- **Unclear question**: Ask the user to clarify what they need
- **Outside capabilities**: Explain what you can help with (calendar events and financial tracking)

## Reference Knowledge

### What This Assistant Can Do
- **Calendar**: Create, read, update, and delete calendar events
- **Finance**: Record transactions, transfer money, view account balances, generate P&L/budget/tax reports
- All operations require authentication via the Calendar API
