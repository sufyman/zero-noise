import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    console.log('Transcribing audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Convert the audio file to transcription using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // You can make this configurable
      response_format: "json",
      temperature: 0.2, // Lower temperature for more consistent transcription
    });

    console.log('Transcription successful:', transcription.text);

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      confidence: 1.0 // Whisper doesn't provide confidence scores, but we can assume high confidence
    });

  } catch (error) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Speech-to-text endpoint is running',
    supportedFormats: ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/webm', 'audio/ogg']
  });
} 