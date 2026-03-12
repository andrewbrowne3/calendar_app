from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, Literal

app = FastAPI(title="Simple Calendar Event Creation Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EventCreationRequest(BaseModel):
    user_input: str
    calendar_id: str
    timezone: str = "America/New_York"

# Simple auth for testing
async def get_current_user(authorization: str = Header(None)):
    """Simple auth for testing"""
    return {"id": "test-user-123", "email": "test@example.com"}

def parse_event_simple(user_input: str) -> dict:
    """Simple event parsing without LLM for testing"""
    
    # Basic keyword extraction
    title = "Meeting"  # default
    description = ""
    location = ""
    
    # Extract title (look for common patterns)
    if "meeting" in user_input.lower():
        if "team" in user_input.lower():
            title = "Team Meeting"
        else:
            title = "Meeting"
    elif "appointment" in user_input.lower():
        title = "Appointment"
    elif "call" in user_input.lower():
        title = "Call"
    
    # Extract location
    if "conference room" in user_input.lower():
        location = "Conference Room"
    elif "room" in user_input.lower():
        location = "Meeting Room"
    
    # Extract description
    if "project" in user_input.lower():
        description = "Project related meeting"
    
    # Basic time parsing (simplified)
    start_time = datetime.now() + timedelta(days=1)  # Default to tomorrow
    start_time = start_time.replace(hour=14, minute=0, second=0, microsecond=0)  # 2pm
    end_time = start_time + timedelta(hours=1)  # 1 hour duration
    
    # Look for time indicators
    if "2pm" in user_input or "2:00" in user_input:
        start_time = start_time.replace(hour=14)
    elif "3pm" in user_input or "3:00" in user_input:
        start_time = start_time.replace(hour=15)
    elif "10am" in user_input or "10:00" in user_input:
        start_time = start_time.replace(hour=10)
    
    # Look for duration
    if "1 hour" in user_input:
        end_time = start_time + timedelta(hours=1)
    elif "2 hour" in user_input:
        end_time = start_time + timedelta(hours=2)
    elif "30 min" in user_input:
        end_time = start_time + timedelta(minutes=30)
    
    return {
        "title": title,
        "description": description,
        "location": location,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "all_day": False
    }

@app.post("/create-event-simple")
async def create_event_simple(request: EventCreationRequest, user = None):
    """Create a calendar event with simple parsing (no auth for testing)"""
    try:
        print(f"Received request: {request.user_input}")
        
        # Parse the event
        event_data = parse_event_simple(request.user_input)
        
        # Add metadata
        event_data.update({
            "id": str(uuid.uuid4()),
            "calendar_id": request.calendar_id,
            "user_id": "test-user-123",
            "status": "confirmed",
            "created_at": datetime.now().isoformat()
        })
        
        return {
            "success": True,
            "event": event_data,
            "message": f"Event '{event_data['title']}' created successfully!",
            "parsing_method": "simple_keyword_extraction"
        }
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Event creation failed: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "simple-calendar-event-agent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=2017)