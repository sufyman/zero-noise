import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getSession } from '@/lib/auth';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const PREFERENCES_FILE = path.join(process.cwd(), 'signup-data', 'preferences.jsonl');

interface UserPreferences {
  email: string;
  interests: string[];
  contentFormat: string;
  dailyTime: number; // minutes
  podcastStyle: string;
  preferredSpeed: number;
  mantra: string;
  profileSummary?: string; // Add comprehensive text summary
  updatedAt: string;
}

interface OnboardingFormData {
  interests: string[];
  contentFormat: string;
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  mantra: string;
  // Additional fields from form onboarding
  learningGoals?: string[];
  informationPreferences?: string[];
  communicationStyle?: string;
  personalityTraits?: string[];
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

async function ensurePreferencesFile() {
  try {
    await fs.access(PREFERENCES_FILE);
  } catch {
    await fs.writeFile(PREFERENCES_FILE, '', 'utf-8');
  }
}

async function getUserPreferences(email: string): Promise<UserPreferences | null> {
  await ensurePreferencesFile();
  
  try {
    const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
    const lines = data.trim().split('\n').filter(line => line);
    
    for (const line of lines.reverse()) { // Get most recent
      try {
        const prefs = JSON.parse(line) as UserPreferences;
        if (prefs.email === email) {
          return prefs;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function saveUserPreferences(preferences: UserPreferences) {
  await ensurePreferencesFile();
  
  const prefLine = JSON.stringify({
    ...preferences,
    updatedAt: new Date().toISOString()
  });
  
  await fs.appendFile(PREFERENCES_FILE, prefLine + '\n', 'utf-8');
}

// GET - Retrieve user preferences
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId || !validateSession(sessionId)) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const preferences = await getUserPreferences(session.email);
    
    return NextResponse.json({ 
      hasPreferences: !!preferences,
      preferences 
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

// POST - Save user preferences
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId || !validateSession(sessionId)) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

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
      email: session.email,
      interests: formData.interests,
      contentFormat: formData.contentFormat,
      dailyTime: formData.dailyTime,
      podcastStyle: formData.podcastStyle,
      preferredSpeed: formData.preferredSpeed,
      mantra: formData.mantra,
      profileSummary: profileSummary, // Store the AI-generated summary
      updatedAt: new Date().toISOString()
    };

    await saveUserPreferences(preferences);

    return NextResponse.json({ 
      success: true,
      message: 'Preferences saved successfully',
      profileSummary: profileSummary // Return the summary for confirmation
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
} 