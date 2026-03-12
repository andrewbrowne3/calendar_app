#!/usr/bin/env python3
"""
Test script for the Calendar Event Creation Agent
"""

import requests
import json
import time
from datetime import datetime

# Test configuration
API_BASE_URL = "http://localhost:8001"
CALENDAR_API_BASE_URL = "http://localhost:8000"

def test_event_agent():
    """Test the event creation agent with various natural language inputs"""
    
    # Sample test inputs
    test_cases = [
        {
            "description": "Simple meeting tomorrow",
            "input": "Schedule a team meeting tomorrow at 2pm for 1 hour in the conference room",
            "calendar_id": "your-calendar-id-here",
            "user_id": "your-user-id-here"
        },
        {
            "description": "All-day event",
            "input": "I have a vacation day next Friday",
            "calendar_id": "your-calendar-id-here", 
            "user_id": "your-user-id-here"
        },
        {
            "description": "Complex event with attendees",
            "input": "Set up a project kickoff meeting with John and Sarah on Monday at 10am for 2 hours in room 204",
            "calendar_id": "your-calendar-id-here",
            "user_id": "your-user-id-here"
        }
    ]
    
    print("🤖 Testing Calendar Event Creation Agent")
    print("="*50)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📅 Test Case {i}: {test_case['description']}")
        print(f"Input: {test_case['input']}")
        print("-" * 40)
        
        # Prepare request
        request_data = {
            "user_input": test_case["input"],
            "calendar_id": test_case["calendar_id"],
            "user_id": test_case["user_id"],
            "timezone": "America/New_York",
            "llm_provider": "cloud"  # or "local" for Ollama
        }
        
        try:
            # Test non-streaming endpoint
            print("🔄 Testing standard endpoint...")
            response = requests.post(
                f"{API_BASE_URL}/create-event-agent",
                json=request_data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success! Steps: {result['steps_completed']}")
                print(f"📝 Event: {result['event']['title'] if result['event'] else 'Not created'}")
                
                # Print ReACT trace
                if result.get('react_trace'):
                    print("\n🧠 ReACT Trace:")
                    for step in result['react_trace'][-3:]:  # Show last 3 steps
                        print(f"  Step {step.get('step', '?')}: {step.get('action', 'Unknown')}")
                        print(f"    Thought: {step.get('thought', '')[:100]}...")
                        print(f"    Result: {step.get('observation', '')[:100]}...")
            else:
                print(f"❌ Error: {response.status_code} - {response.text}")
                
        except requests.RequestException as e:
            print(f"❌ Request failed: {e}")
        
        print("\n" + "="*50)
        
        # Small delay between tests
        time.sleep(2)

def test_streaming_endpoint():
    """Test the streaming endpoint"""
    print("\n🌊 Testing Streaming Endpoint")
    print("="*50)
    
    request_data = {
        "user_input": "Create a dentist appointment next Tuesday at 3pm",
        "calendar_id": "test-calendar-id",
        "user_id": "test-user-id",
        "timezone": "America/New_York",
        "llm_provider": "cloud"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/create-event-agent/stream",
            json=request_data,
            stream=True,
            timeout=120
        )
        
        if response.status_code == 200:
            print("🔄 Streaming response:")
            for line in response.iter_lines(decode_unicode=True):
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])  # Remove "data: " prefix
                        event_type = data.get("type")
                        
                        if event_type == "start":
                            print(f"🚀 Started: {data.get('user_input')}")
                        elif event_type == "step":
                            print(f"📝 Step {data.get('step')}: {data.get('action')} - {data.get('thought', '')[:100]}...")
                        elif event_type == "complete":
                            print(f"✅ Complete! Event: {data.get('event', {}).get('title', 'Not created')}")
                            break
                        elif event_type == "error":
                            print(f"❌ Error: {data.get('error')}")
                            break
                    except json.JSONDecodeError:
                        continue
        else:
            print(f"❌ Streaming failed: {response.status_code} - {response.text}")
            
    except requests.RequestException as e:
        print(f"❌ Streaming request failed: {e}")

def test_health_check():
    """Test the health check endpoint"""
    print("\n🏥 Testing Health Check")
    print("="*30)
    
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Service: {result.get('service')}")
            print(f"✅ Status: {result.get('status')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except requests.RequestException as e:
        print(f"❌ Health check request failed: {e}")

if __name__ == "__main__":
    print("🧪 Calendar Event Agent Test Suite")
    print(f"⏰ Started at: {datetime.now()}")
    
    # Test health check first
    test_health_check()
    
    # Test the agent (uncomment when you have valid calendar and user IDs)
    # test_event_agent()
    
    # Test streaming (uncomment when you have valid calendar and user IDs)
    # test_streaming_endpoint()
    
    print(f"\n✅ Tests completed at: {datetime.now()}")
    print("\n📝 Note: Update calendar_id and user_id in test cases before running full tests")