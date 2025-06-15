# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Create production build
npm start           # Start production server
npm run lint        # Run ESLint (always run after code changes)
```

### Testing Setup
```bash
node test-google-sheets.js    # Test Google Sheets integration
node import-to-sheets.js      # Import existing signups to sheets
```

### Research Pipeline Testing
```bash
# Test research pipeline endpoints directly
curl -X POST http://localhost:3000/api/research-pipeline \
  -H "Content-Type: application/json" \
  -d '{"transcript": "your test transcript", "maxResults": 5}'

# Test individual format generation
curl -X POST http://localhost:3000/api/research-pipeline/brief
curl -X POST http://localhost:3000/api/research-pipeline/email
curl -X POST http://localhost:3000/api/research-pipeline/report
curl -X POST http://localhost:3000/api/research-pipeline/podcast
```

## Architecture Overview

### Next.js App Router Structure
- **App Router**: Uses Next.js 15 app directory structure with React 19
- **API Routes**: RESTful endpoints in `src/app/api/` for authentication and data handling
- **Authentication**: Custom email-only auth system using local file storage (max 100 users)
- **Data Storage**: Local JSONL files in `signup-data/` directory for user data and preferences
- **Research Pipeline**: AI-powered intelligence gathering system that converts conversations into multiple content formats

### Authentication System
The app uses a passwordless authentication system:
- **Signup**: Email collection with metadata tracking
- **Login**: Email-only authentication with 24-hour sessions
- **Sessions**: In-memory session management with HTTP-only cookies
- **Storage**: Local file storage in `signup-data/signups.jsonl`
- **API Endpoints**: `/api/signup`, `/api/login`, `/api/logout`, `/api/auth`

### Component Architecture
- **UI Components**: Custom component library in `src/components/ui/` using class-variance-authority
- **Modals**: Signup and login modals with proper error handling and loading states
- **Styling**: Tailwind CSS with custom design system (purple/pink gradient theme)
- **Animations**: Framer Motion for smooth interactions and micro-animations

### Key Libraries and Patterns
- **Styling**: Tailwind CSS with `tailwind-merge` and `clsx` for conditional classes
- **UI**: Radix UI primitives for accessible components
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Inter and Space Grotesk from Google Fonts
- **Animation**: Framer Motion for page transitions and interactions

### Research Pipeline Architecture
- **Intelligence Gathering**: 4-step workflow from transcript to formatted content
- **Query Extraction**: Uses GPT-4.1-mini to extract 5-10 targeted search queries from conversation transcripts
- **Parallel Web Search**: Executes searches using OpenAI's `gpt-4o-mini-search-preview` model with high-quality source filtering
- **Multi-Format Generation**: Transforms search results into brief, email, report, and podcast formats
- **Performance Tracking**: Comprehensive metrics for token usage, timing, and operation success

### External Integrations
- **OpenAI Web Search**: Primary intelligence gathering using `gpt-4o-mini-search-preview` model
- **Podcastfy.ai**: Audio podcast generation via Hugging Face Spaces integration
- **Content Generation**: Uses GPT-4.1-mini for format-specific content creation
- **Google Sheets Integration**: Uses Google Apps Script webhook due to Node.js v22 compatibility issues

### PWA Configuration
- **Manifest**: `/public/manifest.json` for mobile app installation
- **Responsive**: Mobile-first design with touch-friendly interactions
- **Dark Theme**: Default dark theme with proper contrast ratios

## File Organization Patterns

### API Route Structure
```
src/app/api/
├── auth/route.ts                    # Authentication status checking
├── login/route.ts                   # User login endpoint
├── logout/route.ts                  # User logout endpoint
├── signup/route.ts                  # User registration endpoint
├── preferences/route.ts             # User preferences storage
└── research-pipeline/
    ├── route.ts                     # Main intelligence gathering pipeline
    ├── brief/route.ts               # Generate concise intelligence briefs (300 words)
    ├── email/route.ts               # Create stakeholder email briefs (400-500 words)
    ├── report/route.ts              # Produce comprehensive reports (1500-2000 words)
    └── podcast/route.ts             # Generate audio podcasts via Podcastfy.ai
