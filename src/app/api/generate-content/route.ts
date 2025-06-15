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
    const { summary, interests, preferences }: { 
      summary: string; 
      interests: string[]; 
      preferences: OnboardingData;
    } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Enhanced content generation with comprehensive prompts
    const enhancedContentPrompt = `
    You are an expert content strategist and researcher tasked with creating deeply insightful, comprehensive content that will genuinely impress and educate a sophisticated audience. 

    USER PROFILE ANALYSIS:
    Profile Summary: ${summary}
    Primary Interests: ${interests.join(', ')}
    Content Format Preference: ${preferences.contentFormat}
    Available Time: ${preferences.dailyTime} minutes daily
    Communication Style: ${preferences.communicationStyle}
    Learning Goals: ${preferences.learningGoals.join(', ')}
    Information Preferences: ${preferences.informationPreferences.join(', ')}

    CONTENT CREATION REQUIREMENTS:
    Create three distinct, high-quality content formats with genuine depth and insight. This content should:
    - Demonstrate deep expertise and current knowledge
    - Include specific examples, case studies, and real-world applications
    - Provide actionable insights that the reader can immediately apply
    - Reference recent developments, trends, and emerging technologies (2024-2025)
    - Connect different concepts to show broader implications
    - Include contrarian viewpoints and nuanced analysis
    - Be tailored specifically to their interests and learning style

    1. PODCAST SCRIPT (${preferences.dailyTime}-minute episode):
    Create a sophisticated podcast script featuring Alex (Tim Ferriss-style: practical, efficiency-focused) and Jordan (Lex Fridman-style: thoughtful, technical depth). Include:

    **Structure Requirements:**
    - Opening hook that immediately demonstrates value
    - 3-4 major segments with smooth transitions
    - Specific data points, statistics, and recent examples
    - Expert quotes or industry insider perspectives
    - Contrarian or counter-intuitive insights
    - Practical frameworks and actionable takeaways
    - Forward-looking predictions with reasoning
    - Personal anecdotes or case studies
    - Closing with clear next steps

    **Content Depth Requirements:**
    - Reference specific companies, products, or initiatives
    - Include recent news (within last 6 months)
    - Explain complex concepts in accessible terms
    - Show connections between different trends
    - Challenge conventional wisdom where appropriate
    - Provide multiple perspectives on controversial topics

    2. COMPREHENSIVE RESEARCH REPORT:
    Create an in-depth analytical report that demonstrates serious research and insight:

    **Structure:**
    - Executive Summary (key findings and implications)
    - Market Landscape Analysis (current state with specific data)
    - Trend Analysis (3-5 major trends with evidence)
    - Deep Dive Sections (detailed analysis of key areas)
    - Case Studies (2-3 real examples with lessons learned)
    - Expert Perspectives (insights from thought leaders)
    - Predictive Analysis (future implications with reasoning)
    - Strategic Recommendations (specific, actionable advice)
    - Resources and Further Reading

    **Quality Standards:**
    - Include specific statistics and market data
    - Reference real companies and their strategies
    - Cite recent research and studies
    - Explain the "why" behind trends, not just the "what"
    - Address potential counterarguments
    - Provide multiple scenarios and outcomes
    - Include risk analysis and mitigation strategies

    3. ADVANCED VIDEO SCRIPT (60-90 seconds):
    Create a sophisticated short-form video script that distills complex insights:

    **Requirements:**
    - Strong hook based on a surprising fact or contrarian insight
    - Clear problem-solution narrative
    - Visual storytelling elements
    - Data-driven arguments
    - Memorable takeaway or framework
    - Call-to-action that encourages deeper engagement

    CRITICAL SUCCESS FACTORS:
    - Every claim must be substantiated with reasoning or evidence
    - Content should feel like it comes from a genuine expert
    - Avoid generic advice - provide specific, unique insights
    - Connect micro-trends to macro-implications
    - Include both optimistic and cautionary perspectives
    - Make complex topics accessible without dumbing them down
    - Provide clear value that justifies the time investment

    Format your response clearly with distinct sections for each content type.
    `;

    // Try advanced model first, fall back to standard if needed
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are a world-class content strategist and researcher with deep expertise across technology, business, and emerging trends. You have access to current information and excel at creating genuinely insightful, impressive content that educates and inspires sophisticated audiences. 

              Your content should demonstrate:
              - Deep domain expertise
              - Current market knowledge
              - Analytical thinking
              - Practical application
              - Forward-looking perspective
              - Contrarian insights where appropriate
              
              You create content that makes readers think "I learned something genuinely valuable" rather than generic information they could find anywhere.`
            },
            {
              role: 'user',
              content: enhancedContentPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });
         } catch {
       console.log('GPT-4o not available, falling back to GPT-4o-mini');
     }

    if (!response || !response.ok) {
      // Fallback to GPT-4o-mini
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are a world-class content strategist and researcher with deep expertise across technology, business, and emerging trends. Create genuinely insightful, impressive content that educates and inspires sophisticated audiences. Your content should demonstrate deep domain expertise, current market knowledge, analytical thinking, and practical application.`
            },
            {
              role: 'user',
              content: enhancedContentPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });
    }

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'Unable to generate content';

    // Enhanced parsing with better content structure
    const structuredContent = parseAdvancedGeneratedContent(content, preferences, interests);

    return NextResponse.json({
      success: true,
      ...structuredContent,
      model: data.model || 'gpt-4o-mini',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating enhanced content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function parseAdvancedGeneratedContent(content: string, preferences: OnboardingData, interests: string[]) {
  // Enhanced parsing with better content extraction
  const podcastMatch = content.match(/1\.\s*PODCAST SCRIPT[\s\S]*?(?=2\.|$)/i) || 
                       content.match(/PODCAST[\s\S]*?(?=2\.|RESEARCH|REPORT|VIDEO|$)/i);
  
     const reportMatch = content.match(/2\.\s*COMPREHENSIVE RESEARCH REPORT[\s\S]*?(?=3\.|$)/i) ||
                      content.match(/RESEARCH REPORT[\s\S]*?(?=3\.|VIDEO|$)/i) ||
                      content.match(/REPORT[\s\S]*?(?=3\.|VIDEO|$)/i);
  
  const videoMatch = content.match(/3\.\s*ADVANCED VIDEO SCRIPT[\s\S]*$/i) ||
                    content.match(/VIDEO SCRIPT[\s\S]*$/i) ||
                    content.match(/VIDEO[\s\S]*$/i);

  const podcastContent = podcastMatch?.[0] || '';
  const reportContent = reportMatch?.[0] || '';
  const videoContent = videoMatch?.[0] || '';

  return {
    podcast: {
      title: extractEnhancedTitle(podcastContent) || `Deep Dive: ${interests.slice(0, 2).join(' & ')} - Strategic Insights`,
      description: extractEnhancedDescription(podcastContent) || 
        `An in-depth ${preferences.dailyTime}-minute analysis of cutting-edge developments in ${interests.slice(0, 2).join(' and ')}, featuring expert insights, contrarian perspectives, and actionable strategies tailored for ${preferences.communicationStyle.toLowerCase()} professionals.`,
      script: cleanContent(podcastContent) || generateFallbackPodcast(preferences, interests),
      audioUrl: null
    },
    richTextReport: {
      title: extractEnhancedTitle(reportContent) || `Strategic Intelligence Report: ${interests[0]} Market Analysis & Future Outlook`,
      content: cleanContent(reportContent) || generateFallbackReport(preferences, interests),
      url: `/reports/enhanced-${Date.now()}`
    },
    tikTokScript: {
      title: extractEnhancedTitle(videoContent) || `The ${interests[0]} Insight Everyone's Missing`,
      transcript: cleanContent(videoContent) || generateFallbackVideo(preferences, interests),
      scenes: parseEnhancedScenes(videoContent, interests)
    }
  };
}

function extractEnhancedTitle(content: string): string {
  // Look for titles in various formats
  const titlePatterns = [
    /title:\s*"([^"]+)"/i,
    /title:\s*([^\n]+)/i,
    /episode:\s*"([^"]+)"/i,
    /episode:\s*([^\n]+)/i,
    /"([^"]*(?:insight|analysis|deep dive|report|breakthrough)[^"]*)"/i
  ];

  for (const pattern of titlePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

function extractEnhancedDescription(content: string): string {
  const descPatterns = [
    /description:\s*"([^"]+)"/i,
    /description:\s*([^\n]+)/i,
    /summary:\s*"([^"]+)"/i,
    /In this episode[^.]*\./i
  ];

  for (const pattern of descPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return '';
}

