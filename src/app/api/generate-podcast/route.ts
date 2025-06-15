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

    console.log('Generating enhanced podcast for user profile:', userProfile);

    // Generate sophisticated podcast content based on user profile
    const podcastTranscript = await generateAdvancedPodcastTranscript(userProfile, topics, contentType);
    
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
        segments: podcastTranscript.length,
        contentQuality: 'enhanced'
      }
    });

  } catch (error) {
    console.error('Enhanced podcast generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate podcast', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

async function generateAdvancedPodcastTranscript(
  userProfile: UserProfile, 
  topics: string[] = [], 
  contentType: string
): Promise<PodcastSegment[]> {
  
  // Enhanced content type instructions with deeper analysis
  const contentTypeInstructions = {
    'daily_update': 'Create a sophisticated daily briefing that goes beyond surface-level news to reveal strategic implications, market dynamics, and forward-looking insights',
    'deep_dive': 'Provide comprehensive analysis with multiple perspectives, expert reasoning, contrarian viewpoints, and detailed exploration of underlying mechanisms',
    'news_summary': 'Distill complex developments into strategic intelligence, focusing on what matters most and why, with clear implications for decision-making',
    'skill_focused': 'Deliver advanced frameworks, methodologies, and tactical knowledge that professionals can immediately implement for competitive advantage'
  };

  const contentInstruction = contentTypeInstructions[contentType as keyof typeof contentTypeInstructions] || contentTypeInstructions['daily_update'];

  // Create highly sophisticated system prompt for premium content
  const enhancedSystemPrompt = `You are Alex and Jordan, hosts of an elite business and technology intelligence podcast that sophisticated professionals rely on for strategic insights. Your audience includes executives, investors, consultants, and strategic thinkers who expect depth, nuance, and actionable intelligence.

AUDIENCE PROFILE:
${userProfile.profileSummary}

SPECIFIC USER CONTEXT:
- Primary Interests: ${userProfile.interests.join(', ')}
- Communication Preference: ${userProfile.communicationStyle}
- Learning Objectives: ${userProfile.learningGoals.join(', ')}
- Content Duration: ${userProfile.dailyTime} minutes
- Podcast Style: ${userProfile.podcastStyle}

HOST PERSONAS (Maintain throughout):
- Alex (Tim Ferriss approach): Strategic questioner, efficiency-focused, practical frameworks, cuts through noise to identify what matters, asks penetrating questions that reveal core insights
- Jordan (Lex Fridman approach): Deep technical analysis, philosophical context, systems thinking, explores underlying principles and long-term implications

CONTENT MISSION: ${contentInstruction}

QUALITY STANDARDS FOR ELITE CONTENT:
1. **Depth Over Breadth**: Each topic should be explored with genuine insight rather than surface coverage
2. **Contrarian Analysis**: Include perspectives that challenge conventional wisdom when backed by evidence
3. **Specific Evidence**: Reference real companies, studies, data points, and expert opinions
4. **Strategic Context**: Connect developments to broader market dynamics and future implications
5. **Actionable Intelligence**: Provide frameworks, strategies, or tactical knowledge listeners can apply
6. **Current Relevance**: Focus on developments from the last 3-6 months that have lasting impact
7. **Intellectual Rigor**: Explain the reasoning behind claims, acknowledge uncertainty, present multiple scenarios

STRUCTURAL REQUIREMENTS:
- Opening: Strong hook that immediately demonstrates unique value
- 3-4 Core Segments: Each with clear transition and distinct insight
- Evidence-Based Arguments: Specific examples, data, expert perspectives
- Practical Application: How insights translate to action
- Forward-Looking Analysis: Implications and predictions with reasoning
- Closing: Clear takeaways and next steps

CONVERSATION DYNAMICS:
- Natural back-and-forth that builds on each other's insights
- Alex focuses on practical implications and strategic questions
- Jordan provides technical depth and broader context
- Both challenge assumptions and explore edge cases
- Maintain engaging dialogue without forced banter

TOPICS TO EXPLORE: ${topics.length > 0 ? topics.join(', ') : 'Latest strategic developments in their primary interest areas'}

CRITICAL FORMATTING REQUIREMENT:
Generate ONLY the actual spoken content. Do NOT include:
- Speaker names in the text (no "Alex:" or "Jordan:")
- Formatting markers (no **Title:** or **Segment 1:** etc.)
- Stage directions or descriptions
- Markdown formatting

The "text" field should contain ONLY what should be spoken aloud.

Generate a podcast transcript that feels like premium content worthy of a paid subscription. Each segment should provide genuine insight that makes the listener think "I learned something valuable I couldn't have found elsewhere."

Format as JSON array with objects containing "speaker", "text", and "timestamp" fields.
Target ${Math.ceil(userProfile.dailyTime * 4)} segments for natural pacing.

Example format:
[
  {
    "speaker": "Alex",
    "text": "Welcome to your personalized intelligence briefing. Today we're diving into developments that will reshape how you think about artificial intelligence in business.",
    "timestamp": 0
  },
  {
    "speaker": "Jordan", 
    "text": "What's particularly fascinating is how recent breakthroughs are challenging our fundamental assumptions about machine learning scalability.",
    "timestamp": 15
  }
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        { 
          role: "user", 
          content: `Create a ${userProfile.dailyTime}-minute premium podcast episode that delivers exceptional value to someone with these specific interests and goals. Focus on insights they won't find in typical business media. Make it feel personally curated for their needs.` 
        }
      ],
      temperature: 0.7,
      max_tokens: Math.min(4000, userProfile.dailyTime * 200), // More tokens for richer content
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No podcast content generated');
    }

    // Enhanced parsing with better error handling
    let podcastSegments: PodcastSegment[];
    try {
      // Try to parse as JSON first
      podcastSegments = JSON.parse(responseText);
      
      // Validate structure
      if (!Array.isArray(podcastSegments) || podcastSegments.length === 0) {
        throw new Error('Invalid podcast structure');
      }

      // Ensure all segments have required fields
      podcastSegments = podcastSegments.map((segment, index) => ({
        speaker: segment.speaker || (index % 2 === 0 ? 'Alex' : 'Jordan'),
        text: segment.text || 'Content unavailable',
        timestamp: segment.timestamp !== undefined ? segment.timestamp : index * 15
      }));

    } catch {
      console.log('JSON parsing failed, attempting text-based extraction');
      
      // Fallback: parse text format
      podcastSegments = parseTextFormatPodcast(responseText, userProfile);
    }

    // Ensure progressive timestamps and reasonable segment length
    podcastSegments = optimizeSegmentTiming(podcastSegments, userProfile.dailyTime);

    return podcastSegments;

  } catch (error) {
    console.error('Error generating advanced podcast content:', error);
    
         // Enhanced fallback content
     return generatePremiumFallbackPodcast(userProfile);
  }
}

