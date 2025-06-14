import { NextRequest, NextResponse } from 'next/server';
import { addEmailToSheet, checkEmailExists } from '@/lib/sheets-simple';
import { createLoginSession, updateLastLogin } from '@/lib/auth';

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

    // Check if email already exists
    const existsResult = await checkEmailExists(email);
    if (existsResult.success && existsResult.exists) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Get user agent and other metadata
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'direct';

    // Add email to Google Sheets
    const result = await addEmailToSheet({
      email,
      timestamp: new Date().toISOString(),
      source: referer.includes('localhost') ? 'website-dev' : 'website',
      userAgent,
    });

    if (!result.success) {
      console.error('Failed to add email to sheet:', result.error);
      // Don't fail the signup if sheets fail, just log it
      console.log('📧 Email signup (sheets failed, logged only):', {
        email,
        timestamp: new Date().toISOString(),
        source: referer.includes('localhost') ? 'website-dev' : 'website',
        userAgent,
      });
    }

    // Automatically log the user in after successful signup
    const sessionId = createLoginSession(email);
    await updateLastLogin(email);
    
    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Successfully signed up! Redirecting to setup...',
      redirect: '/onboarding'
    });

    // Set session cookie
    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Signup API endpoint. Use POST to submit email.' },
    { status: 200 }
  );
} 