import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getSession, getUserByEmail } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'No session found' 
        },
        { status: 401 }
      );
    }

    // Validate session
    const isValid = validateSession(sessionId);
    if (!isValid) {
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'Session expired' 
        },
        { status: 401 }
      );
    }

    // Get session data
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'Session not found' 
        },
        { status: 401 }
      );
    }

    // Get user data
    const user = await getUserByEmail(session.email);
    if (!user) {
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'User not found' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: user.email,
        joinedAt: user.timestamp,
        lastLogin: user.lastLogin || user.timestamp,
        source: user.source
      },
      session: {
        loginTime: session.loginTime,
        sessionId: sessionId
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 