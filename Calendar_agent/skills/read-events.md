# Skill: Read Events

**Keywords:** show, list, view, upcoming, agenda, what's on, my events, calendar, schedule, what do i have
**Inputs:** User request to see their calendar events
**Output:** Formatted list of upcoming events
**When to use:** User wants to see, list, or view their calendar events

## Procedure:

1. Call `login()` to authenticate (if not already authenticated)
2. Call `get_events(token)` to retrieve all events
3. Format the events in a readable way:
   - Organize chronologically
   - Show date, time, title, and description for each event
4. Call `final_answer()` presenting the formatted events to the user

### If things go wrong
- **No events found**: Tell the user they have no upcoming events
- **API error**: Report the error details to the user

## Reference Knowledge

### Calendar API
- Base URL: https://calendar.andrewbrowne.org
- Auth: POST /api/auth/login/ → returns {access: token}
- Events: GET /api/events/
- Auth type: JWT Bearer token in Authorization header
