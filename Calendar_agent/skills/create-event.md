# Skill: Create Event

**Keywords:** create, add, schedule, new event, meeting, appointment, set up, book
**Inputs:** User message with event details (title, date/time, description, reminders)
**Output:** Confirmation that the event was created
**When to use:** User wants to create, add, or schedule a new calendar event

## Procedure:

1. Call `login()` to authenticate (if not already authenticated)
2. Call `get_current_datetime()` to get the current date/time (needed for relative dates like "tomorrow")
3. Call `get_calendars(token)` to get the user's calendar_id
4. Parse the event details from the user's message:
   - **title**: What the event is about
   - **start_time**: When it starts (convert relative dates using current datetime)
   - **end_time**: When it ends (default: 1 hour after start if not specified)
   - **description**: Optional additional details
   - **reminder_minutes**: Optional reminder list (e.g., [15, 60])
5. Call `post_event(token, calendar_id, title, start_time, end_time, description, reminder_minutes)`
6. Call `final_answer()` confirming the event was created with the details

### If things go wrong
- **Missing required fields**: Ask the user for the missing information (title, time)
- **Invalid datetime**: Re-parse with corrected ISO 8601 format
- **API error**: Report the error details to the user

## Reference Knowledge

### Calendar API
- Base URL: https://calendar.andrewbrowne.org
- Auth: POST /api/auth/login/ → returns {access: token}
- Calendars: GET /api/calendars/
- Events: POST /api/events/

### Event Schema
- Required fields: calendar (calendar_id), title, start_time, end_time
- Optional fields: description, reminder_minutes (array of integers)
- Datetime format: ISO 8601 with Eastern timezone offset: YYYY-MM-DDTHH:MM:SS-05:00 (EST) or -04:00 (EDT). NEVER use Z (UTC). Always use the timezone offset from get_current_datetime().
- Reminder format: array of integer minutes before event start (e.g., [5, 15, 60])
