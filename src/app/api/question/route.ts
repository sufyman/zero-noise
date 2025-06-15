import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    console.log('Generating response for question:', question);

    // Create a prompt for the hosts to respond to the question
    const systemPrompt = `You are Alex and Jordan, the hosts of a tech and startup podcast. Alex has a Tim Ferriss style (practical, efficiency-focused, asks great questions) and Jordan has a Lex Fridman style (thoughtful, philosophical, deep technical insights).

Current podcast context: You were discussing consumer startup news, SEO trends, AI progress for startups, and stable diffusion models.

A listener just interrupted to ask a question. Respond as both hosts would naturally respond - with Alex going first (more practical/direct) and Jordan following up (more thoughtful/technical). Make it feel like a natural conversation continuation.

Format your response as a JSON array with objects containing "speaker" and "text" fields. Keep responses concise but insightful - aim for 2-3 exchanges total.

Example format:
[
  {"speaker": "Alex", "text": "Great question! Here's what I think..."},
  {"speaker": "Jordan", "text": "That's a fascinating point Alex raises..."}
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-realtime-preview-2024-12-17",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question from listener: "${question}"` }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response generated');
    }

    // Parse the JSON response
    let hostResponses;
    try {
      hostResponses = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse OpenAI response as JSON:', responseText);
      // Fallback: create a simple response
      hostResponses = [
        { speaker: "Alex", text: "That's a great question! Let me think about that..." },
        { speaker: "Jordan", text: "Interesting perspective. I'd add that this is a complex topic worth exploring further." }
      ];
    }

    console.log('Generated host responses:', hostResponses);

    return NextResponse.json({ 
      responses: hostResponses,
      originalQuestion: question 
    });

  } catch (error) {
    console.error('OpenAI question processing error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Question response endpoint is running' });
} 