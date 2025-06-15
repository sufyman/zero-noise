import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { uploadFile, getPresignedUrl } from '@/lib/r2';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // Handle malformed JSON requests
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      console.error('Invalid JSON in TTS request:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { text, voiceId = 'pNInz6obpgDQGcFmaJgB' } = requestData;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    console.log('Generating speech for text:', text.substring(0, 100) + '...');
    console.log('Using voice ID:', voiceId);

    // Generate speech using ElevenLabs  
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      modelId: "eleven_multilingual_v2"
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    console.log('Audio generation successful, buffer size:', audioBuffer.length);

    // Upload to R2 storage
    let r2Key = '';
    let r2Url = '';
    let r2UploadStatus = 'failed';
    
    try {
      r2Key = `audio-${Date.now()}.mp3`;
      console.log('🗄️ Uploading audio to R2 with key:', r2Key);
      
      await uploadFile(r2Key, audioBuffer, 'audio/mpeg');
      
      // Generate signed URL (expires in 24 hours)
      r2Url = await getPresignedUrl(r2Key, 86400);
      r2UploadStatus = 'success';
      
      console.log('✅ R2 upload successful, signed URL generated:', r2Url.split('?')[0] + '?[SIGNED]');
    } catch (r2Error) {
      console.error('❌ R2 upload failed:', r2Error);
      // Don't fail the request - continue with audio response
    }

    // Return audio as response (maintain existing functionality)
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        // Add R2 information as headers
        'X-R2-Key': r2Key,
        'X-R2-Url': r2Url,
        'X-R2-Upload-Status': r2UploadStatus,
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