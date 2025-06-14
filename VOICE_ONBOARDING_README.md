# Voice Onboarding System

## Overview

The Voice Onboarding System replaces the traditional form-based onboarding with a fully interactive voice experience. Users have conversations with AI podcast hosts who ask questions and capture responses to create personalized profiles for podcast content generation.

## System Architecture

### Components

1. **Voice Onboarding Page** (`/src/app/onboarding/page.tsx`)
   - Interactive React component with voice recording capabilities
   - Real-time audio playback and recording controls
   - Progress tracking and session management

2. **Voice Onboarding API** (`/src/app/api/voice-onboarding/route.ts`)
   - Session management for Q&A flow
   - Response storage and analysis
   - Profile generation using OpenAI GPT-4o-mini

3. **Speech-to-Text API** (`/src/app/api/speech-to-text/route.ts`)
   - Audio transcription using OpenAI Whisper
   - Supports multiple audio formats (WebM, MP3, WAV, etc.)

4. **Text-to-Speech Integration** (existing `/src/app/api/tts/route.ts`)
   - Question playback using Eleven Labs
   - Voice personality: Alex (male host)

5. **Podcast Generation API** (`/src/app/api/generate-podcast/route.ts`)
   - Creates personalized podcast transcripts from user profiles
   - Multiple content types: daily_update, deep_dive, news_summary, skill_focused

## User Flow

### 1. Authentication Check
- Verifies user is logged in
- Redirects to home if not authenticated

### 2. Session Initialization
- Creates new onboarding session with unique ID
- Loads first question from predefined set
- Auto-plays question using TTS

### 3. Interactive Q&A Loop
For each of 5 questions:
- **Question Playback**: AI host asks question via TTS
- **User Response**: User records voice response
- **Transcription**: Audio converted to text via Whisper
- **Storage**: Response stored with question context
- **Progress**: Move to next question or complete

### 4. Profile Analysis
- All responses analyzed by GPT-4o-mini
- Generates detailed user profile including:
  - Interests and topics
  - Preferred communication style
  - Learning goals
  - Personality traits
  - Podcast style preferences
  - Content duration preferences

### 5. Report Generation
- Creates comprehensive report from analysis
- Saves preferences to existing system
- Redirects to dashboard

## Question Set

The system asks 5 core questions designed to understand:

1. **Professional Interests** - What topics to cover
2. **Time Preferences** - Content duration and consumption habits  
3. **Communication Style** - How information should be presented
4. **Learning Goals** - What the user wants to achieve
5. **Personality Traits** - How to personalize the experience

## Technical Features

### Audio Handling
- **Recording**: WebM format with Opus codec
- **Playback**: Automatic TTS playback with controls
- **Processing**: Real-time transcription feedback
- **Error Handling**: Graceful fallbacks for audio issues

### AI Integration
- **OpenAI Whisper**: High-accuracy speech recognition
- **OpenAI GPT-4o-mini**: Profile analysis and content generation
- **Eleven Labs**: Natural-sounding question playback

### User Experience
- **Progressive UI**: Visual feedback for all states
- **Accessibility**: Clear instructions and status indicators
- **Error Recovery**: Retry mechanisms for failed operations
- **Mobile Support**: Touch-friendly recording controls

## API Endpoints

### POST `/api/voice-onboarding`
**Actions:**
- `start_session` - Initialize new onboarding session
- `submit_response` - Submit transcribed user response
- `get_session` - Retrieve session state
- `generate_report` - Create final user profile report

### POST `/api/speech-to-text`
**Input:** FormData with audio file
**Output:** Transcribed text with confidence score

### POST `/api/generate-podcast`
**Input:** User profile and content preferences
**Output:** Personalized podcast transcript segments

## Data Structures

### OnboardingSession
```typescript
interface OnboardingSession {
  sessionId: string;
  currentQuestionIndex: number;
  questions: Array<{
    id: number;
    question: string;
    context: string;
  }>;
  responses: Array<{
    questionId: number;
    question: string;
    response: string;
    timestamp: string;
  }>;
  userProfile: UserProfile;
}
```

### UserProfile
```typescript
interface UserProfile {
  interests: string[];
  contentFormat: string;
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  personalityTraits: string[];
  communicationStyle: string;
  learningGoals: string[];
  profileSummary: string;
  podcastPersona?: string;
}
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - Required for Whisper and GPT-4o-mini
- `ELEVENLABS_API_KEY` - Required for TTS functionality

### Browser Requirements
- **Microphone Access** - Required for voice recording
- **Modern Browser** - Support for MediaRecorder API
- **Audio Playback** - HTML5 audio support

## Error Handling

### Common Scenarios
- **Microphone Permission Denied**: Clear error message with instructions
- **Network Issues**: Retry mechanisms with user feedback
- **Transcription Failures**: Fallback to text input option
- **TTS Failures**: Visual-only question display
- **Session Timeout**: Graceful recovery with session restoration

### Fallback Mechanisms
- **Profile Analysis**: Basic text parsing if OpenAI fails
- **Content Generation**: Template-based podcast creation
- **Audio Issues**: Text-based interaction options

## Future Enhancements

### Planned Features
- **Multi-language Support** - Questions and responses in multiple languages
- **Voice Personality Selection** - Choose between different AI host voices
- **Adaptive Questions** - Dynamic question selection based on responses
- **Session Resume** - Pause and continue onboarding later
- **Advanced Analytics** - Deeper insights from voice patterns

### Technical Improvements
- **Database Integration** - Persistent session storage
- **Real-time Processing** - Streaming transcription
- **Voice Cloning** - Personalized host voices
- **Emotion Detection** - Response sentiment analysis

## Testing

### Manual Testing Checklist
- [ ] Audio recording functionality
- [ ] TTS playback quality
- [ ] Transcription accuracy
- [ ] Profile generation quality
- [ ] Error handling scenarios
- [ ] Mobile device compatibility
- [ ] Network failure recovery

### Automated Testing
- Unit tests for API endpoints
- Integration tests for full flow
- Audio processing pipeline tests
- Error scenario simulations

## Monitoring

### Key Metrics
- **Completion Rate** - Users finishing all 5 questions
- **Transcription Accuracy** - Quality of speech-to-text
- **Profile Quality** - Usefulness of generated profiles
- **Session Duration** - Time to complete onboarding
- **Error Rates** - Frequency of technical issues

### Logging
- Session lifecycle events
- Audio processing metrics
- API response times
- Error occurrences with context

## Deployment

### Requirements
- Next.js 15+ with React 19
- Node.js 18+ for API routes
- External API access (OpenAI, Eleven Labs)
- HTTPS for microphone access

### Production Considerations
- **API Rate Limits** - Implement queuing for high traffic
- **Audio Storage** - Temporary file cleanup
- **Session Management** - Memory-based storage limits
- **Security** - Audio data privacy protection 