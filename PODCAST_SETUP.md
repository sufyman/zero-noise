# Podcast Generation Setup

The podcast generation feature uses Podcastfy.ai (Hugging Face Space) to convert intelligence results into audio podcasts.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Podcastfy.ai Configuration
HUGGINGFACE_SPACE=https://thatupiso-podcastfy-ai-demo.hf.space
GEMINI_API_KEY=your_gemini_api_key_here

# TTS Options (choose one or more)
OPENAI_API_KEY=your_openai_key_here          # Required for OpenAI TTS
ELEVENLABS_API_KEY=your_elevenlabs_key_here  # Required for ElevenLabs TTS
```

## API Usage

### 1. Generate Intelligence Results
```bash
curl -X POST http://localhost:3000/api/research-pipeline \
  -H "Content-Type: application/json" \
  -d '{"transcript": "your intelligence topic here"}'
```

### 2. Generate Podcast Audio
```bash
curl -X POST http://localhost:3000/api/research-pipeline/podcast \
  -H "Content-Type: application/json" \
  -d '{
    "searchResults": [...],
    "podcastName": "My Intelligence Brief",
    "ttsModel": "elevenlabs",
    "wordCount": 2000,
    "longform": false
  }' \
  --output podcast.mp3
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `searchResults` | Array | Required | Intelligence results from main pipeline |
| `podcastName` | String | "Zero Noise Intelligence Brief" | Podcast title |
| `podcastTagline` | String | "Latest intelligence and developments" | Subtitle |
| `ttsModel` | String | "elevenlabs" | TTS engine: "openai", "edge", "elevenlabs" |
| `wordCount` | Number | 2000 | Target word count (500-5000) |
| `longform` | Boolean | false | true = 30+ min, false = shorter |
| `conversationStyle` | String | "engaging,informative,current" | Comma-separated style adjectives |

## TTS Model Options

- **elevenlabs**: High-quality, natural voices (requires ElevenLabs API key)
- **openai**: Good quality, faster generation (requires OpenAI API key)  
- **edge**: Free, decent quality (no API key required)

## Performance Notes

- Cold start: 30-60 seconds for first request
- Generation time: 3-5 minutes depending on content length
- Timeout: Ensure your hosting allows 10+ minute function execution
- File size: Typically 2-10MB for standard episodes

## Response

The endpoint returns an MP3 audio file directly with appropriate headers for download.

## Example Workflow

```javascript
// 1. Gather intelligence
const intelligence = await fetch('/api/research-pipeline', {
  method: 'POST',
  body: JSON.stringify({ transcript: 'AI coding tools update' })
});

// 2. Generate podcast
const podcast = await fetch('/api/research-pipeline/podcast', {
  method: 'POST',
  body: JSON.stringify({
    searchResults: intelligence.searchResults,
    podcastName: 'AI Tools Weekly',
    ttsModel: 'elevenlabs'
  })
});

// 3. Use audio
const audioBlob = await podcast.blob();
const audioUrl = URL.createObjectURL(audioBlob);
// Play in audio element or download
``` 