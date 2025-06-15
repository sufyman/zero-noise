// Test R2 integration for TTS and Lipsync APIs
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testTTSWithR2() {
  console.log('🎤 Testing TTS API with R2 integration...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello! This is a test of our R2 integration for TTS API.',
        voiceId: 'pNInz6obpgDQGcFmaJgB'
      }),
    });

    if (response.ok) {
      console.log('✅ TTS API response successful!');
      console.log('📄 Response headers:');
      console.log('  - Content-Type:', response.headers.get('content-type'));
      console.log('  - Content-Length:', response.headers.get('content-length'));
      console.log('  - X-R2-Key:', response.headers.get('x-r2-key'));
      console.log('  - X-R2-Url:', response.headers.get('x-r2-url') ? '[SIGNED URL]' : 'null');
      console.log('  - X-R2-Upload-Status:', response.headers.get('x-r2-upload-status'));
      
      // Get audio buffer (original functionality)
      const audioBuffer = await response.arrayBuffer();
      console.log('🎵 Audio buffer size:', audioBuffer.byteLength, 'bytes');
      
    } else {
      console.log('❌ TTS API failed:', response.status, response.statusText);
      const errorData = await response.json();
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ TTS test failed:', error.message);
  }
}

async function testLipsyncWithR2() {
  console.log('\n🎬 Testing Lipsync API with R2 integration...');
  console.log('⚠️  Note: This test requires a valid audio URL and will take 3-5 minutes');
  
  try {
    // You can replace this with a real audio URL for testing
    const testAudioUrl = 'https://www.soundjay.com/misc/sounds/beep-07a.mp3';
    
    const response = await fetch(`${BASE_URL}/api/lipsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl: testAudioUrl,
        // videoUrl will use default presenter video
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Lipsync API response successful!');
      console.log('📄 Response data:');
      console.log('  - Success:', result.success);
      console.log('  - Job ID:', result.jobId);
      console.log('  - Status:', result.status);
      console.log('  - Original URL:', result.outputUrl);
      console.log('  - R2 Upload Status:', result.r2?.uploaded);
      console.log('  - R2 Key:', result.r2?.key);
      console.log('  - R2 URL:', result.r2?.url ? '[SIGNED URL]' : 'null');
      console.log('  - R2 File Size:', result.r2?.size, 'bytes');
      
    } else {
      console.log('❌ Lipsync API failed:', response.status, response.statusText);
      const errorData = await response.json();
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ Lipsync test failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing R2 Integration for TTS and Lipsync APIs');
  console.log('====================================================');
  
  // Check if server is running
  try {
    await fetch(`${BASE_URL}/api/auth`);
    console.log('✅ Server is running on localhost:3000\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm run dev');
    return;
  }
  
  // Run tests
  await testTTSWithR2();
  
  // Only run lipsync test if user wants (it takes several minutes)
  const runLipsyncTest = process.argv.includes('--lipsync');
  if (runLipsyncTest) {
    await testLipsyncWithR2();
  } else {
    console.log('\n🎬 Skipping Lipsync test (takes 3-5 minutes)');
    console.log('   To test lipsync: node test-r2-integration.js --lipsync');
  }
  
  console.log('\n🎉 R2 Integration tests completed!');
}

runTests().catch(console.error);