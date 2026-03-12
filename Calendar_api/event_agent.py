from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_anthropic import ChatAnthropic
from langchain_ollama.llms import OllamaLLM
from langgraph.graph import StateGraph, START, END
# from langgraph.checkpoint import MemorySaver  # Skip checkpointing for now
from pydantic import BaseModel
import os
import json
import re
import time
import uuid
import sqlite3
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime, timedelta
import pytz
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# Simple auth dependency for testing (will integrate Django later)
async def get_current_user(authorization: str = Header(None)):
    """Simple auth for testing - returns mock user"""
    return {"id": "test-user-123", "email": "test@example.com"}

class EventCreationState(BaseModel):
    user_input: str
    current_step: int = 0
    max_steps: int = 30
    react_trace: List[Dict[str, Any]] = []
    
    # Event components extracted from input
    event_title: str = ""
    event_description: str = ""
    event_location: str = ""
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    all_day: bool = False
    
    # Calendar and user context
    calendar_id: str = ""
    user_id: str = ""
    timezone: str = "America/New_York"
    
    # Conflict resolution
    conflicts_detected: List[Dict[str, Any]] = []
    conflict_resolution: str = ""
    
    # Attendees and notifications
    attendees: List[str] = []
    send_notifications: bool = True
    
    # Final result
    created_event: Optional[Dict[str, Any]] = None
    is_complete: bool = False
    thread_id: str = ""

    # For update operations
    event_to_update_id: Optional[str] = None
    updated_event: Optional[Dict[str, Any]] = None
    fetched_events: List[Dict[str, Any]] = []
    user_token: str = ""  # Auth token for API calls

    # LLM configuration
    llm_provider: str = "cloud"
    model_name: Optional[str] = None

class EventCreationRequest(BaseModel):
    user_input: str
    calendar_id: str
    timezone: str = "America/New_York"
    thread_id: Optional[str] = None
    llm_provider: Literal["cloud", "local"] = "local"  # Default to local for testing
    model_name: Optional[str] = None

def get_llm(provider: str = "cloud", model_name: str = None):
    """Get the appropriate LLM based on provider choice"""
    if provider == "local":
        local_model = model_name or "llama3.2"
        try:
            return OllamaLLM(model=local_model, base_url="http://localhost:11434")
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to initialize Ollama with model '{local_model}'. Error: {str(e)}"
            )
    elif provider == "cloud":
        cloud_model = model_name or "claude-3-5-sonnet-20241022"
        return ChatAnthropic(
            model=cloud_model,
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            temperature=0.3,
            max_tokens=2000
        )
    else:
        raise ValueError(f"Invalid LLM provider: {provider}")

# ReACT template for event creation
react_template = ChatPromptTemplate.from_messages([
    ("system", """You are an intelligent calendar assistant using the ReAct (Reasoning and Acting) framework to create calendar events from natural language input.

Your goal is to parse the user's input and create a properly formatted calendar event by following these steps:

1. **PARSE_EVENT_DETAILS**: Extract event information from natural language
2. **VALIDATE_DATETIME**: Parse and validate date/time information  
3. **CHECK_AVAILABILITY**: Query calendar for scheduling conflicts
4. **RESOLVE_CONFLICTS**: Handle scheduling conflicts intelligently
5. **GATHER_ATTENDEES**: Process attendee information if provided
6. **CREATE_EVENT**: Generate the calendar event via API
7. **CONFIRM_CREATION**: Verify successful event creation

**Available Actions:**
- PARSE_EVENT_DETAILS: Extract title, description, location, date/time from user input
- VALIDATE_DATETIME: Parse dates/times and convert to proper timezone format
- CHECK_AVAILABILITY: Check for conflicts with existing events
- RESOLVE_CONFLICTS: Suggest alternative times or ask for confirmation
- GATHER_ATTENDEES: Extract and validate attendee information
- CREATE_EVENT: Create the actual calendar event
- CONFIRM_CREATION: Verify the event was created successfully
- FETCH_EVENTS: Get user's events to find one to update. Returns list of events with IDs
- UPDATE_EVENT: Update an existing event. Input: JSON with event_id and fields to update (title, start_time, end_time, location, description)
- FINISH: Complete the process

**Guidelines:**
- Always parse dates/times carefully considering timezone ({timezone})
- Default to 1-hour duration if end time not specified
- Check for conflicts before creating events
- Be helpful in resolving scheduling issues
- Confirm all details before final creation

Always think step by step and explain your reasoning before taking action.

Format your response as:
Thought: [your reasoning about what to do next]
Action: [choose one action from the list above]
Action Input: [specific input for the action]"""),
    ("human", "User Input: {user_input}\n\nCalendar ID: {calendar_id}\nTimezone: {timezone}\n\nPrevious steps:\n{context}\n\nProgress: {progress}\n\nWhat should you do next?")
])

