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

## Architecture Overview

### Next.js App Router Structure
- **App Router**: Uses Next.js 15 app directory structure with React 19
- **API Routes**: RESTful endpoints in `src/app/api/` for authentication and data handling
- **Authentication**: Custom email-only auth system using local file storage (max 100 users)
- **Data Storage**: Local JSONL files in `signup-data/` directory for user data and preferences

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

### Google Sheets Integration
- **Webhook Approach**: Uses Google Apps Script webhook due to Node.js v22 compatibility issues
- **Backup System**: Local JSONL files serve as primary storage with sheets as secondary
- **Scripts**: `google-apps-script-webhook.js` contains the webhook code for Google Sheets

### PWA Configuration
- **Manifest**: `/public/manifest.json` for mobile app installation
- **Responsive**: Mobile-first design with touch-friendly interactions
- **Dark Theme**: Default dark theme with proper contrast ratios

## File Organization Patterns

### API Route Structure
```
src/app/api/
├── auth/route.ts       # Authentication status checking
├── login/route.ts      # User login endpoint
├── logout/route.ts     # User logout endpoint
├── signup/route.ts     # User registration endpoint
└── preferences/route.ts # User preferences storage
```

### Authentication Flow
1. User signs up via modal → saves to local file
2. User logs in with email → creates session
3. Session validated via cookies on protected routes
4. User data managed through `src/lib/auth.ts` utilities

### Component Patterns
- Use `@/` path alias for imports
- Components follow the compound component pattern for complex UI
- Error boundaries and loading states handled at component level
- Responsive design using Tailwind breakpoints

## Environment Configuration

Required environment variables for production:
```env
GOOGLE_SHEETS_WEBHOOK_URL=    # Google Apps Script webhook URL
NEXTAUTH_URL=                 # App URL for authentication
NEXTAUTH_SECRET=              # Session signing secret
```

## Development Workflow

1. **Local Development**: Uses local file storage for immediate functionality
2. **Google Sheets Integration**: Optional webhook setup for data synchronization  
3. **Authentication Testing**: Test users available in `signup-data/signups.jsonl`
4. **Linting**: Always run `npm run lint` after code changes
5. **Build Verification**: Run `npm run build` before deployment

## Key Implementation Details

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

This codebase is optimized for rapid development and deployment with a focus on user experience and maintainability.