import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getSession } from '@/lib/auth';

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
    // Validate authentication
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId || !(await validateSession(sessionId))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const { summary, interests, preferences, step }: { 
      summary: string; 
      interests: string[]; 
      preferences: OnboardingData;
      step: 'podcast' | 'report' | 'video';
    } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    if (!step) {
      return NextResponse.json({ error: 'Step parameter is required' }, { status: 400 });
    }

    console.log(`🎯 Generating ${step} content sequentially...`);

    let content;
    switch (step) {
      case 'podcast':
        content = await generatePodcastContent(summary, interests, preferences);
        break;
      case 'report':
        content = await generateReportContent(summary, interests, preferences);
        break;
      case 'video':
        content = await generateVideoContent(summary, interests, preferences);
        break;
      default:
        return NextResponse.json({ error: 'Invalid step parameter' }, { status: 400 });
    }

    // Save generated content to Supabase
    console.log(`💾 Saving ${step} content to Supabase...`);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const saveResponse = await fetch(`${baseUrl}/api/content`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionId}`
        },
        body: JSON.stringify({
          type: step,
          data: content
        })
      });

      if (!saveResponse.ok) {
        console.error('Failed to save content to Supabase:', await saveResponse.text());
        // Continue without failing the whole request
      } else {
        console.log(`✅ ${step} content saved to Supabase successfully`);
      }
    } catch (saveError) {
      console.error('Error saving content to Supabase:', saveError);
      // Continue without failing the whole request
    }

    return NextResponse.json({
      success: true,
      step,
      content,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generatePodcastContent(summary: string, interests: string[], preferences: OnboardingData) {
  // Use the existing generate-podcast API internally
  const podcastResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-podcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userProfile: {
        interests,
        contentFormat: preferences.contentFormat,
        dailyTime: preferences.dailyTime,
        podcastStyle: preferences.podcastStyle,
        preferredSpeed: preferences.preferredSpeed,
        personalityTraits: preferences.personalityTraits,
        communicationStyle: preferences.communicationStyle,
        learningGoals: preferences.learningGoals,
        profileSummary: summary
      },
      contentType: 'daily_update'
    })
  });

  if (!podcastResponse.ok) {
    throw new Error('Failed to generate podcast content');
  }

  const podcastData = await podcastResponse.json();
  
  return {
    title: `Strategic Insights: ${interests.slice(0, 2).join(' & ')} Deep Dive`,
    description: `An in-depth ${preferences.dailyTime}-minute analysis of cutting-edge developments in ${interests.slice(0, 2).join(' and ')}, featuring expert insights and actionable strategies.`,
    script: podcastData.transcript,
    audioUrl: null,
    segments: podcastData.transcript || []
  };
}

async function generateReportContent(summary: string, interests: string[], preferences: OnboardingData) {
  const reportPrompt = `
    You are a senior strategic analyst creating a comprehensive market intelligence report. This report must be DETAILED and COMPREHENSIVE - aim for 2000-3000 words with substantive analysis.

    USER CONTEXT:
    - Primary Interest: ${interests[0]}
    - Communication Style: ${preferences.communicationStyle}
    - Learning Goals: ${preferences.learningGoals.join(', ')}

    CRITICAL REQUIREMENT: This must be a COMPREHENSIVE, DETAILED report with substantive analysis and insights.

    Write a strategic intelligence report with the following structure. Make each section detailed and insightful:

    # EXECUTIVE SUMMARY
    Comprehensive overview covering:
    - Critical market findings and business implications
    - Key competitive dynamics and market forces
    - Major opportunities and strategic risks
    - Essential recommended actions
    - Timeline expectations for market evolution

    # MARKET LANDSCAPE ANALYSIS
    Detailed analysis covering:
    - Current market size, growth rates, and projections
    - Analysis of major market players and their strategies
    - Recent M&A activity and strategic partnerships
    - Regulatory environment and policy impacts
    - Geographic distribution and technology adoption

    # TREND ANALYSIS
    Analyze 4-5 major trends with detail:
    - Current market state and drivers
    - Companies and examples driving each trend
    - Impact data and growth projections
    - Adoption timelines and strategic implications

    # COMPETITIVE INTELLIGENCE
    Strategic competitive analysis:
    - Profiles of market leaders and their strategies
    - Emerging disruptors and value propositions
    - Competitive positioning and differentiation
    - Strategic vulnerabilities and opportunities

    # TECHNOLOGY AND INNOVATION
    Innovation analysis:
    - Current technology state and capabilities
    - Breakthrough innovations and potential
    - Investment flows and development timelines
    - Patent landscapes and IP trends

    # STRATEGIC RECOMMENDATIONS
    Actionable recommendations:
    - Specific strategies for market participants
    - Investment priorities and resource allocation
    - Implementation approaches and timelines
    - Success metrics and performance indicators

    # FUTURE OUTLOOK
    Forward-looking analysis:
    - 12-month market predictions
    - Scenario planning (optimistic, realistic, pessimistic)
    - Long-term evolution and positioning strategies

    WRITING REQUIREMENTS:
    - Use specific data points, statistics, and financial metrics
    - Reference real companies, products, and recent initiatives
    - Include recent developments from 2024-2025
    - Provide concrete examples and case studies
    - Write in ${preferences.communicationStyle.toLowerCase()} style
    - Ensure each section is substantial and detailed
    - Total target: 2000-3000 words with high-quality analysis

    Context: Current date is December 2024. Focus on recent market developments and emerging trends in ${interests[0]}.
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a senior strategic analyst specializing in comprehensive market intelligence reports. You excel at creating detailed, long-form analysis that provides substantial value to executive audiences. Your reports are known for being thorough, data-rich, and actionable. Always write comprehensive, detailed sections that meet the specified word count requirements.'
        },
        { role: 'user', content: reportPrompt }
      ],
      max_tokens: 4000, // Balanced for quality and speed
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    // Fallback to GPT-4o-mini with same comprehensive prompt
    const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a senior strategic analyst creating comprehensive, long-form intelligence reports. Your reports must be detailed and substantial, meeting specified word count requirements for each section.'
          },
          { role: 'user', content: reportPrompt }
        ],
        max_tokens: 8000, // Increased for longer content
        temperature: 0.7,
      }),
    });

    if (!fallbackResponse.ok) {
      throw new Error('Failed to generate report content');
    }

    const data = await fallbackResponse.json();
    const content = data.choices[0]?.message?.content || 'Report content unavailable';

    return {
      title: `Strategic Intelligence Report: ${interests[0]} - Comprehensive Market Analysis & Strategic Outlook`,
      content,
      url: `/reports/comprehensive-${Date.now()}`
    };
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || 'Report content unavailable';

  return {
    title: `Strategic Intelligence Report: ${interests[0]} - Comprehensive Market Analysis & Strategic Outlook`,
    content,
    url: `/reports/comprehensive-${Date.now()}`
  };
}

