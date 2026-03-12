# Skill: Update Event

**Keywords:** update, change, modify, reschedule, move, edit, rename, push back, earlier, later, move my meeting, move my event
**Inputs:** User message describing which event to change and what to change
**Output:** Confirmation that the event was updated
**When to use:** User wants to update, change, modify, reschedule, or edit an existing event

## Procedure:

1. Call `login()` to authenticate (if not already authenticated)
2. Call `get_current_datetime()` if the user mentions relative dates
3. Call `get_events(token)` to find the event the user wants to modify
4. Match the user's description to an event (by title, date, or ID)
5. Apply only the changes the user specified — don't overwrite other fields
6. Call `patch_event(token, event_id, title, start_time, end_time, description, reminder_minutes)` with only the changed fields
7. Call `final_answer()` confirming the update

### If things go wrong
- **Event not found**: Show the user their events, ask which one they meant
- **Multiple matches**: List matching events, ask the user to pick one
- **Invalid datetime**: Re-parse with corrected ISO 8601 format

## Reference Knowledge

### Calendar API
- Base URL: https://calendar.andrewbrowne.org
- Events: GET /api/events/, PATCH /api/events/{id}/
- Auth type: JWT Bearer token in Authorization header

### Event Schema
- Datetime format: ISO 8601 with Eastern timezone offset: YYYY-MM-DDTHH:MM:SS-05:00 (EST) or -04:00 (EDT). NEVER use Z (UTC).
- patch_event only sends changed fields — omit unchanged ones