def generate_react_step(state: EventCreationState, llm) -> tuple:
    """Generate a single ReAct step for event creation"""
    
    # Build context from previous steps
    context = build_react_context(state)
    
    # Determine progress message
    if state.created_event:
        progress_message = "Event created successfully! Use CONFIRM_CREATION to verify and finish."
    elif state.start_datetime and state.event_title:
        progress_message = "Event details parsed. Check for conflicts and create the event."
    elif state.event_title:
        progress_message = "Event title extracted. Parse datetime information next."
    else:
        progress_message = "Start by parsing the event details from user input."
    
    # Generate the ReACT step
    react_chain = react_template | llm | StrOutputParser()
    response = react_chain.invoke({
        "user_input": state.user_input,
        "calendar_id": state.calendar_id,
        "timezone": state.timezone,
        "context": context,
        "progress": progress_message
    })
    
    # Parse the response
    thought_match = re.search(r'Thought:\s*(.+?)(?=Action:|$)', response, re.DOTALL)
    action_match = re.search(r'Action:\s*(\w+)', response)
    input_match = re.search(r'Action Input:\s*(.+?)(?=\n|$)', response, re.DOTALL)
    
    thought = thought_match.group(1).strip() if thought_match else "No thought provided"
    action = action_match.group(1) if action_match else "PARSE_EVENT_DETAILS"
    action_input = input_match.group(1).strip() if input_match else ""
    
    return thought, action, action_input

def execute_action(state: EventCreationState, action: str, action_input: str, llm) -> str:
    """Execute the specified action for event creation"""
    
    if action == "PARSE_EVENT_DETAILS":
        # Use LLM to extract event details from natural language
        parse_template = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at parsing natural language into structured event data.

Extract the following information from the user input:
- Event title (required)
- Description (optional)
- Location (optional) 
- Date and time information
- Duration or end time
- Whether it's an all-day event
- Any attendee information

Return the information in this JSON format:
{{
    "title": "extracted title",
    "description": "extracted description or empty string",
    "location": "extracted location or empty string", 
    "date_info": "all date/time related text",
    "all_day": true/false,
    "attendees": ["list of attendees if any"],
    "confidence": 0.8
}}"""),
            ("human", "Parse this event request: {user_input}")
        ])
        
        parse_chain = parse_template | llm | StrOutputParser()
        response = parse_chain.invoke({"user_input": state.user_input})
        
        try:
            # Try to parse as JSON
            if response.strip().startswith('{'):
                parsed_data = json.loads(response)
                state.event_title = parsed_data.get("title", "")
                state.event_description = parsed_data.get("description", "")
                state.event_location = parsed_data.get("location", "")
                state.all_day = parsed_data.get("all_day", False)
                state.attendees = parsed_data.get("attendees", [])
                
                return f"Event details parsed successfully:\nTitle: {state.event_title}\nDescription: {state.event_description}\nLocation: {state.event_location}\nAll Day: {state.all_day}\nAttendees: {state.attendees}"
            else:
                return f"Event parsing result: {response}"
        except json.JSONDecodeError:
            return f"Event parsing result: {response}"
    
    elif action == "VALIDATE_DATETIME":
        # Parse and validate datetime information
        datetime_template = ChatPromptTemplate.from_messages([
            ("system", f"""You are a datetime parsing expert. Parse the date and time information from the user input and convert it to ISO format.

