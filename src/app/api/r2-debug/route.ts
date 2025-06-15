import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const {
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_ACCOUNT_ID,
      R2_BUCKET,
    } = process.env;

    // Check if all required environment variables are set
    const envStatus = {
      R2_ACCESS_KEY_ID: R2_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing',
      R2_SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing',
      R2_ACCOUNT_ID: R2_ACCOUNT_ID ? '✅ Set' : '❌ Missing',
      R2_BUCKET: R2_BUCKET ? '✅ Set' : '❌ Missing',
      endpoint: R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : 'Cannot generate - missing account ID'
    };

    return NextResponse.json({
      environment: envStatus,
      nodeVersion: process.version,
      platform: process.platform
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
} 