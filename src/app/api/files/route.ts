import { NextResponse } from 'next/server';
import { listFiles } from '@/lib/r2';

export async function GET() {
  try {
    const result = await listFiles();
    
    const files = result.Contents?.map(file => ({
      key: file.Key,
      size: file.Size,
      lastModified: file.LastModified,
      etag: file.ETag,
    })) || [];

    return NextResponse.json({ files });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
} 