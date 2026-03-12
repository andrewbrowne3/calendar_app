# Skill: Delete Event

**Keywords:** delete, remove, cancel, get rid of, drop
**Inputs:** User message describing which event to delete
**Output:** Confirmation that the event was deleted
**When to use:** User wants to delete, remove, or cancel a calendar event

## Procedure:

1. Call `login()` to authenticate (if not already authenticated)
2. Call `get_events(token)` to find the target event
3. Match the user's description to an event (by title, date, or ID)
4. If multiple matches, ask the user to confirm which one
5. Call `delete_event(token, event_id)` to remove the event
6. Call `final_answer()` confirming the deletion

### If things go wrong
- **Event not found**: Show the user their events, ask which one they meant
- **Multiple matches**: List matching events, ask the user to pick one

## Reference Knowledge

### Calendar API
- Base URL: https://calendar.andrewbrowne.org
- Events: GET /api/events/, DELETE /api/events/{id}/
- Auth type: JWT Bearer token in Authorization header
