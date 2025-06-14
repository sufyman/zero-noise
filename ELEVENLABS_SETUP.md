# ElevenLabs Voice Integration Setup

This project now includes ElevenLabs text-to-speech integration to generate real voice audio for the podcast feature.

## Setup Instructions

### 1. Get ElevenLabs API Key

1. Sign up at [ElevenLabs.io](https://elevenlabs.io)
2. Navigate to your profile settings
3. Generate an API key
4. Copy the API key for the next step

### 2. Configure Environment Variables

Create a `.env.local` file in your project root and add:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

Replace the API keys with your actual keys:
- **ElevenLabs API key**: From [elevenlabs.io](https://elevenlabs.io) profile settings
- **OpenAI API key**: From [platform.openai.com](https://platform.openai.com/api-keys)

### 3. Voice Configuration

The podcast uses two distinct voices for a natural conversation:

- **Alex**: `pNInz6obpgDQGcFmaJgB` (Adam - deep, clear male voice)
- **Jordan**: `EXAVITQu4vr4xnSDxMaL` (Bella - clear, professional female voice)

You can change these voices by:

1. Getting available voices from ElevenLabs dashboard
2. Updating the `voices` object in `src/app/dashboard/page.tsx`

### 4. Features

- **Dual-voice podcast**: Separate AI voices for Alex and Jordan speakers
- **Natural conversation**: Speaker names removed from audio for smooth listening
- **Progressive generation**: Shows progress as each voice segment is generated
- **Real-time audio generation**: Click the play button to generate audio from the podcast script
- **Speed control**: Adjust playback speed (affects voice generation)
- **Interactive Q&A**: Click "Ask Question" to interrupt hosts with your own questions
- **Speech recognition**: Speak your question or type it as fallback
- **AI-powered responses**: OpenAI generates contextual responses from both hosts
- **Seamless experience**: Hosts respond naturally in their characteristic styles
- **Loading states**: Visual feedback with progress bar during audio generation

### 5. Voice Models

The integration uses:
- **Model**: `eleven_multilingual_v2` (supports multiple languages and accents)
- **Voice Settings**:
  - Stability: 0.75
  - Similarity Boost: 0.75
  - Style: Dynamic based on speed setting
  - Speaker Boost: Enabled

### 6. API Endpoints

- `POST /api/tts` - Generate speech from text
- Parameters:
  - `text`: The text to convert to speech
  - `voiceId`: ElevenLabs voice identifier
  - `speed`: Playback speed (affects voice characteristics)

### 7. Error Handling

The integration includes error handling for:
- Missing API key
- Invalid voice IDs
- Network errors
- Audio generation failures

### 8. Caching

Generated audio is cached for 1 hour to improve performance and reduce API calls.

## Usage

### Basic Podcast Listening
1. Navigate to the dashboard
2. Click on the podcast format
3. Click the play button to generate and play audio
4. Use the speed controls to adjust playback
5. View the transcript while listening

### Interactive Q&A Feature
1. **While listening**, click "Ask Question" to interrupt the hosts
2. **Speak your question** when you see "🎤 Listening for your question..."
3. **Watch the hosts respond** - they'll pause and answer your question naturally
4. **Continue listening** to their AI-generated responses with full audio

### Voice Experience
- **Alex** responds first with practical, Tim Ferriss-style insights
- **Jordan** follows up with thoughtful, Lex Fridman-style technical depth
- Responses are contextual to your question and the current podcast topics

## Troubleshooting

- **No audio plays**: Check that your ElevenLabs API key is correctly set
- **Generation fails**: Verify your ElevenLabs account has sufficient credits
- **Slow generation**: This is normal for longer texts; audio generation takes time

## Development Notes

The ElevenLabs integration is implemented in:
- `/api/tts/route.ts` - API endpoint for text-to-speech
- `dashboard/page.tsx` - Frontend integration and audio controls 