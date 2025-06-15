import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const model = 'gpt-4o-mini-search-preview';

    // Record start time before calling OpenAI
    const startTime = Date.now();

    // Call OpenAI with web search tool
    const response = await client.chat.completions.create({
      model,
      web_search_options: {
        search_context_size: "high",
    },
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    });

    

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      response: (response.choices[0]?.message?.content ?? '').replace(/\\n/g, '\n'),
      usage: response.usage,
      model,
      durationMs,
      rawResponse: {
        initialResponse: response,
      },
    });

  } catch (error) {
    console.error('Web search test error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}