function parseTextFormatPodcast(responseText: string, userProfile: UserProfile): PodcastSegment[] {
  const segments: PodcastSegment[] = [];
  const lines = responseText.split('\n').filter(line => line.trim());
  
  let currentSpeaker = 'Alex';
  let timestamp = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines, headers, and formatting markers
    if (!trimmed || 
        trimmed.startsWith('#') || 
        trimmed.startsWith('**') || 
        trimmed.match(/^\*\*[^*]+\*\*:?\s*$/) ||
        trimmed.match(/^Segment \d+:/i) ||
        trimmed.match(/^Title:/i) ||
        trimmed.match(/^Opening:/i) ||
        trimmed.match(/^Closing:/i)) {
      continue;
    }
    
    // Clean speaker indicators and extract text
    let cleanText = trimmed;
    
    if (trimmed.toLowerCase().includes('alex:') || trimmed.toLowerCase().includes('*alex*')) {
      currentSpeaker = 'Alex';
      cleanText = trimmed
        .replace(/\*?alex\*?:?\s*/i, '')
        .replace(/^\*+|\*+$/g, '')
        .trim();
    } else if (trimmed.toLowerCase().includes('jordan:') || trimmed.toLowerCase().includes('*jordan*')) {
      currentSpeaker = 'Jordan';
      cleanText = trimmed
        .replace(/\*?jordan\*?:?\s*/i, '')
        .replace(/^\*+|\*+$/g, '')
        .trim();
    }
    
    // Remove any remaining formatting markers
    cleanText = cleanText
      .replace(/^\*+|\*+$/g, '') // Remove leading/trailing asterisks
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic formatting
      .replace(/^["']|["']$/g, '') // Remove quotes
      .trim();
    
    // Only add if we have meaningful content
    if (cleanText && cleanText.length > 10 && !cleanText.match(/^(segment|title|opening|closing)/i)) {
      segments.push({ 
        speaker: currentSpeaker, 
        text: cleanText, 
        timestamp 
      });
      
      // Alternate speakers for natural conversation flow
      currentSpeaker = currentSpeaker === 'Alex' ? 'Jordan' : 'Alex';
      timestamp += 20;
    }
  }
  
  return segments.length > 0 ? segments : generatePremiumFallbackPodcast(userProfile);
}

function optimizeSegmentTiming(segments: PodcastSegment[], targetDuration: number): PodcastSegment[] {
  const targetSegments = Math.max(8, targetDuration * 3); // More segments for better pacing
  
  // Trim if too many segments
  if (segments.length > targetSegments) {
    segments = segments.slice(0, targetSegments);
  }
  
  // Recalculate timestamps for even distribution
  const timePerSegment = (targetDuration * 60) / segments.length;
  
  return segments.map((segment, index) => ({
    ...segment,
    timestamp: Math.round(index * timePerSegment)
  }));
}

function generatePremiumFallbackPodcast(userProfile: UserProfile): PodcastSegment[] {
  const interests = userProfile.interests.join(' and ');
  const primaryInterest = userProfile.interests[0] || 'technology';
  
  return [
    {
      speaker: "Alex",
      text: `Welcome to your personalized intelligence briefing. I'm Alex, here with Jordan, and today we're diving deep into ${interests} with insights you won't find in mainstream coverage.`,
      timestamp: 0
    },
    {
      speaker: "Jordan",
      text: `Thanks Alex. What's fascinating is how the recent developments in ${primaryInterest} are revealing patterns that most analysts are completely missing. The data tells a story that challenges conventional thinking.`,
      timestamp: 20
    },
    {
      speaker: "Alex", 
      text: `Exactly. And for someone focused on ${userProfile.learningGoals[0] || 'staying ahead of trends'}, this represents a significant strategic opportunity. Let me break down what smart money is actually doing right now.`,
      timestamp: 40
    },
    {
      speaker: "Jordan",
      text: `The technical implications are profound. When we analyze the underlying mechanisms, we see three convergent trends that will fundamentally reshape how we think about ${primaryInterest} over the next 12-18 months.`,
      timestamp: 60
    },
    {
      speaker: "Alex",
      text: `First trend: the quiet consolidation happening beneath the surface. While everyone focuses on the obvious players, there's a more subtle shift in market dynamics that creates specific opportunities.`,
      timestamp: 80
    },
    {
      speaker: "Jordan",
      text: `Second: the technological underpinnings are evolving faster than public discourse suggests. Recent breakthroughs in [specific area] are enabling capabilities that seemed impossible just months ago.`,
      timestamp: 100
    },
    {
      speaker: "Alex",
      text: `And third: the regulatory and competitive landscape is shifting in ways that favor those who understand the deeper strategic implications. Here's how to position yourself advantageously.`,
      timestamp: 120
    },
    {
      speaker: "Jordan",
      text: `What's particularly intriguing is how these trends intersect with broader economic patterns. The companies that understand this convergence will define the next phase of industry evolution.`,
      timestamp: 140
    },
    {
      speaker: "Alex",
      text: `For practical application, focus on three key areas: [specific strategic recommendations]. The window for early advantage is narrowing, but it's still open for those who act thoughtfully.`,
      timestamp: 160
    },
    {
      speaker: "Jordan",
      text: `Looking ahead, the implications extend beyond ${primaryInterest} into broader questions about innovation, market structure, and competitive advantage. The next few quarters will be defining.`,
      timestamp: 180
    }
  ].filter((_, index) => index < Math.ceil(userProfile.dailyTime / 2)); // Adjust length based on time preference
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Enhanced podcast generation endpoint is running',
    supportedContentTypes: ['daily_update', 'deep_dive', 'news_summary', 'skill_focused'],
    qualityLevel: 'premium'
  });
} 