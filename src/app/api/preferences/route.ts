import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface UserPreferences {
  email: string;
  interests: string[];
  contentFormat: string;
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  mantra: string;
  profileSummary?: string;
  updatedAt: string;
}

interface OnboardingFormData {
  interests: string[];
  contentFormat: string;
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  mantra: string;
  learningGoals?: string[];
  informationPreferences?: string[];
  communicationStyle?: string;
  personalityTraits?: string[];
}

interface GeneratedPodcast {
  title: string;
  description: string;
  script: string;
  audioUrl?: string;
  segments?: Array<{
    speaker: string;
    text: string;
    timestamp: number;
  }>;
}

interface GeneratedReport {
  title: string;
  content: string;
  url?: string;
}

interface GeneratedVideo {
  title: string;
  transcript: string;
  scenes: Array<{
    text: string;
    duration: number;
    emotion: string;
  }>;
}

interface UserContent {
  preferences?: UserPreferences;
  generatedContent?: {
    podcast?: GeneratedPodcast;
    richTextReport?: GeneratedReport;
    tikTokScript?: GeneratedVideo;
  };
  audioFiles?: {
    [key: string]: string; // segment/file id -> base64 or URL
  };
  contentHistory?: Array<{
    type: string;
    data: Record<string, unknown>;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

async function generateProfileSummary(formData: OnboardingFormData): Promise<string> {
  try {
    const prompt = `Based on the following user onboarding form responses, create a comprehensive, natural text summary that describes this person's preferences, goals, and ideal content experience. Write it as if you're describing this user to a content creator who needs to understand them deeply.

User Form Responses:
- Interests: ${formData.interests.join(', ')}
- Content Format: ${formData.contentFormat}
- Daily Time Available: ${formData.dailyTime} minutes
- Communication Style: ${formData.podcastStyle}
- Preferred Speed: ${formData.preferredSpeed}x
- Learning Goals: ${formData.learningGoals?.join(', ') || 'Not specified'}
- Information Preferences: ${formData.informationPreferences?.join(', ') || 'Not specified'}
- Additional Notes: ${formData.mantra || 'None'}

Create a 2-3 paragraph summary that captures:
1. Who this person is professionally and what drives their learning
2. How they prefer to consume content and why
3. What kind of personalized experience would be most valuable to them

Write in a natural, conversational tone as if you're briefing a podcast host about their ideal listener.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert at analyzing user preferences and creating detailed, insightful profiles for content personalization. Create natural, engaging summaries that capture the essence of who someone is and what they need." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content;
    if (!summary) {
      throw new Error('No summary generated');
    }

    return summary;

  } catch (error) {
    console.error('Error generating profile summary:', error);
    
    // Fallback to a structured summary if AI fails
    return `This user is passionate about ${formData.interests.slice(0, 2).join(' and ')}, with ${formData.dailyTime} minutes daily for content consumption. They prefer ${formData.contentFormat} format delivered in a ${formData.podcastStyle} style at ${formData.preferredSpeed}x speed. ${formData.learningGoals?.length ? `Their learning goals include ${formData.learningGoals.join(', ')}.` : ''} ${formData.informationPreferences?.length ? `They prefer receiving information through ${formData.informationPreferences.join(' and ')}.` : ''} This suggests they value ${formData.dailyTime > 10 ? 'in-depth' : 'concise'} content that matches their ${formData.podcastStyle} communication preference.`;
  }
}

// Generate numeric user ID from email
function generateUserId(email: string): number {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

async function getUserContent(email: string): Promise<UserContent | null> {
  try {
    const userId = generateUserId(email);
    
    const { data, error } = await supabase
      .from('users')
      .select('content')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found, return null
        return null;
      }
      throw error;
    }

    return data?.content as UserContent || null;
  } catch (error) {
    console.error('Error fetching user content:', error);
    return null;
  }
}

async function saveUserContent(email: string, content: UserContent) {
  try {
    const userId = generateUserId(email);
    
    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        content: {
          ...content,
          updatedAt: new Date().toISOString()
        }
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error saving user content:', error);
    throw error;
  }
}

// GET - Retrieve user preferences
export async function GET() {
  try {
    // Use Supabase auth instead of legacy file-based auth
    const supabaseClient = await createClient();
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    console.log('🍪 Supabase auth user:', user?.email);
    
    if (error || !user) {
      console.log('❌ Supabase authentication failed:', error?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log('✅ Supabase auth valid for user:', user.email);

    const userContent = await getUserContent(user.email!);
    
    return NextResponse.json({ 
      hasPreferences: !!(userContent?.preferences),
      preferences: userContent?.preferences,
      content: userContent
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

// POST - Save user preferences
export async function POST(request: NextRequest) {
  try {
    // Use Supabase auth instead of legacy file-based auth
    const supabaseClient = await createClient();
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    console.log('🍪 Supabase auth user:', user?.email);
    
    if (error || !user) {
      console.log('❌ Supabase authentication failed:', error?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log('✅ Supabase auth valid for user:', user.email);

    const body = await request.json();
    const {
      interests,
      contentFormat,
      dailyTime,
      podcastStyle,
      preferredSpeed,
      mantra,
      // Additional fields from enhanced onboarding
      learningGoals,
      informationPreferences,
      communicationStyle,
      personalityTraits
    } = body;

    // Validate required fields
    if (!interests || !contentFormat || !dailyTime || !podcastStyle) {
      return NextResponse.json({ error: 'Missing required preferences' }, { status: 400 });
    }

    // Prepare form data for summary generation
    const formData: OnboardingFormData = {
      interests: Array.isArray(interests) ? interests : [interests],
      contentFormat,
      dailyTime: Number(dailyTime),
      podcastStyle,
      preferredSpeed: Number(preferredSpeed) || 1.0,
      mantra: mantra || '',
      learningGoals: learningGoals || [],
      informationPreferences: informationPreferences || [],
      communicationStyle: communicationStyle || podcastStyle,
      personalityTraits: personalityTraits || []
    };

    // Generate comprehensive profile summary
    console.log('🤖 Generating profile summary from form data...');
    const profileSummary = await generateProfileSummary(formData);
    console.log('✅ Profile summary generated:', profileSummary.substring(0, 100) + '...');

    const preferences: UserPreferences = {
      email: user.email!,
      interests: formData.interests,
      contentFormat: formData.contentFormat,
      dailyTime: formData.dailyTime,
      podcastStyle: formData.podcastStyle,
      preferredSpeed: formData.preferredSpeed,
      mantra: formData.mantra,
      profileSummary: profileSummary,
      updatedAt: new Date().toISOString()
    };

    // Get existing content or create new
    const existingContent = await getUserContent(user.email!) || {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update with new preferences
    const updatedContent: UserContent = {
      ...existingContent,
      preferences,
      updatedAt: new Date().toISOString()
    };

    await saveUserContent(user.email!, updatedContent);

    return NextResponse.json({ 
      success: true,
      message: 'Preferences saved successfully',
      profileSummary: profileSummary
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
} 