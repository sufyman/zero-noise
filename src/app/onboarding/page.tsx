"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  User, 
  Mic, 
  Loader2, 
  MessageSquare, 
  Edit3,
  Check,
  ChevronRight,
  Headphones,
  FileText,
  Video,
  Play,
  ExternalLink,
  VolumeX,
  Volume2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useConversation } from "@elevenlabs/react";

interface User {
  email: string;
  joinedAt: string;
  lastLogin: string;
  source?: string;
}

interface OnboardingData {
  interests: string[];
  contentFormats: string[];
  dailyTime: number;
  podcastStyle: string;
  preferredSpeed: number;
  personalityTraits: string[];
  communicationStyle: string;
  learningGoals: string[];
  informationPreferences: string[];
}

interface RealtimeState {
  sessionId: string | null;
  isConnected: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  conversationState: 'initializing' | 'listening' | 'speaking' | 'processing' | 'completed';
  currentTranscript: string;
  samResponse: string;
  questionIndex: number;
  totalQuestions: number;
  responses: Array<{
    question: string;
    response: string;
    timestamp: string;
  }>;
}

interface GeneratedContent {
  podcast: {
    title: string;
    description: string;
    script: string;
    audioUrl?: string;
  };
  richTextReport: {
    title: string;
    content: string;
    url?: string;
  };
  tikTokScript: {
    title: string;
    transcript: string;
    scenes: Array<{
      text: string;
      duration: number;
      emotion: string;
    }>;
  };
}

type OnboardingMode = 'choice' | 'realtime' | 'manual' | 'processing' | 'complete';

const INTEREST_OPTIONS = [
  'Technology & AI', 'Business & Startups', 'Marketing & Sales', 'Finance & Investing',
  'Health & Wellness', 'Science & Research', 'Politics & Current Events', 'Arts & Culture',
  'Education & Learning', 'Sports & Fitness', 'Travel & Lifestyle', 'Environment & Sustainability'
];

const CONTENT_FORMAT_OPTIONS = [
  { value: 'podcast', label: 'Audio Podcasts', icon: Headphones },
  { value: 'text', label: 'Text Articles', icon: FileText },
  { value: 'video', label: 'Video Content', icon: Video },
  { value: 'mixed', label: 'Mixed Formats', icon: MessageSquare }
];

const COMMUNICATION_STYLES = [
  'Analytical & Data-driven', 'Energetic & Motivational', 'Casual & Conversational',
  'Professional & Formal', 'Creative & Inspirational', 'Balanced & Informative'
];

const LEARNING_GOALS = [
  'Stay current with industry trends', 'Develop specific skills', 'Get inspiration for projects',
  'Network and connect with others', 'Make better decisions', 'Expand general knowledge'
];

const INFORMATION_PREFERENCES = [
  'Quick daily updates', 'Deep-dive analysis', 'Breaking news alerts',
  'Weekly summaries', 'Expert interviews', 'Case studies & examples'
];

