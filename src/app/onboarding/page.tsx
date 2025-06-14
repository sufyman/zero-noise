"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { User, Mic, Volume2, Loader2, MicOff } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  email: string;
  joinedAt: string;
  lastLogin: string;
  source?: string;
}

interface RealtimeState {
  sessionId: string | null;
  isConnected: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  conversationState: 'initializing' | 'listening' | 'speaking' | 'processing' | 'completed';
  currentTranscript: string;
  alexResponse: string;
  questionIndex: number;
  totalQuestions: number;
  responses: Array<{
    question: string;
    response: string;
    timestamp: string;
  }>;
  report: {
    sessionId: string;
    timestamp: string;
    userProfile: {
      interests: string[];
      contentFormat: string;
      dailyTime: number;
      podcastStyle: string;
      preferredSpeed: number;
      personalityTraits: string[];
      communicationStyle: string;
      learningGoals: string[];
    };
    profileSummary: string;
  } | null;
}

export default function RealtimeOnboardingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    sessionId: null,
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
    connectionStatus: 'disconnected',
    conversationState: 'initializing',
    currentTranscript: '',
    alexResponse: '',
    questionIndex: 0,
    totalQuestions: 5,
    responses: [],
    report: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingAudioRef = useRef(false);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setUser(data.user);
            await initializeRealtimeSession();
          } else {
            router.push('/');
            return;
          }
        } else {
          router.push('/');
          return;
        }
      } catch {
        router.push('/');
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const initializeRealtimeSession = async () => {
    try {
      // Start a new session
      const sessionResponse = await fetch('/api/realtime-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_session' })
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setRealtimeState(prev => ({
          ...prev,
          sessionId: sessionData.sessionId,
          totalQuestions: sessionData.totalQuestions
        }));

        // Get API key for direct connection (since ephemeral tokens require beta header)
        const apiKeyResponse = await fetch('/api/realtime-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_api_key' })
        });

        if (apiKeyResponse.ok) {
          const apiKeyData = await apiKeyResponse.json();
          
          // Check if the response contains an error
          if (apiKeyData.error) {
            console.error('Failed to get API key:', apiKeyData.error, apiKeyData.details);
            setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
            return;
          }

          // Validate that we have the required fields
          if (!apiKeyData.api_key) {
            console.error('Invalid API key response:', apiKeyData);
            setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
            return;
          }

          console.log('Successfully retrieved API key for direct connection');

          await connectToRealtimeAPI({ client_secret: apiKeyData.api_key });
        } else {
          const errorData = await apiKeyResponse.json().catch(() => ({}));
          console.error('Failed to get API key:', errorData);
          setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
        }
      }
    } catch (error) {
      console.error('Failed to initialize realtime session:', error);
      setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
    }
  };

  const connectToRealtimeAPI = async (tokenData: {
    client_secret: string;
    session_id?: string;
    expires_at?: string;
  }) => {
    try {
      setRealtimeState(prev => ({ ...prev, connectionStatus: 'connecting' }));

      console.log('Attempting to connect with API key:', {
        client_secret_type: typeof tokenData.client_secret,
        client_secret_length: tokenData.client_secret?.length,
        client_secret_preview: tokenData.client_secret?.substring(0, 10) + '...'
      });

      // Validate the API key data
      if (typeof tokenData.client_secret !== 'string') {
        throw new Error(`Invalid API key type: ${typeof tokenData.client_secret}`);
      }

      if (!tokenData.client_secret || tokenData.client_secret.length === 0) {
        throw new Error('Empty API key');
      }

      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Get microphone access
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1
        }
      });

      console.log('Microphone access granted');

      // Connect to OpenAI Realtime API using API key directly
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      const subprotocol = `openai-insecure-api-key.${tokenData.client_secret}`;
      
      console.log('Creating WebSocket connection:', {
        url: wsUrl,
        subprotocol_length: subprotocol.length,
        subprotocol_preview: subprotocol.substring(0, 50) + '...'
      });

      const ws = new WebSocket(wsUrl, [
        'realtime',
        subprotocol,
        'openai-beta.realtime-v1'  // Required beta header
      ]);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection opened successfully', {
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol
        });
        setRealtimeState(prev => ({ 
          ...prev, 
          connectionStatus: 'connected', 
          isConnected: true,
          conversationState: 'listening'
        }));

        // Wait a moment for any initial session messages, then start the conversation
        setTimeout(() => {
          console.log('Starting conversation after WebSocket open...');
          startConversation();
        }, 500);
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', {
            type: message.type,
            full_message: message,
            message_keys: Object.keys(message)
          });
          await handleRealtimeMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', {
            error,
            raw_data: event.data
          });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error occurred:', {
          error,
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol
        });
        setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setRealtimeState(prev => ({ 
          ...prev, 
          connectionStatus: 'disconnected', 
          isConnected: false 
        }));
      };

    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
    }
  };

  const startConversation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Starting conversation...');
      
      // First, configure the session for audio output
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are Alex, a friendly and enthusiastic podcast host conducting a voice onboarding interview. You're gathering information to create a personalized podcast experience for the user. 

