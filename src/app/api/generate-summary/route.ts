import { NextRequest, NextResponse } from 'next/server';

interface OnboardingData {
  interests: string[];
  contentFormat: string;
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  personalityTraits: string[];
  communicationStyle: string;
  learningGoals: string[];
  informationPreferences: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { onboardingData }: { onboardingData: OnboardingData } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Generate a comprehensive summary using GPT-4o-mini
    const summaryPrompt = `
    Based on the following user onboarding data, create a comprehensive summary of their interests, goals, and information preferences:

    Interests: ${onboardingData.interests.join(', ')}
    Preferred Content Format: ${onboardingData.contentFormat}
    Daily Time Available: ${onboardingData.dailyTime} minutes
    Communication Style: ${onboardingData.communicationStyle}
    Learning Goals: ${onboardingData.learningGoals.join(', ')}
    Information Preferences: ${onboardingData.informationPreferences.join(', ')}
    Personality Traits: ${onboardingData.personalityTraits.join(', ')}

    Create a detailed profile summary that captures:
    1. Their core interests and why they matter
    2. Their preferred learning style and communication preferences
    3. Their goals and what they want to achieve
    4. How they like to consume information
    5. Recommendations for content types and formats

    Write this as a comprehensive paragraph that could be used to generate personalized content.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing user preferences and creating detailed user profiles for content personalization.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content || 'Unable to generate summary';

    // Save summary to file for persistence
    const summaryData = {
      timestamp: new Date().toISOString(),
      onboardingData,
      summary,
      sessionId: `summary_${Date.now()}`
    };

    return NextResponse.json({
      success: true,
      summary,
      sessionId: summaryData.sessionId
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 