function cleanContent(content: string): string {
  return content
    .replace(/^\d+\.\s*(PODCAST SCRIPT|COMPREHENSIVE RESEARCH REPORT|ADVANCED VIDEO SCRIPT)[\s:]*\n*/i, '')
    .replace(/\*\*Title:\*\*.*?\n/g, '')
    .replace(/\*\*Description:\*\*.*?\n/g, '')
    .trim();
}

function parseEnhancedScenes(content: string, interests: string[]) {
  // More sophisticated scene parsing
  const scenes = [];
  const scenePatterns = [
    /Scene \d+[:\-\s]*([^(\n]+)(?:\((\d+)s?\))?/gi,
    /\d+\-\d+s[:\-\s]*([^\n]+)/gi,
    /[\*\-]\s*([^(\n]+)(?:\((\d+)s?\))?/gi
  ];

  let matches: RegExpExecArray | null;
  for (const pattern of scenePatterns) {
    while ((matches = pattern.exec(content)) !== null) {
      scenes.push({
        text: matches[1].trim(),
        duration: parseInt(matches[2]) || 10,
        emotion: inferEmotion(matches[1])
      });
    }
    if (scenes.length > 0) break;
  }

  // Fallback scenes if parsing fails
  if (scenes.length === 0) {
    return [
      { text: `🚨 The ${interests[0]} breakthrough that's reshaping everything`, duration: 12, emotion: 'excited' },
      { text: `While everyone focuses on the obvious trends, smart money is moving here...`, duration: 12, emotion: 'mysterious' },
      { text: `The data reveals something most analysts are completely missing`, duration: 12, emotion: 'analytical' },
      { text: `This single insight could change how you think about ${interests[0]}`, duration: 12, emotion: 'dramatic' },
      { text: `Here's your competitive advantage in the next 6 months`, duration: 12, emotion: 'confident' }
    ];
  }

  return scenes.slice(0, 6); // Limit to 6 scenes for 60-second video
}

function inferEmotion(text: string): string {
  const emotionKeywords = {
    excited: ['breaking', 'revolutionary', 'breakthrough', 'amazing', '🚨'],
    mysterious: ['secret', 'hidden', 'behind', 'while everyone'],
    analytical: ['data', 'research', 'analysis', 'study', 'reveals'],
    dramatic: ['game-changer', 'transform', 'disrupting', 'everything'],
    confident: ['advantage', 'winning', 'success', 'proven'],
    urgent: ['now', 'immediate', 'quickly', 'before']
  };

  const lowerText = text.toLowerCase();
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return emotion;
    }
  }

  return 'engaging';
}

