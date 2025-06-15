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

    // Generate content using the search-enabled model
    const contentPrompt = `
    Based on this user profile summary and current interests, create comprehensive personalized content:

    User Profile: ${summary}
    Primary Interests: ${interests.join(', ')}
    Preferred Format: ${preferences.contentFormat}
    Daily Time: ${preferences.dailyTime} minutes
    Communication Style: ${preferences.communicationStyle}

    Create three distinct content formats:

    1. PODCAST FORMAT:
    - Title for a 10-15 minute podcast episode
    - Engaging description 
    - Complete script with host introduction, main content, and conclusion
    - Include recent trends and developments in their interest areas

    2. RICH TEXT REPORT:
    - Comprehensive title
    - Executive summary
    - Detailed analysis with recent data and trends
    - Key takeaways and actionable insights
    - Relevant links and references (simulate realistic URLs)

    3. TIKTOK SCRIPT:
    - Catchy title
    - 60-second video script
    - Scene-by-scene breakdown with timestamps
    - Engaging hooks and call-to-actions
    - Visual cues and emotions for each scene

    Make sure all content is based on recent developments (2024-2025) and includes current trends, data, and insights relevant to their interests.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-search-preview-2025-03-11',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content creator who specializes in creating personalized content across multiple formats. You have access to current information and can search for recent trends and data. Create engaging, informative content that matches the user\'s preferences and learning style.'
          },
          {
            role: 'user',
            content: contentPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      // Fallback to regular model if search model is not available
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
              content: 'You are an expert content creator who specializes in creating personalized content across multiple formats. Create engaging, informative content that matches the user\'s preferences and learning style.'
            },
            {
              role: 'user',
              content: contentPrompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.7,
        }),
      });

      if (!fallbackResponse.ok) {
        throw new Error(`OpenAI API error: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      const content = fallbackData.choices[0]?.message?.content || 'Unable to generate content';
      
      return NextResponse.json({
        success: true,
        content: parseGeneratedContent(content),
        model: 'gpt-4o-mini'
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'Unable to generate content';

    // Parse the generated content into structured format
    const structuredContent = parseGeneratedContent(content);

    return NextResponse.json({
      success: true,
      ...structuredContent,
      model: 'gpt-4o-mini-search-preview-2025-03-11'
    });

  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function parseGeneratedContent(content: string) {
  // Simple parser to extract structured content
  // In a real implementation, you'd use more sophisticated parsing
  
  const podcastMatch = content.match(/1\. PODCAST FORMAT:([\s\S]*?)(?=2\. RICH TEXT REPORT:|$)/);
  const reportMatch = content.match(/2\. RICH TEXT REPORT:([\s\S]*?)(?=3\. TIKTOK SCRIPT:|$)/);
  const tikTokMatch = content.match(/3\. TIKTOK SCRIPT:([\s\S]*)$/);

  return {
    podcast: {
      title: extractTitle(podcastMatch?.[1] || ''),
      description: extractDescription(podcastMatch?.[1] || ''),
      script: podcastMatch?.[1]?.trim() || 'Podcast content unavailable',
      audioUrl: null // Would be generated separately
    },
    richTextReport: {
      title: extractTitle(reportMatch?.[1] || ''),
      content: reportMatch?.[1]?.trim() || 'Report content unavailable',
      url: `/reports/${Date.now()}` // Simulated URL
    },
    tikTokScript: {
      title: extractTitle(tikTokMatch?.[1] || ''),
      transcript: tikTokMatch?.[1]?.trim() || 'TikTok script unavailable',
      scenes: parseScenes(tikTokMatch?.[1] || '')
    }
  };
}

function extractTitle(content: string): string {
  const titleMatch = content.match(/Title[:\-]\s*(.+)/i);
  return titleMatch?.[1]?.trim() || 'Untitled Content';
}

function extractDescription(content: string): string {
  const descMatch = content.match(/Description[:\-]\s*(.+?)(?:\n|$)/i);
  return descMatch?.[1]?.trim() || 'No description available';
}

function parseScenes(content: string): Array<{ text: string; duration: number; emotion: string }> {
  // Simple scene parser - in reality, this would be more sophisticated
  const scenes = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    scenes.push({
      text: lines[i].trim(),
      duration: 10, // 10 seconds per scene for 60-second video
      emotion: i % 2 === 0 ? 'energetic' : 'focused'
    });
  }
  
  return scenes;
} 