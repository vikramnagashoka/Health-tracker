# Daily Health Log

## Overview

Daily Health Log is a Progressive Web Application (PWA) that helps users track their daily health metrics including meals, supplements, water intake, mood, and physical activity. The application features:

- **Client-side health logging** with localStorage persistence
- **Smart reminder system** with customizable notifications for pre-lunch, mid-afternoon, and dinner check-ins
- **AI-powered calorie estimation** using OpenAI integration
- **Progressive Web App** capabilities with offline support and installability
- **Progress tracking** showing daily completion percentage

The application is designed as a simple, everyday health companion that runs entirely in the browser with optional server-side AI features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Single-Page Application (SPA)**
- Pure vanilla JavaScript without frameworks to minimize complexity and dependencies
- DOM manipulation for dynamic UI updates (reminder cards, progress tracking, form state)
- Event-driven architecture using browser APIs (DOMContentLoaded, visibilitychange)

**State Management**
- Client-side state object tracking current date, logs, reminder preferences, and reminder status
- LocalStorage as the primary data persistence layer using three storage keys:
  - `healthLogs`: Daily health entries (meals, supplements, water, mood, steps)
  - `reminderPrefs`: User's customized reminder times
  - `reminderStatus`: Tracking which reminders have been completed

**Rationale**: Browser-first architecture eliminates server dependencies for core functionality, enabling offline-first usage patterns ideal for a daily logging application.

### Progressive Web App (PWA) Features

**Service Worker Implementation**
- Cache-first strategy for static assets (HTML, CSS, JS, manifest)
- Version-based cache management (`health-log-cache-v1`)
- Offline capability for all core logging features

**Installation Support**
- Web App Manifest (`manifest.webmanifest`) for add-to-homescreen functionality
- BeforeInstallPrompt event handling for custom install UI
- Theme color and display mode configured for native-like experience

**Notification System**
- Browser Notification API for reminder alerts
- Permission management with user-friendly banner for blocked notifications
- Visibility API integration to check pending reminders when app regains focus

**Rationale**: PWA approach provides app-like experience without app store distribution, crucial for a personal health tool that users need quick daily access to.

### Backend Architecture

**Minimal Express Server**
- Lightweight Node.js/Express setup primarily serving static files
- Single API endpoint: `POST /api/estimate-calories`
- CORS-enabled for potential cross-origin development/deployment scenarios

**Stateless Design**
- Server maintains no user data or session state
- All requests are independent and context-free
- No database or persistent storage on server side

**Rationale**: Stateless backend allows horizontal scaling and simplified deployment. The server exists solely to proxy AI requests, keeping sensitive API keys server-side while maintaining client independence.

### AI Integration

**OpenAI Integration**
- Uses OpenAI API for natural language meal descriptions to calorie estimates
- Structured prompting strategy requesting JSON responses for consistent parsing
- Environment variable-based API key management (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)

**Request Flow**
1. Client collects meal descriptions and optional serving sizes from form
2. POST request to `/api/estimate-calories` with meals object
3. Server constructs nutrition expert prompt with meal data
4. OpenAI returns structured JSON with per-meal and total calorie estimates
5. Client receives and displays calorie information

**Graceful Degradation**
- Empty meals return zero calories without API calls
- Application remains fully functional without AI features
- Calorie estimation is supplementary to core logging functionality

**Rationale**: AI integration adds value without creating dependency. Users can log meals with or without calorie data, and the feature enhances rather than defines the user experience.

### Data Architecture

**Client-Side Data Storage**
- LocalStorage for all user data (no server database)
- JSON serialization for complex objects (logs array, preference objects)
- Date-based organization with `state.today` as temporal anchor

**Data Structure**
```javascript
// Health logs stored as array of daily entries
logs: [
  {
    date: "YYYY-MM-DD",
    meals: { breakfast: string, lunch: string, snack: string, dinner: string },
    servingSizes: { breakfast: string, lunch: string, snack: string, dinner: string },
    calories: { breakfast: number, lunch: number, snack: number, dinner: number, totalCalories: number },
    supplements: { d3: {taken, time}, omega3: {taken, time}, iron: {taken, time} },
    fasting: { start: string, end: string, hours: number },
    waterCups: number,
    exercise: { type: string, minutes: number },
    wellbeing: { energy: number, mood: number, stress: number, notes: string },
    sleep: { hours: number, quality: number }
  }
]

// Reminder preferences map IDs to custom times
reminderPrefs: {
  preLunch: "10:45",
  midAfternoon: "14:30", 
  dinner: "19:00"
}

// Reminder status tracks completion per day
reminderStatus: {
  "2024-01-15": {
    preLunch: true,
    midAfternoon: false,
    dinner: false
  }
}
```

**Rationale**: LocalStorage-based architecture eliminates need for user accounts, authentication, and backend database. Privacy-first approach keeps all health data on user's device.

## External Dependencies

### Third-Party Services

**Replit AI Integrations (OpenAI)**
- **Purpose**: Natural language processing for calorie estimation from meal descriptions
- **Authentication**: Uses Replit AI Integrations, no personal API key required (charges billed to Replit credits)
- **Base URL**: `AI_INTEGRATIONS_OPENAI_BASE_URL` (provided by Replit)
- **API Key**: `AI_INTEGRATIONS_OPENAI_API_KEY` (provided by Replit)
- **Model**: gpt-4o-mini for cost-effective calorie estimation
- **Usage Pattern**: On-demand requests when users click "Estimate Calories" button

**Recent Changes (November 2025)**
- Added calorie estimation feature with serving size inputs for each meal (breakfast, lunch, snack, dinner)
- Integrated Replit AI Integrations for OpenAI access without personal API keys
- Added UI components for displaying per-meal calorie estimates and total daily calories
- Calorie data is persisted in localStorage alongside meal and serving size information
- Feature is optional and gracefully degrades if AI service is unavailable

### NPM Dependencies

**Production Dependencies**
- `express` (v5.1.0): Web server framework for serving static files and API endpoint
- `cors` (v2.8.5): Cross-Origin Resource Sharing middleware for API access
- `http-server` (v14.1.1): Simple static file server (likely for development)
- `openai` (v6.8.1): Official OpenAI SDK for API interactions

**Rationale**: Minimal dependency footprint with only essential packages. Express provides standard, well-supported server infrastructure. OpenAI SDK abstracts API complexity and handles authentication/request formatting.

### Browser APIs

**Core APIs Used**
- **LocalStorage API**: Primary data persistence
- **Notification API**: Reminder system
- **Service Worker API**: Offline functionality and caching
- **Fetch API**: Server communication for calorie estimates
- **Visibility API**: Detect when user returns to app to check pending reminders
- **BeforeInstallPrompt**: PWA installation flow

**Browser Compatibility Considerations**
- Modern browser assumption (ES6+, async/await, no transpilation)
- Progressive enhancement pattern (app works without notifications/service workers)
- No polyfills included, relying on evergreen browser support

### Deployment Requirements

**Environment Variables Required**
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API authentication key
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API endpoint (allows alternative providers)

**Server Requirements**
- Node.js runtime for Express server
- Port 5000 (configurable via PORT constant)
- HTTPS recommended for Service Worker and Notification API support in production

**Static Asset Hosting**
- All frontend files can be served from CDN/static host
- Server only required for AI calorie estimation feature
- Fully functional offline after initial load via service worker cache