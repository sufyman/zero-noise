import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface UserProfile {
  interests: string[];
  contentFormat: string;
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  personalityTraits: string[];
  communicationStyle: string;
  learningGoals: string[];
  profileSummary: string;
  podcastPersona?: string;
}

interface PodcastSegment {
  speaker: string;
  text: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userProfile, topics, contentType = 'daily_update' } = await request.json();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    console.log('Generating podcast for user profile:', userProfile);

    // Generate podcast content based on user profile
    const podcastTranscript = await generatePodcastTranscript(userProfile, topics, contentType);
    
    return NextResponse.json({
      success: true,
      transcript: podcastTranscript,
      metadata: {
        generatedAt: new Date().toISOString(),
        userProfile: {
          style: userProfile.podcastStyle,
          duration: userProfile.dailyTime,
          interests: userProfile.interests
        },
        segments: podcastTranscript.length
      }
    });

  } catch (error) {
    console.error('Podcast generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate podcast', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

async function generatePodcastTranscript(
  userProfile: UserProfile, 
  topics: string[] = [], 
  contentType: string
): Promise<PodcastSegment[]> {
  
  // Create content type specific instructions
  const contentTypeInstructions = {
    'daily_update': 'Create a daily news-style update covering the latest developments',
    'deep_dive': 'Provide an in-depth analysis with detailed explanations and context',
    'news_summary': 'Summarize the most important news and trends in a concise format',
    'skill_focused': 'Focus on practical skills and actionable learning opportunities'
  };

  const contentInstruction = contentTypeInstructions[contentType as keyof typeof contentTypeInstructions] || contentTypeInstructions['daily_update'];

  // Create personalized system prompt based on user profile
  const systemPrompt = `You are Alex and Jordan, the hosts of a personalized tech podcast. Generate a podcast transcript based on the user's specific preferences and profile.

USER PROFILE:
- Interests: ${userProfile.interests.join(', ')}
- Podcast Style: ${userProfile.podcastStyle}
- Daily Time: ${userProfile.dailyTime} minutes
- Communication Style: ${userProfile.communicationStyle}
- Learning Goals: ${userProfile.learningGoals.join(', ')}
- Personality Traits: ${userProfile.personalityTraits.join(', ')}
- Profile Summary: ${userProfile.profileSummary}

HOST PERSONAS:
- Alex: Practical, efficiency-focused, Tim Ferriss style - asks great questions, focuses on actionable insights
- Jordan: Thoughtful, philosophical, Lex Fridman style - provides deep technical insights and broader context

CONTENT REQUIREMENTS:
- Content Type: ${contentType} - ${contentInstruction}
- Duration: Approximately ${userProfile.dailyTime} minutes of content
- Style: ${userProfile.podcastStyle} 
- Topics: Focus on ${userProfile.interests.join(', ')}
- Goals: Help the user achieve ${userProfile.learningGoals.join(' and ')}

Generate a podcast transcript that feels personalized for this specific user. The conversation should:
1. Reference their specific interests naturally
2. Match their preferred communication style
3. Include content that helps with their learning goals
4. Feel like it was made specifically for them
5. Follow the ${contentType} format approach

Format as a JSON array of objects with "speaker", "text", and "timestamp" fields.
Each segment should be 15-30 seconds of speaking time.
Make it feel like a natural conversation between Alex and Jordan.

Topics to cover: ${topics.length > 0 ? topics.join(', ') : 'Latest developments in their areas of interest'}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a ${userProfile.dailyTime}-minute personalized podcast episode for today. Make it feel like Alex and Jordan are speaking directly to this user based on their profile.` }
      ],
      temperature: 0.7,
      max_tokens: Math.min(4000, userProfile.dailyTime * 150), // Rough estimate: 150 tokens per minute
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No podcast content generated');
    }

    // Parse the JSON response
    let podcastSegments: PodcastSegment[];
    try {
      podcastSegments = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse podcast transcript as JSON:', responseText);
      
      // Fallback: create a simple structure from the response
      podcastSegments = [
        {
          speaker: "Alex",
          text: "Welcome to your personalized podcast! Today we're diving into topics that matter to you.",
          timestamp: 0
        },
        {
          speaker: "Jordan", 
          text: "That's right Alex. Based on your interests in " + userProfile.interests.join(' and ') + ", we've got some great insights to share.",
          timestamp: 10
        },
        {
          speaker: "Alex",
          text: responseText.substring(0, 200) + "...",
          timestamp: 20
        }
      ];
    }

    // Ensure timestamps are progressive
    podcastSegments.forEach((segment, index) => {
      if (segment.timestamp === undefined) {
        segment.timestamp = index * 15; // 15 seconds per segment average
      }
    });

    return podcastSegments;

  } catch (error) {
    console.error('Error generating podcast content:', error);
    
    // Fallback content based on user profile
    return generateFallbackPodcast(userProfile);
  }
}

function generateFallbackPodcast(userProfile: UserProfile): PodcastSegment[] {
  const interests = userProfile.interests.join(' and ');
  const style = userProfile.podcastStyle;
  
  return [
    {
      speaker: "Alex",
      text: `Welcome to your personalized ${userProfile.dailyTime}-minute update! I'm Alex, and I'm here with Jordan to discuss ${interests}.`,
      timestamp: 0
    },
    {
      speaker: "Jordan",
      text: `Thanks Alex. Today we're focusing on ${interests} with a ${style} approach, just the way you like it.`,
      timestamp: 15
    },
    {
      speaker: "Alex", 
      text: `Based on your profile, you're looking to ${userProfile.learningGoals[0] || 'stay updated'}, so let's dive into the latest developments.`,
      timestamp: 30
    },
    {
      speaker: "Jordan",
      text: `What's particularly interesting is how these topics connect to your goals. Let's explore the practical applications.`,
      timestamp: 45
    },
    {
      speaker: "Alex",
      text: `Perfect. And we'll make sure to keep this ${style} and focused on actionable insights you can use today.`,
      timestamp: 60
    }
  ];
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Podcast generation endpoint is running',
    supportedContentTypes: ['daily_update', 'deep_dive', 'news_summary', 'skill_focused']
  });
} 