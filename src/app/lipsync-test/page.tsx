'use client';

import { useState } from 'react';

interface LipsyncResult {
  success: boolean;
  jobId?: string;
  outputUrl?: string;
  status?: string;
  message?: string;
  error?: string;
}

export default function LipsyncTestPage() {
  const [videoUrl, setVideoUrl] = useState('https://assets.sync.so/docs/example-video.mp4');
  const [audioUrl, setAudioUrl] = useState('https://assets.sync.so/docs/example-audio.wav');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LipsyncResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setLogs([]);
    
    addLog('🎬 Starting lipsync generation...');
    addLog(`📹 Video: ${videoUrl}`);
    addLog(`🎵 Audio: ${audioUrl}`);

    try {
      const response = await fetch('/api/lipsync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          audioUrl,
          outputFileName: 'test-lipsync'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        addLog('✅ Lipsync generation completed successfully!');
        addLog(`🎬 Job ID: ${data.jobId}`);
        if (data.outputUrl) {
          addLog(`📺 Output URL: ${data.outputUrl}`);
        }
        setResult(data);
      } else {
        addLog(`❌ Error: ${data.error}`);
        setResult(data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Request failed: ${errorMessage}`);
      setResult({ success: false, error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async (jobId: string) => {
    addLog(`🔄 Checking status for job ${jobId}...`);
    
    try {
      const response = await fetch(`/api/lipsync?jobId=${jobId}`);
      const data = await response.json();
      
      if (response.ok) {
        addLog(`📊 Status: ${data.status}`);
        if (data.outputUrl) {
          addLog(`📺 Output URL: ${data.outputUrl}`);
        }
        setResult(prev => ({ ...prev, ...data }));
      } else {
        addLog(`❌ Status check failed: ${data.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Status check failed: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🎬 Lipsync Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Input</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="audioUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Audio URL
                </label>
                <input
                  type="url"
                  id="audioUrl"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.wav"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isLoading ? '🔄 Generating Lipsync...' : '🎬 Generate Lipsync'}
              </button>
            </form>
            
            {/* Example URLs */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Example URLs:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Video:</strong> https://assets.sync.so/docs/example-video.mp4</p>
                <p><strong>Audio:</strong> https://assets.sync.so/docs/example-audio.wav</p>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Results</h2>
            
            {result && (
              <div className="space-y-4">
                {result.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-green-400">✅</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Success!
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Job ID: {result.jobId}</p>
                          <p>Status: {result.status}</p>
                          {result.message && <p>{result.message}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="text-red-400">❌</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{result.error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Check Button */}
                {result.jobId && result.status !== 'COMPLETED' && (
                  <button
                    onClick={() => checkStatus(result.jobId!)}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    🔄 Check Job Status
                  </button>
                )}

                {/* Output Video */}
                {result.outputUrl && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Output Video:</h4>
                    <video
                      controls
                      className="w-full rounded-md"
                      src={result.outputUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                    <a
                      href={result.outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      📺 Open in new tab
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-8 bg-black rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🔍 Logs</h2>
            <div className="bg-gray-900 rounded-md p-4 max-h-64 overflow-y-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {logs.join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 