```

### Authentication Flow
1. User signs up via modal → saves to local file
2. User logs in with email → creates session
3. Session validated via cookies on protected routes
4. User data managed through `src/lib/auth.ts` utilities

### Research Pipeline Flow
1. **Transcript Input** → User provides conversation transcript via `/research` page
2. **Query Extraction** → AI extracts 5-10 intelligent search queries from transcript
3. **Parallel Intelligence Gathering** → Executes web searches with quality filtering and recency focus
4. **Multi-Format Generation** → Transforms results into brief, email, report, and podcast formats

### Component Patterns
- Use `@/` path alias for imports
- Components follow the compound component pattern for complex UI
- Error boundaries and loading states handled at component level
- Responsive design using Tailwind breakpoints

## Environment Configuration

Required environment variables for production:
```env
# Authentication
NEXTAUTH_URL=                 # App URL for authentication
NEXTAUTH_SECRET=              # Session signing secret

# External Integrations
GOOGLE_SHEETS_WEBHOOK_URL=    # Google Apps Script webhook URL
OPENAI_API_KEY=              # Required for research pipeline and content generation
HUGGINGFACE_SPACE=           # Podcastfy.ai Hugging Face space for podcast generation
GEMINI_API_KEY=              # For podcast content processing

# Optional TTS Configuration
ELEVENLABS_API_KEY=          # For high-quality voice synthesis (optional)
```

## Development Workflow

1. **Local Development**: Uses local file storage for immediate functionality
2. **Google Sheets Integration**: Optional webhook setup for data synchronization  
3. **Authentication Testing**: Test users available in `signup-data/signups.jsonl`
4. **Linting**: Always run `npm run lint` after code changes
5. **Build Verification**: Run `npm run build` before deployment

## Key Implementation Details

### Research Pipeline Logic (`lib/podcastfy.ts` & `src/app/api/research-pipeline/`)
- **Intelligence Gathering**: Parallel web search execution with performance tracking
- **Query Optimization**: AI-powered extraction focuses on actionable business intelligence
- **Content Generation**: Format-specific templates ensure professional output quality
- **Audio Processing**: Podcastfy integration supports multiple TTS models and conversation styles
- **Error Handling**: Graceful degradation with detailed error reporting and retry logic

### Authentication Logic (`src/lib/auth.ts`)
- File-based user storage with JSONL format
- In-memory session management for performance
- Automatic session cleanup (24-hour expiry)
- User lookup and validation utilities

### Modal System
- Signup and login modals share consistent design patterns
- Form validation with proper error states
- Loading states during API calls
- Success feedback with smooth transitions

### Data Flow
1. **Signup**: Modal → API → Local file → Optional webhook
2. **Login**: Modal → API → Session creation → Cookie set
3. **Auth Check**: Cookie → Session validation → User data retrieval
4. **Logout**: API call → Session cleanup → Cookie removal

### Research Pipeline Data Flow
1. **Research Input**: Transcript → `/research` page → AI query extraction
2. **Intelligence Gathering**: Parallel searches → Results aggregation → Performance metrics
3. **Format Generation**: Search results → Format-specific APIs → Structured content output
4. **Audio Generation**: Content → Podcastfy.ai → MP3 audio with base64 encoding

### Performance Characteristics (Research Pipeline)
- **Intelligence Gathering**: 30-60 seconds for 10 parallel searches
- **Format Generation**: 5-15 seconds per format (brief, email, report)
- **Podcast Generation**: 3-5 minutes depending on content length
- **Token Usage**: Comprehensive tracking across all OpenAI operations
- **Quality Focus**: Prioritizes recent information (last 6 months) from authoritative sources

This codebase combines rapid prototyping capabilities with enterprise-grade intelligence gathering, optimized for both user experience and professional content generation workflows.