Your goal is to ask the onboarding questions naturally and conversationally. Start by introducing yourself and asking the first question about the user's professional interests.

Keep your responses:
- Warm and engaging
- Conversational, not robotic
- Brief but encouraging
- Professional yet friendly

Ask the questions one at a time and wait for the user's response before moving to the next question.

IMPORTANT: Always respond with BOTH text and audio. Make sure to generate audio for every response.`,
          voice: 'alloy',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          input_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          temperature: 0.8,
          max_response_output_tokens: 4096
        }
      };
      
      console.log('Configuring session for audio output:', sessionUpdate);
      wsRef.current.send(JSON.stringify(sessionUpdate));
      
              // Wait a moment for session update, then start the conversation
        setTimeout(() => {
          if (!wsRef.current) return;
          
          // Add a system message to initiate the conversation
          const systemMessage = {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: 'Start the conversation by introducing yourself as Alex and asking the first onboarding question. Respond with both text and audio.'
                }
              ]
            }
          };
          
          console.log('Adding system message:', systemMessage);
          wsRef.current.send(JSON.stringify(systemMessage));
          
          // Request a response from the AI with explicit audio request
          const responseMessage = {
            type: 'response.create',
            response: {
              modalities: ['audio', 'text'],
              voice: 'alloy',
              output_audio_format: 'pcm16'
            }
          };
          
          console.log('Requesting AI to start conversation with audio:', responseMessage);
          wsRef.current.send(JSON.stringify(responseMessage));
          
          // Start recording after a delay to let AI respond first
          setTimeout(() => {
            startRecording();
          }, 3000);
        }, 1000);
    }
  };

  const handleRealtimeMessage = async (message: {
    type: string;
    transcript?: string;
    delta?: string;
    error?: { message: string };
    item?: { type: string; id: string; status: string; };
    audio?: string;
  }) => {
    console.log('Realtime message:', message.type, message);

    switch (message.type) {
      case 'session.created':
        console.log('Session created successfully');
        break;

      case 'session.updated':
        console.log('Session updated successfully');
        // @ts-expect-error - session property access
        console.log('Session details:', JSON.stringify(message.session, null, 2));
        break;

      case 'conversation.created':
        console.log('Conversation created successfully');
        break;

      case 'input_audio_buffer.speech_started':
        setRealtimeState(prev => ({ 
          ...prev, 
          conversationState: 'speaking',
          isSpeaking: true 
        }));
        break;

      case 'input_audio_buffer.speech_stopped':
        setRealtimeState(prev => ({ 
          ...prev, 
          conversationState: 'processing',
          isSpeaking: false 
        }));
        break;

      case 'conversation.item.input_audio_transcription.delta':
        console.log('Transcription delta:', message.delta);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('Transcription completed:', message.transcript);
        setRealtimeState(prev => ({ 
          ...prev, 
          currentTranscript: message.transcript || '' 
        }));
        break;

      case 'response.created':
        console.log('Response created with details:', message);
        setRealtimeState(prev => ({ 
          ...prev, 
          conversationState: 'listening',
          alexResponse: ''
        }));
        break;

      case 'response.output_item.added':
        console.log('Response item added:', message.item);
        break;

      case 'response.content_part.added':
        console.log('Content part added');
        break;

      case 'response.audio.delta':
        console.log('🎵 Received audio delta:', message.delta ? 'YES' : 'NO');
        if (message.delta) {
          // Handle streaming audio from Alex
          await playAudioDelta(message.delta);
        }
        break;

      case 'response.audio_transcript.delta':
        setRealtimeState(prev => ({ 
          ...prev, 
          alexResponse: prev.alexResponse + (message.delta || '') 
        }));
        break;

      case 'response.audio_transcript.done':
        console.log('Audio transcript completed');
        break;

      case 'response.done':
        console.log('Response done with details:', message);
        setRealtimeState(prev => ({ 
          ...prev, 
          conversationState: 'listening'
        }));
        
        // Store the conversation turn
        if (realtimeState.currentTranscript && realtimeState.alexResponse) {
          setRealtimeState(prev => ({
            ...prev,
            responses: [...prev.responses, {
              question: prev.alexResponse,
              response: prev.currentTranscript,
              timestamp: new Date().toISOString()
            }],
            questionIndex: prev.questionIndex + 1,
            currentTranscript: '',
            alexResponse: ''
          }));
        }
        break;

      case 'input_audio_buffer.committed':
        console.log('Audio buffer committed');
        break;

      case 'conversation.item.created':
        console.log('Conversation item created:', message);
        break;

      case 'conversation.item.completed':
        console.log('Conversation item completed:', message);
        break;

      case 'response.output_item.done':
        console.log('Response output item done');
        break;

      case 'response.content_part.done':
        console.log('Response content part done');
        break;

      case 'response.audio_transcript.delta':
        console.log('🎵 Audio transcript delta:', message.delta);
        setRealtimeState(prev => ({ 
          ...prev, 
          alexResponse: prev.alexResponse + (message.delta || '') 
        }));
        break;

      case 'response.output_item.added':
        console.log('Response output item added:', message);
        break;

      case 'error':
        console.error('Realtime API error:', {
          full_message: message,
          error_field: message.error,
          error_type: typeof message.error,
          error_keys: message.error ? Object.keys(message.error) : 'NO_ERROR_FIELD'
        });
        setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
        break;

      default:
        console.log('Unhandled message type:', message.type);
        break;
    }
  };

  const playAudioDelta = async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      // Decode base64 audio
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32Array for Web Audio API
      const pcm16Array = new Int16Array(bytes.buffer);
      const floatArray = new Float32Array(pcm16Array.length);
      for (let i = 0; i < pcm16Array.length; i++) {
        floatArray[i] = pcm16Array[i] / 32768.0;
      }

      // Queue audio for playback
      audioQueueRef.current.push(floatArray);
      
      if (!isPlayingAudioRef.current) {
        playAudioQueue();
      }

    } catch (error) {
      console.error('Error playing audio delta:', error);
    }
  };

  const playAudioQueue = async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) return;

    isPlayingAudioRef.current = true;
    setRealtimeState(prev => ({ ...prev, conversationState: 'listening' }));

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (audioData) {
        const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
        audioBuffer.copyToChannel(audioData, 0);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      }
    }

    isPlayingAudioRef.current = false;
  };

  const startRecording = async () => {
    if (!streamRef.current || !wsRef.current) return;

    try {
      // Create audio processor using Web Audio API for proper PCM16 conversion
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(streamRef.current);
      
      // Create script processor for audio processing
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Convert Float32Array to PCM16
          const pcm16Buffer = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16Buffer[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          // Convert to base64
          const uint8Array = new Uint8Array(pcm16Buffer.buffer);
          const base64Audio = btoa(String.fromCharCode(...uint8Array));
          
          // Send to OpenAI
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }));
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setRealtimeState(prev => ({ ...prev, isRecording: true }));

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRealtimeState(prev => ({ ...prev, isRecording: false }));
    }
  };

  const toggleRecording = () => {
    if (realtimeState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const completeOnboarding = async () => {
    try {
      const response = await fetch('/api/realtime-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_report',
          sessionId: realtimeState.sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRealtimeState(prev => ({ 
          ...prev, 
          report: data.report,
          conversationState: 'completed'
        }));

        // Save preferences
        await savePreferences(data.report.userProfile);
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const savePreferences = async (userProfile: {
    interests: string[];
    contentFormat: string;
    dailyTime: number;
    podcastStyle: string;
    preferredSpeed: number;
    profileSummary?: string;
  }) => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: userProfile.interests || [],
          contentFormat: userProfile.contentFormat || 'podcast',
          dailyTime: userProfile.dailyTime || 5,
          podcastStyle: userProfile.podcastStyle || 'conversational',
          preferredSpeed: userProfile.preferredSpeed || 1.5,
          mantra: userProfile.profileSummary || ''
        })
      });

      if (response.ok) {
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* User Header */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Realtime Voice Chat</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${
                realtimeState.connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                realtimeState.connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                realtimeState.connectionStatus === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                {realtimeState.connectionStatus === 'connected' && '🟢 Connected to Alex'}
                {realtimeState.connectionStatus === 'connecting' && '🟡 Connecting...'}
                {realtimeState.connectionStatus === 'error' && '🔴 Connection Error'}
                {realtimeState.connectionStatus === 'disconnected' && '⚫ Disconnected'}
              </span>
            </div>
            
            {/* Progress */}
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Question {realtimeState.questionIndex + 1} of {realtimeState.totalQuestions}</span>
              <span>{Math.round(((realtimeState.questionIndex + 1) / realtimeState.totalQuestions) * 100)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((realtimeState.questionIndex + 1) / realtimeState.totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {realtimeState.conversationState !== 'completed' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Conversation Status */}
                <div className="text-center mb-8">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    realtimeState.conversationState === 'speaking' 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 animate-pulse' 
                      : realtimeState.conversationState === 'listening'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse'
                      : realtimeState.conversationState === 'processing'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}>
                    {realtimeState.conversationState === 'speaking' ? (
                      <Mic className="w-12 h-12 text-white" />
                    ) : realtimeState.conversationState === 'listening' ? (
                      <Volume2 className="w-12 h-12 text-white" />
                    ) : realtimeState.conversationState === 'processing' ? (
                      <Loader2 className="w-12 h-12 text-white animate-spin" />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {realtimeState.conversationState === 'speaking' && 'You&apos;re speaking...'}
                    {realtimeState.conversationState === 'listening' && 'Alex is speaking...'}
                    {realtimeState.conversationState === 'processing' && 'Processing...'}
                    {realtimeState.conversationState === 'initializing' && 'Connecting to Alex...'}
                  </h2>
                </div>

                {/* Realtime Controls */}
                <div className="flex justify-center space-x-4 mb-8">
                  <Button
                    onClick={toggleRecording}
                    disabled={!realtimeState.isConnected}
                    className={`${
                      realtimeState.isRecording 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } border-2 border-current font-semibold px-8 py-4 flex items-center space-x-3 shadow-lg disabled:opacity-50 text-lg`}
                  >
                    {realtimeState.isRecording ? (
                      <>
                        <MicOff className="w-6 h-6" />
                        <span>Stop Talking</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-6 h-6" />
                        <span>Start Talking</span>
                      </>
                    )}
                  </Button>

                  {realtimeState.questionIndex >= 4 && (
                    <Button
                      onClick={completeOnboarding}
                      className="bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-600 font-semibold px-6 py-4 flex items-center space-x-2 shadow-lg"
                    >
                      <span>Complete Onboarding</span>
                    </Button>
                  )}
                </div>

                {/* Live Conversation Display */}
                <div className="space-y-6">
                  {/* Current Transcript */}
                  {realtimeState.currentTranscript && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 border-2 border-green-200 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-green-800 mb-2">You&apos;re saying:</h4>
                      <p className="text-green-700">&quot;{realtimeState.currentTranscript}&quot;</p>
                    </motion.div>
                  )}

                  {/* Alex's Response */}
                  {realtimeState.alexResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-purple-800 mb-2">Alex says:</h4>
                      <p className="text-purple-700">&quot;{realtimeState.alexResponse}&quot;</p>
                    </motion.div>
                  )}

                  {/* Conversation Status */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                    <div className="text-center">
                      <p className="text-blue-800 font-semibold text-lg mb-2">
                        🎙️ Real-time conversation with Alex
                      </p>
                      <p className="text-blue-700">
                        {realtimeState.isConnected 
                          ? "Speak naturally - Alex can hear you and respond in real-time!"
                          : "Connecting to Alex..."
                        }
                      </p>
                      {realtimeState.isSpeaking && (
                        <p className="text-green-700 font-semibold mt-2">✓ Alex can hear you speaking...</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Completion Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Amazing conversation! 🎉
                </h2>
                
                <p className="text-gray-600 mb-6 text-lg">
                  Thank you for the wonderful real-time chat! I&apos;ve created your personalized profile 
                  and your custom podcast experience is ready.
                </p>
                
                {realtimeState.report && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6 text-left">
                    <h3 className="font-semibold text-purple-800 mb-3">Your Profile Summary:</h3>
                    <p className="text-purple-700 mb-4">{realtimeState.report.profileSummary}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                  <span className="text-gray-600">Redirecting to your dashboard...</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 