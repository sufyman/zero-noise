import { NextRequest, NextResponse } from 'next/server';
import { SyncClient, SyncError } from "@sync.so/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes timeout

interface LipsyncRequest {
  videoUrl: string;
  audioUrl: string;
  outputFileName?: string;
  syncMode?: 'cut_off' | 'extend_end';
}

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, audioUrl, outputFileName = 'lipsync-output', syncMode = 'cut_off' }: LipsyncRequest = await request.json();

    // Validate inputs
    if (!videoUrl || !audioUrl) {
      return NextResponse.json(
        { error: 'Both videoUrl and audioUrl are required' },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.SYNC_API_KEY) {
      return NextResponse.json(
        { error: 'SYNC_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('🎬 Starting lipsync generation...');
    console.log(`📹 Video URL: ${videoUrl}`);
    console.log(`🎵 Audio URL: ${audioUrl}`);

    const client = new SyncClient({ apiKey: process.env.SYNC_API_KEY });

    // Start the lipsync generation job
    let jobId: string;
    try {
      const response = await client.generations.create({
        input: [
          {
            type: "video",
            url: videoUrl,
          },
          {
            type: "audio",
            url: audioUrl,
          },
        ],
        model: "lipsync-1.9.0-beta",
        options: {
          sync_mode: "cut_off"
        //   "loop"
        //   "cut_off",
        }
      });
      
      jobId = response.id;
      console.log(`✅ Lipsync job submitted successfully, job ID: ${jobId}`);
    } catch (err) {
      console.error('❌ Failed to create lipsync job:', err);
      if (err instanceof SyncError) {
        return NextResponse.json(
          { error: `Lipsync creation failed: ${JSON.stringify(err.body)}` },
          { status: err.statusCode }
        );
      }
      throw err;
    }

    // Poll for completion
    console.log('🔄 Polling for job completion...');
    let generation;
    let status;
    let pollCount = 0;
    const maxPolls = 60; // Max 10 minutes of polling (10s intervals)

    while (status !== 'COMPLETED' && status !== 'FAILED' && pollCount < maxPolls) {
      console.log(`📊 Polling status for generation ${jobId}... (${pollCount + 1}/${maxPolls})`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        generation = await client.generations.get(jobId);
        status = generation.status;
        console.log(`📈 Status: ${status}`);
        pollCount++;
      } catch (err) {
        console.error('❌ Polling failed:', err);
        if (err instanceof SyncError) {
          return NextResponse.json(
            { error: `Polling failed: ${JSON.stringify(err.body)}` },
            { status: err.statusCode }
          );
        }
        throw err;
      }
    }

    if (status === 'COMPLETED') {
      console.log(`✅ Lipsync generation ${jobId} completed successfully!`);
      console.log(`🎬 Output URL: ${generation?.outputUrl}`);
      
      return NextResponse.json({
        success: true,
        jobId,
        outputUrl: generation?.outputUrl,
        status: 'COMPLETED',
        message: 'Lipsync generation completed successfully'
      });
    } else if (status === 'FAILED') {
      console.log(`❌ Lipsync generation ${jobId} failed`);
      return NextResponse.json(
        { error: `Lipsync generation failed`, jobId, status: 'FAILED' },
        { status: 500 }
      );
    } else {
      console.log(`⏰ Lipsync generation ${jobId} timed out after ${maxPolls} polls`);
      return NextResponse.json({
        success: false,
        jobId,
        status,
        message: 'Job is still processing. You can check the status later.',
        checkStatusUrl: `/api/lipsync/status/${jobId}`
      }, { status: 202 });
    }

  } catch (error) {
    console.error('💥 Lipsync generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate lipsync' },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId parameter is required' },
      { status: 400 }
    );
  }

  if (!process.env.SYNC_API_KEY) {
    return NextResponse.json(
      { error: 'SYNC_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const client = new SyncClient({ apiKey: process.env.SYNC_API_KEY });
    const generation = await client.generations.get(jobId);

    return NextResponse.json({
      jobId,
      status: generation.status,
      outputUrl: generation.outputUrl,
      createdAt: generation.createdAt
    });
  } catch (error) {
    console.error('Error checking job status:', error);
    if (error instanceof SyncError) {
      return NextResponse.json(
        { error: `Status check failed: ${JSON.stringify(error.body)}` },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    );
  }
} 