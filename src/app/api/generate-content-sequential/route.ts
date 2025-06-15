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
    You are a world-class strategic analyst creating a comprehensive intelligence report for a sophisticated professional audience.

    USER PROFILE: ${summary}
    PRIMARY INTERESTS: ${interests.join(', ')}
    COMMUNICATION STYLE: ${preferences.communicationStyle}
    LEARNING GOALS: ${preferences.learningGoals.join(', ')}

    Create a comprehensive strategic intelligence report with the following structure:

    # EXECUTIVE SUMMARY
    - 3-4 key findings that will reshape thinking
    - Strategic implications and market impact
    - Critical decisions required in next 6-12 months

    # MARKET LANDSCAPE ANALYSIS
    - Current market state with specific data points
    - Key players and their strategic positions
    - Recent developments and their significance

    # TREND ANALYSIS
    - 3-5 major trends with evidence and examples
    - Underlying drivers and mechanisms
    - Interconnections between trends

    # DEEP DIVE SECTIONS
    - Detailed analysis of 2-3 critical areas
    - Case studies with real companies/examples
    - Technical explanations made accessible

    # EXPERT PERSPECTIVES
    - Industry leader insights and predictions
    - Contrarian viewpoints with reasoning
    - Academic and research perspectives

    # PREDICTIVE ANALYSIS
    - 12-18 month outlook with scenarios
    - Risk assessment and mitigation strategies
    - Opportunity identification

    # STRATEGIC RECOMMENDATIONS
    - Specific, actionable advice
    - Implementation frameworks
    - Success metrics and milestones

    # RESOURCES AND FURTHER READING
    - Key sources and references
    - Recommended follow-up research
    - Expert contacts and thought leaders

    Requirements:
    - Include specific statistics and data points
    - Reference real companies and initiatives
    - Provide contrarian analysis where appropriate
    - Focus on actionable intelligence
    - Maintain analytical rigor throughout
    - Write for ${preferences.communicationStyle} communication style
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
          content: 'You are a world-class strategic analyst and researcher with deep expertise across multiple industries. Create comprehensive, actionable intelligence reports that provide genuine value to sophisticated professionals.'
        },
        { role: 'user', content: reportPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    // Fallback to GPT-4o-mini
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
            content: 'You are a world-class strategic analyst and researcher. Create comprehensive, actionable intelligence reports.'
          },
          { role: 'user', content: reportPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!fallbackResponse.ok) {
      throw new Error('Failed to generate report content');
    }

    const data = await fallbackResponse.json();
    const content = data.choices[0]?.message?.content || 'Report content unavailable';

    return {
      title: `Strategic Intelligence Report: ${interests[0]} Market Analysis & Future Outlook`,
      content,
      url: `/reports/sequential-${Date.now()}`
    };
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || 'Report content unavailable';

  return {
    title: `Strategic Intelligence Report: ${interests[0]} Market Analysis & Future Outlook`,
    content,
    url: `/reports/sequential-${Date.now()}`
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