import { NextRequest, NextResponse } from 'next/server';
import { isEmailRegistered, createLoginSession, updateLastLogin, getUserByEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is registered
    const isRegistered = await isEmailRegistered(email);
    if (!isRegistered) {
      return NextResponse.json(
        { success: false, error: 'Email not found. Please sign up first.' },
        { status: 404 }
      );
    }

    // Get user data
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User data not found' },
        { status: 404 }
      );
    }

    // Create login session
    const sessionId = createLoginSession(email);
    
    // Update last login time
    await updateLastLogin(email);

    console.log('🔐 User logged in:', email);

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        email: user.email,
        joinedAt: user.timestamp,
        lastLogin: new Date().toISOString()
      }
    });

    // Set session cookie (httpOnly for security)
    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Login API endpoint. Use POST to login with email.' },
    { status: 200 }
  );
} 