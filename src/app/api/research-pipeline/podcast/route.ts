// src/app/api/research-pipeline/podcast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generatePodcast, PodcastfyParams } from '../../../../lib/podcastfy';

interface SearchResult {
  query: string;
  intent: string;
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  durationMs: number;
  success: boolean;
  error?: string;
}

// Mark as dynamic for long-running requests
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    console.log('🎙️ Podcast generation started');
    
    const { 
      searchResults,
      podcastName = 'Zero Noise Intelligence Brief',
      podcastTagline = 'Latest intelligence and developments',
      ttsModel = 'openai',
      wordCount = 300,
      longform = false,
      conversationStyle = 'engaging,informative,current'
    } = await request.json();

    if (!searchResults || !Array.isArray(searchResults)) {
      return NextResponse.json(
        { error: 'Search results are required and must be an array' },
        { status: 400 }
      );
    }

    // Check required environment variables
    const requiredEnvVars = {
      HUGGINGFACE_SPACE: process.env.HUGGINGFACE_SPACE,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    };

    // Check optional TTS keys based on model choice
    if (ttsModel === 'openai' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key required for OpenAI TTS model' },
        { status: 500 }
      );
    }

    if (ttsModel === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key required for ElevenLabs TTS model' },
        { status: 500 }
      );
    }

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        return NextResponse.json(
          { error: `${key} environment variable not configured` },
          { status: 500 }
        );
      }
    }

    const podcastStartTime = Date.now();
    
    const successfulResults = searchResults.filter((r: SearchResult) => r.success);
    
    if (successfulResults.length === 0) {
      return NextResponse.json(
        { error: 'No successful search results available for podcast generation' },
        { status: 400 }
      );
    }
    
    // Transform intelligence results into text input for Podcastfy
    const intelligenceText = successfulResults
      .map((r: SearchResult) => `INTELLIGENCE: ${r.query}\nFINDINGS: ${r.response}`)
      .join('\n\n');

    console.log(`🎙️ Generating podcast audio from ${successfulResults.length} intelligence sources...`);
    console.log(`📏 Intelligence text length: ${intelligenceText.length} characters`);
    console.log(`🎯 TTS Model: ${ttsModel}`);
    console.log(`📊 Word Count Target: ${wordCount}`);

    // Prepare Podcastfy parameters (removed longform parameter)
    const podcastfyParams: PodcastfyParams = {
      textInput: intelligenceText,
      geminiKey: process.env.GEMINI_API_KEY!,
      openaiKey: process.env.OPENAI_API_KEY,
      elevenlabsKey: process.env.ELEVENLABS_API_KEY,
      wordCount,
      conversationStyle,
      rolesPerson1: 'Intelligence Analyst',
      rolesPerson2: 'Expert Commentator',
      dialogueStructure: 'Opening,Intelligence Brief,Analysis,Key Takeaways,Conclusion',
      podcastName,
      podcastTagline,
      ttsModel: ttsModel as "openai" | "edge" | "elevenlabs",
      creativity: 0.7,
      userInstructions: 'Focus on recent developments and actionable intelligence. Make it engaging and informative for professionals staying current in their field.',
      // longform parameter removed - it doesn't exist in the original Podcastfy API
    };

    console.log('📤 Sending request to Podcastfy Space...');

    // Generate the podcast audio
    const audioBuffer = await generatePodcast(podcastfyParams);
    
    const podcastGenerationTime = Date.now() - podcastStartTime;

    console.log(`✅ Podcast generation completed in ${podcastGenerationTime}ms`);
    console.log(`🎙️ Generated audio size: ${audioBuffer.length} bytes`);

    // Convert audio buffer to base64 for JSON response
    const audioBase64 = audioBuffer.toString('base64');

    // Return both audio data and transcript
    return NextResponse.json({
      success: true,
      audioData: audioBase64,
      audioSize: audioBuffer.length,
      transcript: intelligenceText,
      podcastName,
      podcastTagline,
      performance: {
        podcastGenerationTime,
        inputSearches: successfulResults.length,
        totalSearches: searchResults.length,
      },
      settings: {
        ttsModel,
        wordCount,
        conversationStyle,
      },
    });

  } catch (error) {
    console.error('💥 Podcast generation error:', error);
    
    if (error instanceof Error) {
      // Check for specific error types to provide better user feedback
      if (error.message.includes('Podcastfy API error')) {
        return NextResponse.json(
          { error: `Podcastfy Service Error: ${error.message}` },
          { status: 502 } // Bad Gateway for external service errors
        );
      }
      
      if (error.message.includes('Failed to fetch audio')) {
        return NextResponse.json(
          { error: `Audio Fetch Error: ${error.message}` },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { error: `Podcast Generation Error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred during podcast generation' },
      { status: 500 }
    );
  }
} 