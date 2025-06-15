import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const key = decodeURIComponent(params.key);
    const result = await downloadFile(key);
    
    if (!result.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stream = result.Body as ReadableStream;
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': result.ContentType || 'application/octet-stream',
        'Content-Length': result.ContentLength?.toString() || '0',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
} 