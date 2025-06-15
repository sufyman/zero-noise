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
    console.log('📧 Email brief generation started');
    
    const { searchResults, recipient = 'team' } = await request.json();

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

    const emailStartTime = Date.now();
    
    const successfulResults = searchResults.filter((r: SearchResult) => r.success);
    const searchResultsText = successfulResults
      .map((r: SearchResult) => `QUERY: ${r.query}\nINTENT: ${r.intent}\nRESULT:\n${r.response}\n---`)
      .join('\n\n');

    console.log(`📝 Generating email brief from ${successfulResults.length} successful searches...`);

    const emailPrompt = `Create a professional email brief from these intelligence results. Format it as a complete email that could be sent to keep stakeholders informed.

INTELLIGENCE RESULTS:
${searchResultsText}

EMAIL STRUCTURE:
- Subject line (concise, attention-grabbing)
- Brief opening paragraph explaining the purpose
- Key findings organized clearly
- Actionable insights or recommendations
- Professional closing

EMAIL REQUIREMENTS:
- Professional business tone
- Easy to scan and read on mobile
- Highlight the most important information first
- Use clear headings and bullet points
- Include context for why this matters
- Keep to 400-500 words maximum
- Focus on recent developments and changes

Generate a complete email brief that busy executives could quickly understand and act upon.`;

    const emailResponse = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: emailPrompt,
        },
      ],
      temperature: 0.3,
    });

    const emailGenerationTime = Date.now() - emailStartTime;
    const emailBrief = emailResponse.choices[0]?.message?.content || '';

    console.log(`✅ Email brief generation completed in ${emailGenerationTime}ms`);
    console.log(`📧 Generated email length: ${emailBrief.length} characters`);

    return NextResponse.json({
      success: true,
      emailBrief,
      performance: {
        emailGenerationTime,
        inputSearches: successfulResults.length,
        totalSearches: searchResults.length,
      },
      usage: {
        emailTokens: emailResponse.usage?.total_tokens || 0,
      },
    });

  } catch (error) {
    console.error('💥 Email brief generation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Email Brief Generation Error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 