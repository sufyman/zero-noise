import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication (optional for TTS, but helpful for saving to user data)
    const sessionId = request.cookies.get('session')?.value;
    let userId: string | null = null;
    
    if (sessionId && (await validateSession(sessionId))) {
      const session = getSession(sessionId);
      if (session) {
        userId = session.email;
      }
    }

    // Handle malformed JSON requests
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      console.error('Invalid JSON in TTS request:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { text, voiceId = 'pNInz6obpgDQGcFmaJgB', segmentId, saveToProfile = false } = requestData;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    console.log('Generating speech for text:', text.substring(0, 100) + '...');
    console.log('Using voice ID:', voiceId);
    console.log('API Key available:', !!process.env.ELEVENLABS_API_KEY);

    // Use direct HTTP call instead of SDK to avoid client issues
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Check for quota exceeded error
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail?.status === 'quota_exceeded') {
          return NextResponse.json({ 
            error: 'TTS quota exceeded', 
            message: 'Voice generation temporarily unavailable. Text content is still available.',
            quotaExceeded: true 
          }, { status: 402 });
        }
      } catch {
        // If parsing fails, continue with original error
      }
      
      throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    console.log('Audio generation successful, buffer size:', audioBuffer.length);

    // Save audio to user profile if requested and user is authenticated
    if (saveToProfile && userId && segmentId) {
      try {
        const audioBase64 = audioBuffer.toString('base64');
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        const saveResponse = await fetch(`${baseUrl}/api/content`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': `session=${sessionId}`
          },
          body: JSON.stringify({
            audioFiles: {
              [segmentId]: `data:audio/mpeg;base64,${audioBase64}`
            }
          })
        });

        if (saveResponse.ok) {
          console.log(`✅ Audio file saved to profile for segment: ${segmentId}`);
        } else {
          console.error('Failed to save audio to profile:', await saveResponse.text());
        }
      } catch (saveError) {
        console.error('Error saving audio to profile:', saveError);
        // Continue without failing the whole request
      }
    }

    // Return audio as response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'ElevenLabs TTS endpoint is running' });
} 