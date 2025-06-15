import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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
  preferences?: {
    email: string;
    interests: string[];
    contentFormat: string;
    dailyTime: number;
    podcastStyle: string;
    preferredSpeed: number;
    mantra: string;
    profileSummary?: string;
    updatedAt: string;
  };
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

// GET - Retrieve user content
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId || !(await validateSession(sessionId))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const userContent = await getUserContent(session.email);

    return NextResponse.json({
      success: true,
      content: userContent
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

// POST - Save generated content
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId || !(await validateSession(sessionId))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data, audioFiles } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    // Get existing content or create new
    const existingContent = await getUserContent(session.email) || {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update content based on type
    const updatedContent: UserContent = {
      ...existingContent,
      updatedAt: new Date().toISOString()
    };

    // Initialize generatedContent if it doesn't exist
    if (!updatedContent.generatedContent) {
      updatedContent.generatedContent = {};
    }

    // Initialize audioFiles if it doesn't exist
    if (!updatedContent.audioFiles) {
      updatedContent.audioFiles = {};
    }

    // Save the content based on type
    switch (type) {
      case 'podcast':
        updatedContent.generatedContent.podcast = data as GeneratedPodcast;
        break;
      case 'report':
        updatedContent.generatedContent.richTextReport = data as GeneratedReport;
        break;
      case 'video':
        updatedContent.generatedContent.tikTokScript = data as GeneratedVideo;
        break;
      default:
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Save audio files if provided
    if (audioFiles) {
      updatedContent.audioFiles = {
        ...updatedContent.audioFiles,
        ...audioFiles
      };
    }

    // Add to content history
    if (!updatedContent.contentHistory) {
      updatedContent.contentHistory = [];
    }
    
    updatedContent.contentHistory.push({
      type,
      data: data as Record<string, unknown>,
      createdAt: new Date().toISOString()
    });

    await saveUserContent(session.email, updatedContent);

    return NextResponse.json({
      success: true,
      message: 'Content saved successfully'
    });
  } catch (error) {
    console.error('Error saving content:', error);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}

// PUT - Update audio files
export async function PUT(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;
    if (!sessionId || !(await validateSession(sessionId))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const body = await request.json();
    const { audioFiles } = body;

    if (!audioFiles) {
      return NextResponse.json({ error: 'Missing audioFiles' }, { status: 400 });
    }

    // Get existing content
    const existingContent = await getUserContent(session.email);
    if (!existingContent) {
      return NextResponse.json({ error: 'User content not found' }, { status: 404 });
    }

    // Update audio files
    const updatedContent: UserContent = {
      ...existingContent,
      audioFiles: {
        ...existingContent.audioFiles,
        ...audioFiles
      },
      updatedAt: new Date().toISOString()
    };

    await saveUserContent(session.email, updatedContent);

    return NextResponse.json({
      success: true,
      message: 'Audio files updated successfully'
    });
  } catch (error) {
    console.error('Error updating audio files:', error);
    return NextResponse.json({ error: 'Failed to update audio files' }, { status: 500 });
  }
} 