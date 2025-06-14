import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getSession } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';

const PREFERENCES_FILE = path.join(process.cwd(), 'signup-data', 'preferences.jsonl');

interface UserPreferences {
  email: string;
  interests: string[];
  contentFormat: string;
  dailyTime: number; // minutes
  podcastStyle: string;
  preferredSpeed: number;
  mantra: string;
  updatedAt: string;
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
      mantra
    } = body;

    // Validate required fields
    if (!interests || !contentFormat || !dailyTime || !podcastStyle) {
      return NextResponse.json({ error: 'Missing required preferences' }, { status: 400 });
    }

    const preferences: UserPreferences = {
      email: session.email,
      interests: Array.isArray(interests) ? interests : [interests],
      contentFormat,
      dailyTime: Number(dailyTime),
      podcastStyle,
      preferredSpeed: Number(preferredSpeed) || 1.0,
      mantra: mantra || '',
      updatedAt: new Date().toISOString()
    };

    await saveUserPreferences(preferences);

    return NextResponse.json({ 
      success: true,
      message: 'Preferences saved successfully' 
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
} 