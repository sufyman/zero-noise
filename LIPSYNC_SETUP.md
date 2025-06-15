# 🎬 Lipsync Setup Guide

This guide shows how to set up and use the lipsync functionality using Sync.so.

## ✅ **Implementation Complete**

### **Files Created:**
- `src/app/api/lipsync/route.ts` - API endpoint for lipsync generation
- `src/app/lipsync-test/page.tsx` - Test page with UI for testing
- `LIPSYNC_SETUP.md` - This setup guide

## 🔧 **Setup Instructions**

### **1. Environment Variables**
Add to your `.env.local`:
```env
SYNC_API_KEY=your_sync_api_key_here
```

Get your API key from [Sync.so](https://sync.so) dashboard.

### **2. Dependencies**
Already installed:
```bash
npm install @sync.so/sdk
```

## 🎯 **API Usage**

### **POST `/api/lipsync`**
Generate a lip-synced video from video and audio inputs.

**Request:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "audioUrl": "https://example.com/audio.wav",
  "outputFileName": "my-lipsync" // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "jobId": "job_123456",
  "outputUrl": "https://sync.so/.../output.mp4",
  "status": "COMPLETED",
  "message": "Lipsync generation completed successfully"
}
```

**Response (In Progress):**
```json
{
  "success": false,
  "jobId": "job_123456",
  "status": "IN_PROGRESS",
  "message": "Job is still processing. You can check the status later.",
  "checkStatusUrl": "/api/lipsync/status/job_123456"
}
```

### **GET `/api/lipsync?jobId=job_123456`**
Check the status of a lipsync job.

**Response:**
```json
{
  "jobId": "job_123456",
  "status": "COMPLETED",
  "outputUrl": "https://sync.so/.../output.mp4",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

## 🧪 **Testing**

### **Test Page**
Visit: `http://localhost:3001/lipsync-test`

**Features:**
- ✅ Input forms for video and audio URLs
- ✅ Real-time logs and status updates
- ✅ Video preview of results
- ✅ Job status checking
- ✅ Example URLs pre-filled

### **Example URLs**
The test page comes with example URLs:
- **Video:** `https://assets.sync.so/docs/example-video.mp4`
- **Audio:** `https://assets.sync.so/docs/example-audio.wav`

## 🔄 **How It Works**

1. **Submit Job:** POST request starts lipsync generation
2. **Polling:** API polls Sync.so every 10 seconds for completion
3. **Timeout:** Max 10 minutes polling (60 polls × 10s)
4. **Result:** Returns output URL when completed

## ⚡ **Features**

- ✅ **Async Processing** - Handles long-running lipsync jobs
- ✅ **Status Checking** - Check job status anytime
- ✅ **Error Handling** - Comprehensive error messages
- ✅ **Timeout Protection** - Prevents infinite polling
- ✅ **Test Interface** - Easy-to-use test page
- ✅ **Video Preview** - Preview results directly in browser

## 🎬 **Example Usage**

```javascript
// Start lipsync generation
const response = await fetch('/api/lipsync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: 'https://example.com/person.mp4',
    audioUrl: 'https://example.com/speech.wav'
  })
});

const result = await response.json();

if (result.success) {
  console.log('✅ Lipsync completed!');
  console.log('📺 Video URL:', result.outputUrl);
} else if (result.jobId) {
  console.log('🔄 Job in progress:', result.jobId);
  // Check status later...
}
```

## 🚀 **Next Steps**

1. **Get Sync.so API Key** - Sign up at [sync.so](https://sync.so)
2. **Add to Environment** - Set `SYNC_API_KEY` in `.env.local`
3. **Test the Integration** - Visit `/lipsync-test` page
4. **Integrate with Your App** - Use the API endpoints in your application

The lipsync functionality is now ready to use! 🎉 