export default function OnboardingPage() {
  const router = useRouter();
  
  // Existing state
  const [mode, setMode] = useState<OnboardingMode>('choice');
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedContent] = useState<GeneratedContent | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('generatedContent');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const [customInterest, setCustomInterest] = useState('');

  // Realtime state
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    sessionId: null,
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
    connectionStatus: 'disconnected',
    conversationState: 'initializing',
    currentTranscript: '',
    samResponse: '',
    questionIndex: 0,
    totalQuestions: 5,
    responses: []
  });

  // ElevenLabs conversation state
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const responseInProgressRef = useRef(false);

  const manualSteps = [
    { title: 'Interests', key: 'interests' as keyof OnboardingData },
    { title: 'Content Formats', key: 'contentFormats' as keyof OnboardingData },
    { title: 'Time Preference', key: 'dailyTime' as keyof OnboardingData },
    { title: 'Communication Style', key: 'communicationStyle' as keyof OnboardingData },
    { title: 'Learning Goals', key: 'learningGoals' as keyof OnboardingData },
    { title: 'Information Preferences', key: 'informationPreferences' as keyof OnboardingData }
  ];

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check authentication
        const authResponse = await fetch('/api/auth');
        if (!authResponse.ok) {
          // Not authenticated, redirect to login
          console.log('❌ User not authenticated, redirecting to login');
          window.location.href = '/';
          return;
        }

        const authData = await authResponse.json();
        console.log('✅ User authenticated:', authData.email);

        // Check if user has already completed onboarding
        const preferencesResponse = await fetch('/api/preferences');
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          
          if (preferencesData.hasPreferences) {
            // User has already completed onboarding, redirect to dashboard
            console.log('✅ User has completed onboarding, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
        }

        console.log('🎯 User needs to complete onboarding, proceeding...');
        
      } catch (error) {
        console.error('❌ Error in auth check:', error);
        // On error, redirect to login
        window.location.href = '/';
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
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const startRealtimeOnboarding = async () => {
    setMode('realtime');
    await initializeRealtimeSession();
  };

  const startManualOnboarding = () => {
    setMode('manual');
    setCurrentStep(0);
  };

  const initializeRealtimeSession = async () => {
    try {
      setRealtimeState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      
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

        const apiKeyResponse = await fetch('/api/realtime-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_api_key' })
        });

        if (apiKeyResponse.ok) {
          const apiKeyData = await apiKeyResponse.json();
          
          if (apiKeyData.error) {
            console.error('Failed to get API key:', apiKeyData.error);
            setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
            return;
          }

          await connectToRealtimeAPI();
        }
      }
    } catch (error) {
      console.error('Failed to initialize realtime session:', error);
      setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
    }
  };

  const connectToRealtimeAPI = async () => {
    const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17`;
    
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => {
      setRealtimeState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionStatus: 'connected',
        conversationState: 'listening'
      }));
      
      // Send session configuration
      wsRef.current?.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are Sam, a friendly AI assistant helping users with their onboarding. 
          Keep responses conversational and engaging. Ask about their interests, content preferences, 
          daily time availability, communication style, learning goals, and how they like to receive information.
          Keep each question focused and wait for their response before continuing.`,
          voice: 'alloy',
          output_audio_format: 'pcm16',
          input_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          }
        }
      }));

      // Start the conversation
      startConversation();
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleRealtimeMessage(message);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setRealtimeState(prev => ({ ...prev, connectionStatus: 'error' }));
    };

    wsRef.current.onclose = () => {
      setRealtimeState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionStatus: 'disconnected'
      }));
    };
  };

  const startConversation = async () => {
    // Request microphone access if not already granted
    if (microphonePermission !== 'granted') {
      const granted = await requestMicrophoneAccess();
      if (!granted) {
        alert('Microphone access is required for voice conversation. You can still use text chat.');
        return;
      }
    }

    try {
      const conversationId = await conversation.startSession({
        agentId: 'agent_01jxqb1x94e6wt4455d1wp2q5x'
      });
      console.log('Conversation started with ID:', conversationId);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const handleRealtimeMessage = async (message: { type: string; delta?: string; transcript?: string; [key: string]: unknown }) => {
    switch (message.type) {
      case 'response.audio.delta':
        if (message.delta) {
          await playAudioDelta(message.delta);
        }
        break;
      
      case 'response.text.delta':
        if (message.delta) {
          setRealtimeState(prev => ({
            ...prev,
            samResponse: prev.samResponse + message.delta
          }));
        }
        break;

      case 'input_audio_buffer.speech_started':
        setRealtimeState(prev => ({ ...prev, isRecording: true }));
        break;

      case 'input_audio_buffer.speech_stopped':
        setRealtimeState(prev => ({ ...prev, isRecording: false }));
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          setRealtimeState(prev => ({
            ...prev,
            currentTranscript: message.transcript as string
          }));
        }
        break;

      case 'response.done':
        // Check if we've completed the onboarding questions
        if (realtimeState.questionIndex >= realtimeState.totalQuestions - 1) {
          await completeRealtimeOnboarding();
        }
        break;
    }
  };

  const playAudioDelta = async (base64Audio: string) => {
    // Audio playback implementation (simplified)
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const completeRealtimeOnboarding = async () => {
    setRealtimeState(prev => ({ ...prev, conversationState: 'completed' }));
    
    // Extract onboarding data from conversation
    const extractedData = await extractOnboardingDataFromConversation();
    setOnboardingData(extractedData);
    
    setMode('processing');
    await generateContent(extractedData);
  };

  const extractOnboardingDataFromConversation = async (): Promise<OnboardingData> => {
    // This would use AI to analyze the conversation and extract structured data
    // For now, return a sample structure
    return {
      interests: ['Technology & AI', 'Business & Startups'],
      contentFormats: ['podcast'],
      dailyTime: 15,
      podcastStyle: 'conversational',
      preferredSpeed: 1.5,
      personalityTraits: ['curious', 'analytical'],
      communicationStyle: 'Casual & Conversational',
      learningGoals: ['Stay current with industry trends', 'Develop specific skills'],
      informationPreferences: ['Quick daily updates', 'Expert interviews']
    };
  };

  const handleManualStepChange = (key: keyof OnboardingData, value: string | number | string[]) => {
    setOnboardingData(prev => ({ ...prev, [key]: value }));
  };

  const nextManualStep = () => {
    if (currentStep < manualSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeManualOnboarding();
    }
  };

  const prevManualStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeManualOnboarding = async () => {
    setMode('processing');
    await generateContent(onboardingData);
  };

  const generateContent = async (data: OnboardingData) => {
    
    try {
      console.log('🚀 Starting content generation...');
      console.log('📝 Onboarding data:', data);
      
      // Save onboarding data to database via preferences API
      const saveResponse = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests: data.interests,
          contentFormat: data.contentFormats.join(','), // Convert array to string for existing API
          dailyTime: data.dailyTime,
          podcastStyle: data.communicationStyle, // Map to existing field
          preferredSpeed: data.preferredSpeed,
          mantra: `Learning Goals: ${data.learningGoals.join(', ')}. Info Preferences: ${data.informationPreferences.join(', ')}`,
          // Send additional fields for comprehensive summary generation
          learningGoals: data.learningGoals,
          informationPreferences: data.informationPreferences,
          communicationStyle: data.communicationStyle,
          personalityTraits: data.personalityTraits
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save onboarding data');
      }

      console.log('✅ Onboarding data saved to database');
      
      // Also save to localStorage for dashboard to access during generation
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.setItem('onboardingData', JSON.stringify(data));
      localStorage.setItem('contentGenerationStatus', 'in-progress');
      
      // Start content generation in background
      const generationPromise = generateContentInBackground(data);
      
      // Redirect to dashboard immediately
      console.log('🔄 Redirecting to dashboard...');
      router.push('/dashboard');
      
      // Handle content generation in background
      generationPromise.then((content) => {
        console.log('✅ Content generation completed!', content);
        localStorage.setItem('generatedContent', JSON.stringify(content));
        localStorage.setItem('contentGenerationStatus', 'complete');
        
        // Trigger a custom event to notify the dashboard
        window.dispatchEvent(new CustomEvent('contentGenerationComplete'));
      }).catch((error) => {
        console.error('❌ Background content generation failed:', error);
        localStorage.setItem('contentGenerationStatus', 'error');
        
        // Trigger a custom event to notify the dashboard
        window.dispatchEvent(new CustomEvent('contentGenerationError'));
      });
      
    } catch (error) {
      console.error('Error generating content:', error);
      localStorage.setItem('contentGenerationStatus', 'error');
      
      // Show error message to user
      alert('Failed to save your preferences. Please try again.');
    }
  };

  const generateContentInBackground = async (data: OnboardingData): Promise<GeneratedContent> => {
    console.log('⏱️ Starting 3-second content generation simulation...');
    
    // For demo purposes, simulate content generation with delay
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    console.log('🎯 Generating demo content...');
    
    const demoContent = {
      podcast: {
        title: `${data.interests.slice(0, 2).join(' & ')} Weekly: Your Personalized Update`,
        description: `A ${data.dailyTime}-minute deep dive into the latest developments in ${data.interests.slice(0, 2).join(' and ')}, tailored specifically for your ${data.communicationStyle.toLowerCase()} preference.`,
        script: `Welcome to your personalized podcast! Today we're covering the latest developments in ${data.interests.join(', ')} and how they're reshaping the landscape. 

In this episode, we'll explore the cutting-edge innovations that are transforming ${data.interests[0]}, dive deep into the implications for ${data.interests[1] || 'the industry'}, and provide you with actionable insights you can apply immediately.

Our research team has analyzed over 200 sources this week to bring you the most relevant and impactful stories. Whether you're a ${data.communicationStyle.toLowerCase()} professional or someone looking to stay ahead of the curve, this episode is designed specifically for your learning style.

Key topics we'll cover:
• Latest breakthrough in ${data.interests[0]}
• Market analysis and trend predictions
• Expert insights from industry leaders
• Practical applications for your ${data.learningGoals.join(' and ')} goals

Let's dive right in...`,
        audioUrl: undefined
      },
      richTextReport: {
        title: `Comprehensive Analysis: ${data.interests[0]} Trends Report`,
        content: `# Executive Summary

This comprehensive report analyzes the current state and emerging trends in ${data.interests[0]}, providing actionable insights for professionals and enthusiasts.

## Key Findings

### Market Overview
The ${data.interests[0]} sector has experienced significant growth over the past quarter, with key developments in:

- **Innovation Acceleration**: New technologies are emerging at an unprecedented pace
- **Market Consolidation**: Major players are forming strategic partnerships
- **Consumer Adoption**: End-user engagement has increased by 300% year-over-year

### Trend Analysis

#### 1. Emerging Technologies
Recent breakthroughs in ${data.interests[0]} are reshaping the competitive landscape. Key innovations include:

- Advanced AI integration capabilities
- Enhanced user experience frameworks
- Scalable infrastructure solutions

#### 2. Market Dynamics
The market is experiencing:
- Increased investment from venture capital firms
- Growing demand from enterprise customers
- Expansion into international markets

#### 3. Future Outlook
Based on our analysis, we predict:
- Continued growth in the next 12-18 months
- Consolidation of smaller players
- Emergence of new use cases and applications

## Actionable Recommendations

1. **Stay Informed**: Monitor key industry publications and thought leaders
2. **Invest in Learning**: Develop skills in emerging technologies
3. **Network Actively**: Attend industry conferences and events
4. **Experiment**: Test new tools and platforms in your projects

## Conclusion

The ${data.interests[0]} landscape is evolving rapidly. Organizations and individuals who adapt quickly will be best positioned for success.

---
*Report generated based on ${data.interests.join(', ')} interests and ${data.communicationStyle.toLowerCase()} communication preferences.*`,
        url: `/reports/demo-${Date.now()}`
      },
      tikTokScript: {
        title: `60-Second ${data.interests[0]} Breakthrough!`,
        transcript: `Scene 1: Hook - "You won't believe what just happened in ${data.interests[0]}!" 
Scene 2: Setup the problem - "Most people are still using outdated approaches..."
Scene 3: Reveal the breakthrough - "But here's what industry leaders just discovered..."
Scene 4: Show the impact - "This changes everything because..."
Scene 5: Call to action - "Here's what you need to do next..."
Scene 6: Outro - "Follow for more ${data.interests[0]} insights!"`,
        scenes: [
          { 
            text: `🚨 BREAKING: The biggest ${data.interests[0]} breakthrough of 2025 just dropped!`, 
            duration: 10, 
            emotion: 'excited' 
          },
          { 
            text: `While everyone's focused on the obvious, smart players are already moving on this...`, 
            duration: 10, 
            emotion: 'mysterious' 
          },
          { 
            text: `The data shows something incredible that most people are missing...`, 
            duration: 10, 
            emotion: 'analytical' 
          },
          { 
            text: `But here's the real game-changer that will transform how we think about ${data.interests[0]}...`, 
            duration: 10, 
            emotion: 'dramatic' 
          },
          { 
            text: `This is what you need to do RIGHT NOW to stay ahead of the curve...`, 
            duration: 10, 
            emotion: 'urgent' 
          },
          { 
            text: `Follow @zeronoise for daily ${data.interests[0]} insights and trends!`, 
            duration: 10, 
            emotion: 'friendly' 
          }
        ]
      }
    };

    console.log('🎉 Demo content generated successfully!');
    return demoContent;
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !onboardingData.interests.includes(customInterest.trim())) {
      handleManualStepChange('interests', [...onboardingData.interests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomInterest();
    }
  };

  // ElevenLabs conversation state
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    interests: [],
    contentFormats: ['podcast'],
    dailyTime: 15,
    podcastStyle: 'conversational',
    preferredSpeed: 1.5,
    personalityTraits: [],
    communicationStyle: '',
    learningGoals: [],
    informationPreferences: []
  });

  // Client tool functions
  const completeInterestsAndGoalsPhase = async (parameters: { interests_and_goals: string }): Promise<string> => {
    try {
      console.log('Completing interests and goals phase:', parameters.interests_and_goals);
      
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests: [parameters.interests_and_goals],
          contentFormat: 'podcast',
          dailyTime: 480,
          podcastStyle: 'conversational',
          preferredSpeed: 1.0,
          mantra: '',
          user_email: user?.email || null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Interests saved successfully:', result);
        return 'Interests saved successfully';
      } else {
        console.error('Failed to save interests');
        return 'Failed to save interests';
      }
    } catch (error) {
      console.error('Error in completeInterestsAndGoalsPhase:', error);
      return 'Error saving interests';
    }
  };

  const completeFormatAndFrequencyPhase = async (parameters: { format: string; frequency: string }): Promise<string> => {
    try {
      console.log('Completing format and frequency phase:', parameters);
      
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentFormat: parameters.format,
          dailyTime: 480,
          interests: [],
          podcastStyle: 'conversational',
          preferredSpeed: 1.0,
          mantra: '',
          user_email: user?.email || null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Preferences saved successfully:', result);
        return 'Preferences saved successfully';
      } else {
        console.error('Failed to save preferences');
        return 'Failed to save preferences';
      }
    } catch (error) {
      console.error('Error in completeFormatAndFrequencyPhase:', error);
      return 'Error saving preferences';
    }
  };

  // Initialize the conversation with client tools
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs Conversational AI');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs Conversational AI');
      router.push('/dashboard');
    },
    onMessage: (message) => {
      console.log('Message received:', message);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    },
    clientTools: {
      complete_interests_and_goals_phase: completeInterestsAndGoalsPhase,
      complete_format_and_frequency_phase: completeFormatAndFrequencyPhase,
    }
  });

  // Check microphone permission on mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicrophonePermission(permission.state);
        
        permission.onchange = () => {
          setMicrophonePermission(permission.state);
        };
      } catch {
        console.log('Permission API not supported');
      }
    };

    checkMicrophonePermission();
  }, []);

  const requestMicrophoneAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission('granted');
      return true;
    } catch {
      console.error('Microphone access denied');
      setMicrophonePermission('denied');
      return false;
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
      console.log('Conversation ended');
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  const toggleMute = async () => {
    const newVolume = isMuted ? volume : 0;
    await conversation.setVolume({ volume: newVolume });
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    if (!isMuted) {
      await conversation.setVolume({ volume: newVolume });
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Setting up your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Choice Screen */}
          {mode === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="mb-12">
                <h1 className="text-5xl font-bold text-white mb-6">
                  Welcome to Zero Noise
                </h1>
                <p className="text-xl text-gray-300 mb-8">
                  Let&apos;s personalize your content experience. Choose how you&apos;d like to get started:
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Realtime Option */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 cursor-pointer"
                  onClick={startRealtimeOnboarding}
                >
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">
                      Chat with Sam
                    </h3>
                    <p className="text-gray-300">
                      Have a natural conversation with our AI assistant to personalize your experience
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <div className="flex items-center text-green-400">
                      <Check className="w-4 h-4 mr-2" />
                      <span className="text-sm">Natural conversation</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check className="w-4 h-4 mr-2" />
                      <span className="text-sm">Voice & text support</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check className="w-4 h-4 mr-2" />
                      <span className="text-sm">2-3 minutes</span>
                    </div>
                  </div>

                  <Button className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    Start Conversation
                  </Button>
                </motion.div>

                {/* Manual Option */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 cursor-pointer"
                  onClick={startManualOnboarding}
                >
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Edit3 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">
                      Manual Setup
                    </h3>
                    <p className="text-gray-300">
                      Fill out a quick form if you prefer not to speak right now
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <div className="flex items-center text-green-400">
                      <Check className="w-4 h-4 mr-2" />
                      <span className="text-sm">Quick form fields</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check className="w-4 h-4 mr-2" />
                      <span className="text-sm">Multi-select options</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check className="w-4 h-4 mr-2" />
                      <span className="text-sm">1-2 minutes</span>
                    </div>
                  </div>

                  <Button className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                    Fill Form
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Realtime Conversation */}
          {mode === 'realtime' && (
            <motion.div
              key="realtime"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {user ? "Let's set up your preferences" : "Let's get you started"}
                  </h2>
                  <p className="text-gray-300 mb-6">
                    {user 
                      ? "Chat with our AI assistant to personalize your experience"
                      : "Chat with our AI assistant to create your account and set up your preferences"
                    }
                  </p>
                  
                  {/* Microphone Permission Notice */}
                  {microphonePermission === 'prompt' && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                      <p className="text-blue-200 text-sm">
                        <strong>Voice Chat Available:</strong> We'll ask for microphone access to enable voice conversation. 
                        You can also use text chat if you prefer.
                      </p>
                    </div>
                  )}
                  
                  {microphonePermission === 'denied' && (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                      <p className="text-yellow-200 text-sm">
                        <strong>Microphone Access Denied:</strong> Voice chat is disabled. 
                        You can still use text chat or enable microphone access in your browser settings.
                      </p>
                    </div>
                  )}
                </div>

                {/* Conversation Status */}
                <div className="flex items-center justify-center mb-8">
                  <div className={`flex items-center space-x-4 p-4 rounded-lg ${
                    conversation.status === 'connected' 
                      ? 'bg-green-500/20 border border-green-500/30' 
                      : 'bg-gray-500/20 border border-gray-500/30'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      conversation.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium text-white">
                      {conversation.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                    
                    {conversation.isSpeaking && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        <span className="text-sm text-blue-200">AI is speaking...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversation Controls */}
                <div className="flex flex-col items-center space-y-6">
                  {conversation.status === 'disconnected' ? (
                    <button
                      onClick={startConversation}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-3"
                    >
                      <Mic className="w-6 h-6" />
                      <span>Start Conversation</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={endConversation}
                        className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                      >
                        End Conversation
                      </button>
                      
                      <button
                        onClick={toggleMute}
                        className={`p-3 rounded-lg font-semibold transition-colors ${
                          isMuted 
                            ? 'bg-gray-500 text-white hover:bg-gray-600' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                  )}

                  {/* Volume Control */}
                  {conversation.status === 'connected' && (
                    <div className="flex items-center space-x-4 w-full max-w-xs">
                      <Volume2 className="w-4 h-4 text-gray-300" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-300 w-8">{Math.round(volume * 100)}%</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="mt-8 p-6 bg-black/20 rounded-lg">
                  <h3 className="font-semibold text-white mb-3">How it works:</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Click "Start Conversation" to begin chatting with our AI assistant</li>
                    <li>• The AI will guide you through setting up your account and preferences</li>
                    <li>• You can speak naturally or type your responses</li>
                    <li>• The AI will ask about your interests, content preferences, and personalization options</li>
                    <li>• Your preferences will be saved automatically during the conversation</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Manual Onboarding */}
          {mode === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold text-white">Setup Your Preferences</h2>
                    <span className="text-gray-300">
                      {currentStep + 1} of {manualSteps.length}
                    </span>
                  </div>
                  <Progress value={((currentStep + 1) / manualSteps.length) * 100} className="mb-4" />
                </div>

                <div className="space-y-8">
                  {/* Interests Step */}
                  {currentStep === 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">What interests you?</h3>
                      
                      {/* Predefined Interest Options */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {INTEREST_OPTIONS.map((interest) => (
                          <button
                            key={interest}
                            onClick={() => {
                              const newInterests = onboardingData.interests.includes(interest)
                                ? onboardingData.interests.filter(i => i !== interest)
                                : [...onboardingData.interests, interest];
                              handleManualStepChange('interests', newInterests);
                            }}
                            className={`p-3 rounded-lg text-sm transition-all ${
                              onboardingData.interests.includes(interest)
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>

                      {/* Custom Interest Input */}
                      <div className="border-t border-white/20 pt-6">
                        <h4 className="text-lg font-medium text-white mb-3">Add your own interests:</h4>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={customInterest}
                            onChange={(e) => setCustomInterest(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type an interest and press Enter..."
                            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                          />
                          <button
                            onClick={addCustomInterest}
                            disabled={!customInterest.trim()}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                        
                        {/* Display Selected Interests */}
                        {onboardingData.interests.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-300 mb-2">Selected interests:</p>
                            <div className="flex flex-wrap gap-2">
                              {onboardingData.interests.map((interest, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-purple-500 text-white text-sm rounded-full flex items-center space-x-2"
                                >
                                  <span>{interest}</span>
                                  <button
                                    onClick={() => {
                                      const newInterests = onboardingData.interests.filter(i => i !== interest);
                                      handleManualStepChange('interests', newInterests);
                                    }}
                                    className="hover:bg-purple-600 rounded-full p-1"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Content Formats Step */}
                  {currentStep === 1 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Preferred content formats? (Select multiple)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CONTENT_FORMAT_OPTIONS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => {
                              const newFormats = onboardingData.contentFormats.includes(format.value)
                                ? onboardingData.contentFormats.filter(f => f !== format.value)
                                : [...onboardingData.contentFormats, format.value];
                              handleManualStepChange('contentFormats', newFormats);
                            }}
                            className={`p-4 rounded-lg flex items-center space-x-3 transition-all ${
                              onboardingData.contentFormats.includes(format.value)
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            <format.icon className="w-5 h-5" />
                            <span>{format.label}</span>
                            {onboardingData.contentFormats.includes(format.value) && (
                              <Check className="w-4 h-4 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {/* Display Selected Formats */}
                      {onboardingData.contentFormats.length > 0 && (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg">
                          <p className="text-sm text-gray-300 mb-2">You&apos;ll receive content in these formats:</p>
                          <div className="flex flex-wrap gap-2">
                            {onboardingData.contentFormats.map((format) => {
                              const formatOption = CONTENT_FORMAT_OPTIONS.find(f => f.value === format);
                              const IconComponent = formatOption?.icon;
                              return (
                                <span
                                  key={format}
                                  className="px-3 py-1 bg-purple-500 text-white text-sm rounded-full flex items-center space-x-1"
                                >
                                  {IconComponent && <IconComponent className="w-3 h-3" />}
                                  <span>{formatOption?.label}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Time Preference Step */}
                  {currentStep === 2 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Daily time for content?</h3>
                      <div className="space-y-4">
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={onboardingData.dailyTime}
                          onChange={(e) => handleManualStepChange('dailyTime', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-center">
                          <span className="text-2xl font-bold text-white">{onboardingData.dailyTime} minutes</span>
                          <p className="text-gray-300">per day</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Communication Style Step */}
                  {currentStep === 3 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Communication style?</h3>
                      <div className="space-y-3">
                        {COMMUNICATION_STYLES.map((style) => (
                          <button
                            key={style}
                            onClick={() => handleManualStepChange('communicationStyle', style)}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              onboardingData.communicationStyle === style
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning Goals Step */}
                  {currentStep === 4 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Learning goals?</h3>
                      <div className="space-y-3">
                        {LEARNING_GOALS.map((goal) => (
                          <button
                            key={goal}
                            onClick={() => {
                              const newGoals = onboardingData.learningGoals.includes(goal)
                                ? onboardingData.learningGoals.filter(g => g !== goal)
                                : [...onboardingData.learningGoals, goal];
                              handleManualStepChange('learningGoals', newGoals);
                            }}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              onboardingData.learningGoals.includes(goal)
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{goal}</span>
                              {onboardingData.learningGoals.includes(goal) && (
                                <Check className="w-4 h-4" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Information Preferences Step */}
                  {currentStep === 5 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">How do you like to receive information?</h3>
                      <div className="space-y-3">
                        {INFORMATION_PREFERENCES.map((pref) => (
                          <button
                            key={pref}
                            onClick={() => {
                              const newPrefs = onboardingData.informationPreferences.includes(pref)
                                ? onboardingData.informationPreferences.filter(p => p !== pref)
                                : [...onboardingData.informationPreferences, pref];
                              handleManualStepChange('informationPreferences', newPrefs);
                            }}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              onboardingData.informationPreferences.includes(pref)
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{pref}</span>
                              {onboardingData.informationPreferences.includes(pref) && (
                                <Check className="w-4 h-4" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={prevManualStep}
                    disabled={currentStep === 0}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={nextManualStep}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={
                      (currentStep === 0 && onboardingData.interests.length === 0) ||
                      (currentStep === 1 && onboardingData.contentFormats.length === 0) ||
                      (currentStep === 3 && !onboardingData.communicationStyle) ||
                      (currentStep === 4 && onboardingData.learningGoals.length === 0) ||
                      (currentStep === 5 && onboardingData.informationPreferences.length === 0)
                    }
                  >
                    {currentStep === manualSteps.length - 1 ? 'Complete Setup' : 'Next'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Processing */}
          {mode === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Creating Your Personalized Content
                  </h2>
                  <p className="text-gray-300 text-lg">
                    We&apos;re analyzing your preferences and generating custom content just for you...
                  </p>
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-white">Analyzing your interests and goals</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-white">Searching for relevant recent content</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                    <span className="text-white">Generating personalized podcast</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-gray-400 rounded border-dashed" />
                    <span className="text-gray-400">Creating rich text report</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-gray-400 rounded border-dashed" />
                    <span className="text-gray-400">Preparing TikTok script</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Complete */}
          {mode === 'complete' && generatedContent && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-4">
                  Your Personalized Content is Ready!
                </h1>
                <p className="text-xl text-gray-300">
                  Based on your preferences, we&apos;ve created custom content in multiple formats
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Podcast Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Headphones className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Podcast</h3>
                      <p className="text-sm text-gray-300">Audio content</p>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm">
                    {generatedContent.podcast.description}
                  </p>
                  <div className="space-y-2">
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                      <Play className="w-4 h-4 mr-2" />
                      Play Podcast
                    </Button>
                    {generatedContent.richTextReport && (
                      <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                    )}
                  </div>
                </div>

                {/* Report Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Rich Report</h3>
                      <p className="text-sm text-gray-300">Detailed analysis</p>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm">
                    Comprehensive written report with links and references
                  </p>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500">
                    <FileText className="w-4 h-4 mr-2" />
                    Read Report
                  </Button>
                </div>

                {/* TikTok Script Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">TikTok Script</h3>
                      <p className="text-sm text-gray-300">Video content</p>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm">
                    Short-form video script optimized for social media
                  </p>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-orange-500">
                    <Video className="w-4 h-4 mr-2" />
                    View Script
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => router.push('/dashboard')}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  Go to Dashboard
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 