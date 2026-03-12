# Calendar React Native - Project Notes

## Project Architecture

This React Native app ("Friday") connects to multiple backend services:

### 1. Calendar API (Django) - Main Backend
- **Location**: `/home/ab/projects/calendar_api/`
- **Container**: `calendar_api`
- **Port**: 2010
- **URL**: `https://calendar.andrewbrowne.org/api/`
- **Handles**: Auth, events CRUD, calendars, user data

### 2. Calendar Agent (AI Chatbot) - SEPARATE PROJECT
- **Location**: `/home/ab/projects/agents_regular_python/` (NOT in calendar_api!)
- **Main file**: `calendar_agent_api.py`
- **Container**: `calendar-agent`
- **Port**: 4012
- **URL**: `https://calendar.andrewbrowne.org/agent/`
- **Endpoints**: `/chat`, `/chat/stream`, `/`
- **Uses**: Anthropic Claude API with tool calling (login, get_events, post_event, etc.)

### 3. Nginx Routing
- `/api/*` → localhost:2010 (Django calendar_api)
- `/agent/*` → localhost:4012 (AI agent)

## Docker Commands

### Build (always use --network=host)
```bash
# Calendar Agent
cd /home/ab/projects/agents_regular_python
docker build --network=host -t calendar-agent:latest .

# Calendar API
cd /home/ab/projects/calendar_api
docker build --network=host -t calendar_api:latest .
```

### Run Calendar Agent
```bash
docker run -d --name calendar-agent --network=host \
  -e ANTHROPIC_API_KEY=<key-from-agents_regular_python/.env> \
  calendar-agent:latest
```

### Rebuild & Restart Agent
```bash
docker stop calendar-agent && docker rm calendar-agent
cd /home/ab/projects/agents_regular_python
docker build --network=host -t calendar-agent:latest .
docker run -d --name calendar-agent --network=host \
  -e ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2) \
  calendar-agent:latest
```

## Android Build

Build for arm64 only (faster, avoids clang crashes):
```bash
cd /home/ab/projects/calendar_react_native/android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a
```

Install to phone:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## App Variants

- **Production**: `com.calendarreactnative` - "Friday"
- **Beta**: `com.calendarreactnative.beta` - "Friday Beta" (for testing)

## Key Files

### React Native App
- `src/services/api.ts` - Main API client
- `src/services/calendarAgentService.ts` - Chatbot API client
- `src/constants/config.ts` - API URLs and endpoints
- `src/store/slices/eventsSlice.ts` - Redux event management
- `src/services/notificationService.ts` - Push notifications (Notifee)

### Agent (in agents_regular_python)
- `calendar_agent_api.py` - Main agent with Claude tool calling
- `.env` - Contains ANTHROPIC_API_KEY
- `Dockerfile` - Builds on port 4012