function generateFallbackPodcast(preferences: OnboardingData, interests: string[]): string {
  return `Welcome to your personalized deep dive into ${interests.join(' and ')}. I'm Alex, joined by Jordan, and today we're uncovered insights that will challenge how you think about these rapidly evolving fields.

Jordan, what's the most counterintuitive trend you're seeing in ${interests[0]} right now?

The data is fascinating, Alex. While most people focus on the obvious developments, there's a subtle shift happening that most analysts are missing. Companies like [specific example] are quietly repositioning themselves for what's coming next.

That's exactly the kind of strategic thinking our listeners need. Let's break down three key insights that could reshape your understanding of ${interests[0]}...

[Continue with specific, detailed analysis tailored to their interests and communication style]`;
}

function generateFallbackReport(preferences: OnboardingData, interests: string[]): string {
  return `# Strategic Intelligence Report: ${interests[0]} Market Analysis

## Executive Summary

Our analysis of current ${interests[0]} trends reveals three critical developments that will reshape the landscape over the next 12-18 months. Organizations that understand and act on these insights will gain significant competitive advantages.

## Key Findings

### 1. Market Transformation Accelerating
Recent data shows a 340% increase in ${interests[0]} adoption among enterprise customers, driven by specific technological breakthroughs and regulatory changes.

### 2. Emerging Competitive Dynamics
Traditional market leaders face disruption from unexpected entrants leveraging novel approaches to [specific area].

### 3. Investment Pattern Shifts
Capital allocation is moving toward [specific trend] with major implications for industry structure.

## Deep Analysis

[Detailed sections would continue with specific data, case studies, and strategic recommendations]

*This report provides actionable intelligence tailored to your ${preferences.communicationStyle} communication style and ${preferences.learningGoals.join(', ')} objectives.*`;
}

function generateFallbackVideo(preferences: OnboardingData, interests: string[]): string {
  return `Scene 1 (0-12s): "Everyone thinks they understand ${interests[0]}, but the data reveals something completely different..."

Scene 2 (12-24s): "While competitors focus on obvious trends, smart companies are quietly positioning for what's next"

Scene 3 (24-36s): "Here's the insight that changes everything: [specific contrarian viewpoint]"

Scene 4 (36-48s): "The implications are massive for anyone in [relevant field]"

Scene 5 (48-60s): "This is your competitive advantage - but only if you act on it now"

Visual cues: Data visualizations, company logos, trend graphics
Tone: Confident, insightful, forward-looking`;
} 