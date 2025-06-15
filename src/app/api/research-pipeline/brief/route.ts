import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(request: NextRequest) {
  try {
    console.log('📄 Brief generation started');
    
    const { searchResults } = await request.json();

    if (!searchResults || !Array.isArray(searchResults)) {
      return NextResponse.json(
        { error: 'Search results are required and must be an array' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const briefStartTime = Date.now();
    
    const successfulResults = searchResults.filter((r: SearchResult) => r.success);
    const searchResultsText = successfulResults
      .map((r: SearchResult) => `QUERY: ${r.query}\nINTENT: ${r.intent}\nRESULT:\n${r.response}\n---`)
      .join('\n\n');

    console.log(`📝 Generating brief from ${successfulResults.length} successful searches...`);

    const briefPrompt = `Create a concise intelligence brief from these search results. Focus on the most important recent developments and key insights.

INTELLIGENCE RESULTS:
${searchResultsText}

BRIEF FORMAT:
- **Key Developments**: 2-3 most significant recent findings
- **Current Status**: What's happening now
- **Notable Changes**: What's new or different
- **Next Steps/Monitoring**: What to watch for

BRIEF REQUIREMENTS:
- Keep it concise (max 300 words)
- Lead with the most impactful information
- Use bullet points for easy scanning
- Emphasize recency and changes
- Include clear, actionable insights

Generate a focused intelligence brief that someone could read in under 2 minutes.`;

    const briefResponse = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: briefPrompt,
        },
      ],
      temperature: 0.2,
    });

    const briefGenerationTime = Date.now() - briefStartTime;
    const brief = briefResponse.choices[0]?.message?.content || '';

    console.log(`✅ Brief generation completed in ${briefGenerationTime}ms`);
    console.log(`📄 Generated brief length: ${brief.length} characters`);

    return NextResponse.json({
      success: true,
      brief,
      performance: {
        briefGenerationTime,
        inputSearches: successfulResults.length,
        totalSearches: searchResults.length,
      },
      usage: {
        briefTokens: briefResponse.usage?.total_tokens || 0,
      },
    });

  } catch (error) {
    console.error('💥 Brief generation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Brief Generation Error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 