async function generateVideoContent(summary: string, interests: string[], preferences: OnboardingData) {
  const videoPrompt = `
    You are a world-class content creator specializing in sophisticated short-form video content for business professionals.

    USER PROFILE: ${summary}
    PRIMARY INTERESTS: ${interests.join(', ')}
    COMMUNICATION STYLE: ${preferences.communicationStyle}

    Create an advanced 60-90 second video script with the following requirements:

    STRUCTURE:
    - Hook (10-15s): Surprising fact or contrarian insight that immediately grabs attention
    - Problem Setup (15-20s): Define the challenge or opportunity most people miss
    - Solution/Insight (20-30s): Your unique perspective or framework
    - Evidence (15-20s): Data, examples, or case studies that support your point
    - Call-to-Action (10-15s): Clear next step for deeper engagement

    CONTENT REQUIREMENTS:
    - Start with a counterintuitive or surprising statement
    - Include specific data points or statistics
    - Reference real companies or examples
    - Provide a memorable framework or concept
    - End with actionable advice

    VISUAL ELEMENTS:
    - Specify key visual cues for each segment
    - Include data visualizations or graphics
    - Suggest on-screen text or animations
    - Consider visual metaphors or comparisons

    Format as a detailed script with:
    - Timestamp ranges
    - Spoken content
    - Visual descriptions
    - On-screen text suggestions
    - Emotional tone for each segment

    Make it feel like premium content that provides genuine value, not generic social media advice.
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
          content: 'You are a world-class content creator specializing in sophisticated short-form video content for business professionals.'
        },
        { role: 'user', content: videoPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate video content');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || 'Video content unavailable';

  // Parse the content to extract scenes
  const scenes = parseVideoScenes(content, interests);

  return {
    title: `The ${interests[0]} Insight Everyone's Missing`,
    transcript: content,
    scenes
  };
}

function parseVideoScenes(content: string, interests: string[]) {
  const scenes = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for timestamp patterns
    const timestampMatch = trimmed.match(/(\d+)\s*-\s*(\d+)s?:?\s*(.+)/);
    if (timestampMatch) {
      const duration = parseInt(timestampMatch[2]) - parseInt(timestampMatch[1]);
      scenes.push({
        text: timestampMatch[3].trim(),
        duration: duration > 0 ? duration : 10,
        emotion: inferEmotion(timestampMatch[3])
      });
    }
  }

  // Fallback scenes if parsing fails
  if (scenes.length === 0) {
    return [
      { text: `The ${interests[0]} breakthrough that's reshaping everything`, duration: 15, emotion: 'excited' },
      { text: `While everyone focuses on obvious trends, smart professionals are positioning here`, duration: 15, emotion: 'mysterious' },
      { text: `Here's the strategic framework that changes everything`, duration: 15, emotion: 'confident' },
      { text: `The data reveals something most analysts completely miss`, duration: 15, emotion: 'analytical' },
      { text: `Your competitive advantage starts with understanding this`, duration: 15, emotion: 'urgent' },
      { text: `Ready to dive deeper? The implications are massive`, duration: 15, emotion: 'engaging' }
    ];
  }

  return scenes.slice(0, 6);
}

function inferEmotion(text: string): string {
  const emotionKeywords = {
    excited: ['breakthrough', 'revolutionary', 'amazing', 'incredible'],
    mysterious: ['secret', 'hidden', 'behind', 'everyone', 'smart'],
    analytical: ['data', 'research', 'analysis', 'study', 'reveals'],
    confident: ['framework', 'strategy', 'advantage', 'positioning'],
    urgent: ['now', 'immediately', 'quickly', 'right now'],
    engaging: ['ready', 'dive', 'explore', 'discover']
  };

  const lowerText = text.toLowerCase();
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return emotion;
    }
  }

  return 'engaging';
} 