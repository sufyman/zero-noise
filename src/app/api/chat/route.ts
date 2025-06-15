import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, context, systemPrompt } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful AI assistant. Provide clear, concise responses.'
        },
        {
          role: 'user',
          content: context ? `Context: ${context}\n\nQuestion: ${message}` : message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    // Try to split response into Alex and Jordan parts if it contains both
    const alexMatch = response.match(/Alex[:\-\s]+(.*?)(?=Jordan[:\-\s]+|$)/i);
    const jordanMatch = response.match(/Jordan[:\-\s]+(.*?)(?=Alex[:\-\s]+|$)/i);

    return NextResponse.json({
      response,
      alexResponse: alexMatch ? alexMatch[1].trim() : response.split('.')[0] + '.',
      jordanResponse: jordanMatch ? jordanMatch[1].trim() : response.split('.').slice(1).join('.') || 'That\'s a great point!'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 