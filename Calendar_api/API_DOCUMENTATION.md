# Calendar API Documentation

## Base URL
```
http://localhost:2010/api
```

## Authentication
All endpoints except registration and login require JWT authentication.

Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Authentication Endpoints

### Register
```
POST /auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "strongpassword",
  "password_confirm": "strongpassword",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "timezone": "America/New_York"
}
```

### Login
```
POST /auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "user": {...},
  "refresh": "eyJ0eXAiOiJKV1Q...",
  "access": "eyJ0eXAiOiJKV1Q...",
  "message": "Login successful"
}
```

### Refresh Token
```
POST /auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1Q..."
}
```

### Logout
```
POST /auth/logout/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1Q..."
}
```

### Get/Update Profile
```
GET /auth/profile/
PUT /auth/profile/
PATCH /auth/profile/
Authorization: Bearer <access_token>
```

### Change Password
```
POST /auth/change-password/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "old_password": "oldpassword",
  "new_password": "newpassword",
  "new_password_confirm": "newpassword"
}
```

## Calendar Endpoints

### List/Create Calendars
```
GET /calendars/
POST /calendars/
Authorization: Bearer <access_token>

POST body:
{
  "name": "Work Calendar",
  "description": "My work events",
  "color": "#FF5733",
  "visibility": "private",
  "timezone": "UTC"
}
```

### Get/Update/Delete Calendar
```
GET /calendars/<calendar_id>/
PUT /calendars/<calendar_id>/
PATCH /calendars/<calendar_id>/
DELETE /calendars/<calendar_id>/
Authorization: Bearer <access_token>
```

### Calendar Sharing
```
GET /calendars/<calendar_id>/shares/
POST /calendars/<calendar_id>/shares/
Authorization: Bearer <access_token>

POST body:
{
  "user_email": "friend@example.com",
  "permission": "view" // view, edit, or manage
}
```

## Event Endpoints

### List/Create Events
```
GET /events/
POST /events/
Authorization: Bearer <access_token>

Query parameters for GET:
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD
- calendar_id: UUID

POST body:
{
  "calendar": "calendar-uuid",
  "title": "Team Meeting",
  "description": "Weekly team sync",
  "location": "Conference Room A",
  "start_time": "2024-01-10T10:00:00Z",
  "end_time": "2024-01-10T11:00:00Z",
  "all_day": false,
  "status": "confirmed",
  "color": "#3788d8",
  "recurrence_rule": "weekly",
  "recurrence_interval": 1,
  "recurrence_end_date": "2024-12-31",
  "attendee_emails": ["colleague@example.com"],
  "reminder_minutes": [15, 60]
}
```

### Get/Update/Delete Event
```
GET /events/<event_id>/
PUT /events/<event_id>/
PATCH /events/<event_id>/
DELETE /events/<event_id>/
Authorization: Bearer <access_token>
```

### Event Attendee Response
```
POST /events/<event_id>/response/
Authorization: Bearer <access_token>

{
  "response": "accepted" // pending, accepted, declined, tentative
}
```

### Event Reminders
```
GET /events/<event_id>/reminders/
POST /events/<event_id>/reminders/
Authorization: Bearer <access_token>

POST body:
{
  "reminder_type": "email", // email, popup, sms
  "minutes_before": 30
}
```

## Features

### Calendar Features
- Multiple calendars per user
- Calendar sharing with permission levels (view, edit, manage)
- Custom colors and timezones
- Soft delete (is_active flag)

### Event Features
- Event recurrence (daily, weekly, monthly, yearly)
- Multiple attendees with RSVP tracking
- Event reminders (email, popup, SMS)
- All-day events
- Private events
- Custom event colors
- Event status tracking

### User Features
- JWT authentication with refresh tokens
- Custom user preferences (timezone, date/time format)
- Profile management
- Password change functionality

## Error Responses
```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 204: No Content (successful delete)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error