Current timezone: {state.timezone}
Current date: {datetime.now().strftime('%Y-%m-%d')}
Current time: {datetime.now().strftime('%H:%M')}

Extract and return:
- Start date and time in ISO format (YYYY-MM-DDTHH:MM:SS)
- End date and time in ISO format (YYYY-MM-DDTHH:MM:SS)
- If no end time specified, default to 1 hour after start time
- Consider relative dates like "tomorrow", "next week", etc.
- Consider relative times like "in 2 hours", "at 3pm", etc.

Return JSON format:
{{
    "start_datetime": "YYYY-MM-DDTHH:MM:SS",
    "end_datetime": "YYYY-MM-DDTHH:MM:SS",
    "all_day": true/false,
    "confidence": 0.8,
    "original_text": "original date/time text found"
}}"""),
            ("human", "Parse datetime from this event request: {user_input}\n\nDate/time context: {action_input}")
        ])
        
        datetime_chain = datetime_template | llm | StrOutputParser()
        response = datetime_chain.invoke({
            "user_input": state.user_input,
            "action_input": action_input
        })
        
        try:
            if response.strip().startswith('{'):
                parsed_data = json.loads(response)
                state.start_datetime = parsed_data.get("start_datetime")
                state.end_datetime = parsed_data.get("end_datetime")
                state.all_day = parsed_data.get("all_day", False)
                
                return f"Datetime parsed successfully:\nStart: {state.start_datetime}\nEnd: {state.end_datetime}\nAll Day: {state.all_day}"
            else:
                return f"Datetime parsing result: {response}"
        except json.JSONDecodeError:
            return f"Datetime parsing result: {response}"
    
    elif action == "CHECK_AVAILABILITY":
        # Check for scheduling conflicts (simplified for testing)
        if state.start_datetime and state.end_datetime:
            try:
                start_dt = datetime.fromisoformat(state.start_datetime.replace('Z', ''))
                end_dt = datetime.fromisoformat(state.end_datetime.replace('Z', '')) if state.end_datetime else start_dt + timedelta(hours=1)
                
                # Simulate availability check (will integrate with Django API later)
                return f"Availability checked for {start_dt.isoformat()} to {end_dt.isoformat()}. No conflicts detected - time slot is available!"
                    
            except Exception as e:
                return f"Error checking availability: {str(e)}"
        else:
            return "Cannot check availability - datetime information not available."
    
    elif action == "RESOLVE_CONFLICTS":
        # Handle any detected conflicts
        if state.conflicts_detected:
            return f"Conflict resolution needed for: {state.conflicts_detected}"
        else:
            return "No conflicts to resolve. Proceeding with event creation."
    
    elif action == "GATHER_ATTENDEES":
        # Process attendee information
        if state.attendees:
            return f"Attendees identified: {', '.join(state.attendees)}"
        else:
            return "No attendees specified for this event."
    
    elif action == "CREATE_EVENT":
        # Create the actual calendar event (simplified for testing)
        if not state.event_title or not state.start_datetime:
            return "Cannot create event - missing required information (title or start time)."
        
        try:
            # Parse datetime strings
            start_dt = datetime.fromisoformat(state.start_datetime.replace('Z', ''))
            end_dt = datetime.fromisoformat(state.end_datetime.replace('Z', '')) if state.end_datetime else start_dt + timedelta(hours=1)
            
            # Create event data structure (will integrate with Django API later)
            event_data = {
                "id": str(uuid.uuid4()),
                "title": state.event_title,
                "description": state.event_description or "",
                "location": state.event_location or "",
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
                "all_day": state.all_day,
                "calendar_id": state.calendar_id,
                "creator_id": state.user_id,
                "status": "confirmed",
                "created_at": datetime.now().isoformat()
            }
            
            state.created_event = event_data
            return f"Event created successfully!\nEvent ID: {event_data['id']}\nTitle: {event_data['title']}\nTime: {event_data['start_time']} - {event_data['end_time']}"
            
        except Exception as e:
            return f"Error creating event: {str(e)}"
    
    elif action == "CONFIRM_CREATION":
        if state.created_event:
            return f"Event creation confirmed:\n{json.dumps(state.created_event, indent=2)}"
        else:
            return "No event to confirm - please create the event first."
    
    elif action == "FINISH":
        if state.created_event:
            return f"Event creation completed successfully!\n\nEvent Details:\nTitle: {state.event_title}\nStart: {state.start_datetime}\nEnd: {state.end_datetime}\nLocation: {state.event_location}\nDescription: {state.event_description}"
        elif state.updated_event:
            return f"Event update completed successfully!\n\nUpdated Event:\nTitle: {state.updated_event.get('title')}\nStart: {state.updated_event.get('start_time')}\nEnd: {state.updated_event.get('end_time')}"
        else:
            return "Cannot finish - no event was created or updated."

    elif action == "FETCH_EVENTS":
        # Fetch events from Django API
        try:
            api_url = os.getenv("CALENDAR_API_URL", "http://localhost:8000")
            headers = {}
            if state.user_token:
                headers["Authorization"] = f"Bearer {state.user_token}"

            response = requests.get(
                f"{api_url}/api/events/",
                headers=headers,
                timeout=10
            )
            if response.status_code == 200:
                events_data = response.json()
                # Handle paginated response
                events = events_data.get('results', events_data) if isinstance(events_data, dict) else events_data
                state.fetched_events = events
                # Format events for display
                event_list = []
                for e in events[:10]:  # Limit to 10
                    title = e.get('title', 'Untitled')
                    event_id = e.get('id', 'unknown')
                    start = e.get('start_time', '')[:16] if e.get('start_time') else 'No date'
                    event_list.append(f"- {title} (ID: {event_id}) - {start}")
                return f"Found {len(events)} events:\n" + "\n".join(event_list) if event_list else "No events found."
            else:
                return f"Failed to fetch events: HTTP {response.status_code}"
        except Exception as e:
            return f"Error fetching events: {str(e)}"

    elif action == "UPDATE_EVENT":
        # Parse the update request and update an event
        try:
            # Try to parse action_input as JSON
            update_data = {}
            if action_input and action_input.strip().startswith('{'):
                update_data = json.loads(action_input)

            event_id = update_data.get("event_id") or state.event_to_update_id

            if not event_id:
                # Try to find event from fetched events by title match
                if state.fetched_events and state.event_title:
                    for e in state.fetched_events:
                        if state.event_title.lower() in e.get('title', '').lower():
                            event_id = e.get('id')
                            break

                if not event_id:
                    return "Cannot update - no event_id specified. Use FETCH_EVENTS first to find the event ID."

            # Build update payload from action_input and state
            updates = {}
            if update_data.get("title"):
                updates["title"] = update_data["title"]
            elif state.event_title and not update_data.get("keep_title"):
                updates["title"] = state.event_title

            if update_data.get("start_time"):
                updates["start_time"] = update_data["start_time"]
            elif state.start_datetime:
                updates["start_time"] = state.start_datetime

            if update_data.get("end_time"):
                updates["end_time"] = update_data["end_time"]
            elif state.end_datetime:
                updates["end_time"] = state.end_datetime

            if update_data.get("location"):
                updates["location"] = update_data["location"]
            elif state.event_location:
                updates["location"] = state.event_location

            if update_data.get("description"):
                updates["description"] = update_data["description"]
            elif state.event_description:
                updates["description"] = state.event_description

            if not updates:
                return "No fields to update. Specify what you want to change."

            # Make API call
            api_url = os.getenv("CALENDAR_API_URL", "http://localhost:8000")
            headers = {"Content-Type": "application/json"}
            if state.user_token:
                headers["Authorization"] = f"Bearer {state.user_token}"

            response = requests.patch(
                f"{api_url}/api/events/{event_id}/",
                json=updates,
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                state.updated_event = response.json()
                state.event_to_update_id = event_id
                return f"Event updated successfully!\nID: {event_id}\nTitle: {state.updated_event.get('title')}\nStart: {state.updated_event.get('start_time')}\nEnd: {state.updated_event.get('end_time')}"
            else:
                return f"Failed to update event: HTTP {response.status_code} - {response.text[:200]}"
        except json.JSONDecodeError as e:
            return f"Invalid JSON in action input: {str(e)}. Expected format: {{\"event_id\": \"...\", \"title\": \"...\"}}"
        except Exception as e:
            return f"Error updating event: {str(e)}"

    else:
        return f"Unknown action: {action}"

def build_react_context(state: EventCreationState) -> str:
    """Build context from previous ReACT steps"""
    if not state.react_trace:
        return "This is the first step. Start by parsing the event details from user input."
    
    context_parts = []
    
    # Organize steps by type
    parsing_steps = []
    datetime_steps = []
    conflict_steps = []
    creation_steps = []
    
    for step in state.react_trace:
        action = step.get('action', '')
        observation = step.get('observation', '')
        
        if action == 'PARSE_EVENT_DETAILS':
            parsing_steps.append(f"Parsed: {observation[:200]}...")
        elif action == 'VALIDATE_DATETIME':
            datetime_steps.append(f"DateTime: {observation[:200]}...")
        elif action in ['CHECK_AVAILABILITY', 'RESOLVE_CONFLICTS']:
            conflict_steps.append(f"Conflict Check: {observation[:200]}...")
        elif action in ['CREATE_EVENT', 'CONFIRM_CREATION']:
            creation_steps.append(f"Creation: {observation[:200]}...")
    
    if parsing_steps:
        context_parts.append("Event Details:\n" + "\n".join(parsing_steps[-2:]))
    
    if datetime_steps:
        context_parts.append("DateTime Processing:\n" + "\n".join(datetime_steps[-2:]))
    
    if conflict_steps:
        context_parts.append("Conflict Resolution:\n" + "\n".join(conflict_steps[-2:]))
    
    if creation_steps:
        context_parts.append("Event Creation:\n" + "\n".join(creation_steps[-2:]))
    
    # Add current extracted information
    if state.event_title or state.start_datetime:
        current_info = []
        if state.event_title:
            current_info.append(f"Title: {state.event_title}")
        if state.start_datetime:
            current_info.append(f"Start: {state.start_datetime}")
        if state.end_datetime:
            current_info.append(f"End: {state.end_datetime}")
        if state.event_location:
            current_info.append(f"Location: {state.event_location}")
        
        context_parts.append("Current Event Data:\n" + "\n".join(current_info))
    
    return "\n\n".join(context_parts) if context_parts else "No previous context available."

def event_agent(state: EventCreationState) -> EventCreationState:
    """Execute one step of the event creation ReAct agent"""
    
    # Get the appropriate LLM
    llm = get_llm(state.llm_provider, state.model_name)
    
    # Generate the next ReACT step
    thought, action, action_input = generate_react_step(state, llm)
    
    # Store the step
    step = {
        "step": state.current_step + 1,
        "thought": thought,
        "action": action,
        "action_input": action_input,
        "observation": ""
    }
    state.react_trace.append(step)
    
    # Execute the action
    observation = execute_action(state, action, action_input, llm)
    
    # Update the observation
    state.react_trace[-1]["observation"] = observation
    
    # Increment step
    state.current_step += 1
    
    # Check completion
    if action == "FINISH":
        state.is_complete = True
    
    # Force completion if max steps reached and we have basic event info
    if state.current_step >= state.max_steps - 5:
        if state.event_title and state.start_datetime:
            state.is_complete = True
    
    return state

def should_continue(state: EventCreationState) -> str:
    """Determine if ReAct loop should continue"""
    if state.is_complete or state.current_step >= state.max_steps:
        return END
    # Also complete if we've successfully updated an event
    if state.updated_event:
        return END
    return "event_agent"

# Create the event creation graph
def create_event_graph():
    """Create the event creation graph"""
    workflow = StateGraph(EventCreationState)
    
    # Add the main event agent node
    workflow.add_node("event_agent", event_agent)
    
    # Set up the flow
    workflow.add_edge(START, "event_agent")
    workflow.add_conditional_edges(
        "event_agent",
        should_continue,
        {
            "event_agent": "event_agent",
            END: END
        }
    )
    
    # Compile without checkpointer for now
    return workflow.compile()

# Create the graph instance
event_graph = create_event_graph()

# FastAPI integration
app = FastAPI(title="Calendar Event Creation Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/create-event-agent")
async def create_event_with_agent(request: EventCreationRequest, user = Depends(get_current_user)):
    """Create a calendar event using the ReACT agent"""
    try:
        start_time = time.time()
        
        # Generate thread_id for tracking
        thread_id = request.thread_id or f"event-{uuid.uuid4()}"
        
        # Create initial state
        initial_state = EventCreationState(
            user_input=request.user_input,
            calendar_id=request.calendar_id,
            user_id=user["id"],  # Use authenticated user ID
            timezone=request.timezone,
            thread_id=thread_id,
            llm_provider=request.llm_provider,
            model_name=request.model_name
        )
        print(f"Starting new event creation thread {thread_id}")
        
        # Run the event creation agent
        final_result = event_graph.invoke(initial_state)
        
        if isinstance(final_result, dict):
            final_state = EventCreationState(**final_result)
        else:
            final_state = final_result
        
        processing_time = time.time() - start_time
        
        return {
            "success": True,
            "event": final_state.created_event,
            "thread_id": thread_id,
            "steps_completed": final_state.current_step,
            "react_trace": final_state.react_trace,
            "processing_time": f"{processing_time:.2f} seconds",
            "is_complete": final_state.is_complete
        }
        
    except Exception as e:
        print(f"ERROR in create_event_with_agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Event creation failed: {str(e)}")

@app.post("/create-event-agent/stream")
async def create_event_with_agent_stream(request: EventCreationRequest, user = Depends(get_current_user)):
    """Stream the event creation ReAct process in real-time"""
    
    def generate():
        start_time = time.time()
        
        # Generate thread_id for tracking
        thread_id = request.thread_id or f"event-stream-{uuid.uuid4()}"
        
        # Create initial state
        current_state = EventCreationState(
            user_input=request.user_input,
            calendar_id=request.calendar_id,
            user_id=user["id"],  # Use authenticated user ID
            timezone=request.timezone,
            thread_id=thread_id,
            llm_provider=request.llm_provider,
            model_name=request.model_name
        )
        yield f"data: {json.dumps({'type': 'start', 'thread_id': thread_id, 'user_input': request.user_input})}\n\n"
        
        try:
            # Stream the graph execution
            for chunk in event_graph.stream(current_state, stream_mode="values"):
                if chunk:
                    if isinstance(chunk, dict):
                        chunk_state = EventCreationState(**chunk)
                    else:
                        chunk_state = chunk
                    
                    # Stream state updates
                    state_update = {
                        "type": "state_update",
                        "current_step": chunk_state.current_step,
                        "is_complete": chunk_state.is_complete,
                        "thread_id": thread_id,
                        "event_title": chunk_state.event_title,
                        "start_datetime": chunk_state.start_datetime,
                        "created_event": chunk_state.created_event
                    }
                    yield f"data: {json.dumps(state_update)}\n\n"
                    
                    # Stream new steps
                    if chunk_state.react_trace and len(chunk_state.react_trace) > len(current_state.react_trace):
                        new_step = chunk_state.react_trace[-1]
                        step_data = {
                            "type": "step",
                            "step": new_step.get("step", 0),
                            "thought": new_step.get("thought", "")[:300],
                            "action": new_step.get("action", ""),
                            "action_input": new_step.get("action_input", "")[:200],
                            "observation": new_step.get("observation", "")[:300],
                            "thread_id": thread_id
                        }
                        yield f"data: {json.dumps(step_data)}\n\n"
                    
                    current_state = chunk_state
            
            # Final result
            processing_time = time.time() - start_time
            final_data = {
                "type": "complete",
                "event": current_state.created_event,
                "thread_id": thread_id,
                "steps_completed": current_state.current_step,
                "processing_time": f"{processing_time:.2f} seconds",
                "is_complete": current_state.is_complete
            }
            yield f"data: {json.dumps(final_data)}\n\n"
            
        except Exception as e:
            error_data = {
                "type": "error",
                "error": f"Event creation failed: {str(e)}",
                "thread_id": thread_id
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/plain")

# State endpoint removed - will add back with proper checkpointing later

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "calendar-event-agent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)