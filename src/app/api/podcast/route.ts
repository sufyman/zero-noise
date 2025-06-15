import { NextRequest, NextResponse } from 'next/server';
import { generatePodcast } from '../../../lib/podcastfy';

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: NextRequest) {
  try {
    const { searchResults, ttsModel = 'elevenlabs' } = await request.json();

    if (!searchResults || !Array.isArray(searchResults)) {
      return NextResponse.json(
        { error: 'Search results are required' },
        { status: 400 }
      );
    }

    // Check required environment variables
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Check TTS-specific API keys
    if (ttsModel === 'openai' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY required for OpenAI TTS' },
        { status: 500 }
      );
    }

    if (ttsModel === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY required for ElevenLabs TTS' },
        { status: 500 }
      );
    }

    // Transform search results into podcast text
    const successfulResults = searchResults.filter((r: any) => r.success);
    const podcastText = successfulResults
      .map((r: any) => `Topic: ${r.query}\n\nFindings: ${r.response}`)
      .join('\n\n---\n\n');

    // Generate the podcast
    const audioBuffer = await generatePodcast({
      textInput: podcastText,
      geminiKey: process.env.GEMINI_API_KEY,
      openaiKey: process.env.OPENAI_API_KEY,
      elevenlabsKey: process.env.ELEVENLABS_API_KEY,
      wordCount: 300,
      conversationStyle: 'engaging,informative,professional',
      rolesPerson1: 'Intelligence Analyst',
      rolesPerson2: 'Expert Commentator',
      dialogueStructure: 'Opening,Intelligence Brief,Analysis,Key Takeaways,Conclusion',
      podcastName: 'Zero Noise Intelligence Brief',
      podcastTagline: 'Latest intelligence and developments',
      ttsModel: ttsModel as "openai" | "edge" | "elevenlabs",
      creativity: 0.7,
      userInstructions: 'Focus on recent developments and actionable intelligence. Keep it concise and professional.'
    });

    // Return audio as base64
    const audioBase64 = audioBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      audioData: audioBase64,
      audioSize: audioBuffer.length,
      sourcesUsed: successfulResults.length,
      totalSources: searchResults.length,
    });

  } catch (error) {
    console.error('Podcast generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate podcast' },
      { status: 500 }
    );
  }
} 