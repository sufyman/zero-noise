"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Headphones, 
  FileText, 
  Video, 
  Play, 
  Pause, 
  ArrowLeft, 
  LogOut, 
  User, 
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Mic,
  Send,
  MessageSquare,
  X
} from "lucide-react";

// Speech Recognition types
interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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

interface ContentCard {
  id: string;
  type: 'podcast' | 'report' | 'tiktok';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'in-progress' | 'complete' | 'error';
  progress?: number;
  estimatedTime?: string;
}

interface PodcastSegment {
  speaker: string;
  text: string;
  timestamp: number;
}

interface PodcastState {
  segments: PodcastSegment[];
  currentSegmentIndex: number;
  isPlaying: boolean;
  isGeneratingAudio: boolean;
  audioProgress: number;
  totalDuration: number;
  currentAudio: HTMLAudioElement | null;
  isListeningForQuestion: boolean;
  userQuestion: string;
  isProcessingQuestion: boolean;
  playbackSpeed: number;
  isPaused: boolean;
  showTextInput: boolean;
  textQuestion: string;
  showQuestionModal: boolean;
  wasPlayingBeforeModal: boolean;
  aiResponse: string;
  showAiResponse: boolean;
  currentAiAudio: HTMLAudioElement | null;
}

export default function DashboardPage() {
  const [, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [contentCards, setContentCards] = useState<ContentCard[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentCard | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  
  // Podcast-specific state
  const [podcastState, setPodcastState] = useState<PodcastState>({
    segments: [],
    currentSegmentIndex: 0,
    isPlaying: false,
    isGeneratingAudio: false,
    audioProgress: 0,
    totalDuration: 0,
    currentAudio: null,
    isListeningForQuestion: false,
    userQuestion: '',
    isProcessingQuestion: false,
    playbackSpeed: 1.0,
    isPaused: false,
    showTextInput: false,
    textQuestion: '',
    showQuestionModal: false,
    wasPlayingBeforeModal: false,
    aiResponse: '',
    showAiResponse: false,
    currentAiAudio: null
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement[]>([]);

  // Voice configurations for ElevenLabs
  const voices = {
    Alex: 'pNInz6obpgDQGcFmaJgB', // Adam - deep, clear male voice
    Jordan: 'EXAVITQu4vr4xnSDxMaL' // Bella - clear, professional female voice
  };

  // Check authentication and load onboarding data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check authentication
        const authResponse = await fetch('/api/auth');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          setUser(authData);
        } else {
          // Not authenticated, redirect to login
          window.location.href = '/';
          return;
        }

        // Load user preferences from database
        const preferencesResponse = await fetch('/api/preferences');
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          
          if (preferencesData.hasPreferences) {
            // Convert database preferences to onboarding data format
            const preferences = preferencesData.preferences;
            const data: OnboardingData = {
              interests: preferences.interests || [],
              contentFormats: preferences.contentFormat ? preferences.contentFormat.split(',') : ['podcast'],
              dailyTime: preferences.dailyTime || 15,
              podcastStyle: preferences.podcastStyle || 'conversational',
              preferredSpeed: preferences.preferredSpeed || 1.5,
              personalityTraits: [],
              communicationStyle: preferences.podcastStyle || 'Casual & Conversational',
              learningGoals: [],
              informationPreferences: []
            };
            
            setOnboardingData(data);

            // Check localStorage for content generation status (temporary during generation)
            const contentGenerationStatus = localStorage.getItem('contentGenerationStatus');
            const storedGeneratedContent = localStorage.getItem('generatedContent');

            // Initialize content cards based on selected formats
            const cards: ContentCard[] = [];

            if (data.contentFormats.includes('podcast')) {
              cards.push({
                id: 'podcast',
                type: 'podcast',
                title: `${data.interests.slice(0, 2).join(' & ')} Weekly Podcast`,
                description: `A ${data.dailyTime}-minute personalized podcast covering your interests`,
                icon: Headphones,
                status: contentGenerationStatus === 'complete' ? 'complete' : 
                       contentGenerationStatus === 'error' ? 'error' : 'in-progress',
                estimatedTime: `${data.dailyTime} min`
              });
            }

            if (data.contentFormats.includes('text')) {
              cards.push({
                id: 'report',
                type: 'report',
                title: `${data.interests[0]} Trends Report`,
                description: 'Comprehensive analysis with actionable insights',
                icon: FileText,
                status: contentGenerationStatus === 'complete' ? 'complete' : 
                       contentGenerationStatus === 'error' ? 'error' : 'in-progress',
                estimatedTime: '5-10 min read'
              });
            }

            if (data.contentFormats.includes('video')) {
              cards.push({
                id: 'tiktok',
                type: 'tiktok',
                title: `60-Second ${data.interests[0]} Breakthrough`,
                description: 'Engaging short-form video script for social media',
                icon: Video,
                status: contentGenerationStatus === 'complete' ? 'complete' : 
                       contentGenerationStatus === 'error' ? 'error' : 'in-progress',
                estimatedTime: '60 seconds'
              });
            }

            setContentCards(cards);

            // Load generated content if available
            if (storedGeneratedContent && contentGenerationStatus === 'complete') {
              const content = JSON.parse(storedGeneratedContent);
              setGeneratedContent(content);
              
              // Parse podcast script into segments if podcast content exists
              if (content.podcast && content.podcast.script) {
                const segments = parsePodcastScript(content.podcast.script);
                setPodcastState(prev => ({ ...prev, segments }));
              }
            }
          } else {
            // User hasn't completed onboarding, redirect to onboarding
            window.location.href = '/onboarding';
            return;
          }
        } else {
          // Error loading preferences, redirect to onboarding
          window.location.href = '/onboarding';
          return;
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // On error, redirect to onboarding
        window.location.href = '/onboarding';
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndLoadData();

    // Poll for content generation completion
    const pollInterval = setInterval(() => {
      const status = localStorage.getItem('contentGenerationStatus');
      const storedContent = localStorage.getItem('generatedContent');
      
      if (status === 'complete' && storedContent) {
        const content = JSON.parse(storedContent);
        setGeneratedContent(content);
        
        // Parse podcast script into segments
        if (content.podcast && content.podcast.script) {
          const segments = parsePodcastScript(content.podcast.script);
          setPodcastState(prev => ({ ...prev, segments }));
        }
        
        setContentCards(prev => prev.map(card => ({
          ...card,
          status: 'complete' as const
        })));
        clearInterval(pollInterval);
      } else if (status === 'error') {
        setContentCards(prev => prev.map(card => ({
          ...card,
          status: 'error' as const
        })));
        clearInterval(pollInterval);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, []);

  // Handle user question interruption
  const handleUserQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;
    
    // Pause current audio immediately
    if (currentAudioRef.current && podcastState.isPlaying) {
      currentAudioRef.current.pause();
    }
    
    setPodcastState(prev => ({ 
      ...prev, 
      isProcessingQuestion: true,
      isPlaying: false,
      isPaused: true
    }));

    try {
      // Generate AI response to user question using OpenAI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          context: `Current podcast context: ${podcastState.segments[podcastState.currentSegmentIndex]?.text || ''}. User interests: ${onboardingData?.interests.join(', ') || ''}`,
          systemPrompt: `You are Alex and Jordan, the podcast hosts. The user just interrupted with a question. Respond as both hosts would - Alex with practical insights, Jordan with thoughtful analysis. Keep responses conversational and under 100 words each.`
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Create response segments
        const responseSegments: PodcastSegment[] = [
          {
            speaker: 'Alex',
            text: `Great question! ${responseData.alexResponse || responseData.response || 'Let me think about that...'}`,
            timestamp: 0
          },
          {
            speaker: 'Jordan', 
            text: responseData.jordanResponse || `I'd add to what Alex said - ${responseData.response || 'that\'s a really interesting point.'}`,
            timestamp: 15
          }
        ];

        // Generate and play response audio
        for (const segment of responseSegments) {
          const responseAudio = await generateSegmentAudio(segment);
          await new Promise<void>((resolve) => {
            responseAudio.onended = () => resolve();
            responseAudio.play();
          });
        }

        // Resume original podcast
        if (currentAudioRef.current) {
          setPodcastState(prev => ({ 
            ...prev, 
            isPlaying: true,
            isPaused: false
          }));
          currentAudioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error handling user question:', error);
      // Resume podcast even if question handling fails
      if (currentAudioRef.current) {
        setPodcastState(prev => ({ 
          ...prev, 
          isPlaying: true,
          isPaused: false
        }));
        currentAudioRef.current.play();
      }
    } finally {
      setPodcastState(prev => ({ 
        ...prev, 
        isProcessingQuestion: false,
        userQuestion: ''
      }));
    }
  }, [podcastState.isPlaying, podcastState.segments, podcastState.currentSegmentIndex, onboardingData?.interests]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setPodcastState(prev => ({ 
            ...prev, 
            userQuestion: transcript,
            isListeningForQuestion: false 
          }));
          handleUserQuestion(transcript);
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          
          let errorMessage = '';
          switch (event.error) {
            case 'network':
              errorMessage = 'Network error. Please check your internet connection and try again.';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone access denied. Please enable microphone permissions.';
              break;
            case 'no-speech':
              errorMessage = 'No speech detected. Please try speaking again.';
              break;
            case 'audio-capture':
              errorMessage = 'Audio capture failed. Please check your microphone.';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service not allowed. Please try again.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
          }
          
          setPodcastState(prev => ({ 
            ...prev, 
            isListeningForQuestion: false,
            userQuestion: errorMessage
          }));
          
          // Clear the error message after 4 seconds
          setTimeout(() => {
            setPodcastState(prev => ({ ...prev, userQuestion: '' }));
          }, 4000);
        };

        recognitionRef.current.onend = () => {
          setPodcastState(prev => ({ ...prev, isListeningForQuestion: false }));
        };
      }
    }
  }, [handleUserQuestion]);

  // Parse podcast script into segments with speakers
  const parsePodcastScript = (script: string): PodcastSegment[] => {
    const segments: PodcastSegment[] = [];
    const lines = script.split('\n').filter(line => line.trim());
    
    let currentTimestamp = 0;
    let currentSpeaker = 'Alex'; // Default speaker
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Check if line indicates speaker change
      if (trimmedLine.toLowerCase().includes('jordan') || trimmedLine.toLowerCase().includes('host 2')) {
        currentSpeaker = 'Jordan';
      } else if (trimmedLine.toLowerCase().includes('alex') || trimmedLine.toLowerCase().includes('host 1')) {
        currentSpeaker = 'Alex';
      }
      
      // Skip speaker name lines
      if (trimmedLine.toLowerCase().startsWith('alex:') || 
          trimmedLine.toLowerCase().startsWith('jordan:') ||
          trimmedLine.toLowerCase().startsWith('host 1:') ||
          trimmedLine.toLowerCase().startsWith('host 2:')) {
        const text = trimmedLine.split(':').slice(1).join(':').trim();
        if (text) {
          segments.push({
            speaker: currentSpeaker,
            text: text,
            timestamp: currentTimestamp
          });
          currentTimestamp += Math.max(15, text.length / 10); // Estimate duration
        }
      } else if (trimmedLine.length > 20) { // Substantial content
        segments.push({
          speaker: currentSpeaker,
          text: trimmedLine,
          timestamp: currentTimestamp
        });
        currentTimestamp += Math.max(15, trimmedLine.length / 10);
        
        // Alternate speakers for natural conversation
        currentSpeaker = currentSpeaker === 'Alex' ? 'Jordan' : 'Alex';
      }
    }
    
    return segments;
  };

  // Generate audio for a segment using ElevenLabs
  const generateSegmentAudio = async (segment: PodcastSegment): Promise<HTMLAudioElement> => {
    try {
      const voiceId = voices[segment.speaker as keyof typeof voices];
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: segment.text,
          voiceId: voiceId,
          speed: podcastState.playbackSpeed
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = podcastState.playbackSpeed;
      
      return new Promise((resolve, reject) => {
        audio.onloadeddata = () => resolve(audio);
        audio.onerror = () => reject(new Error('Failed to load audio'));
      });
    } catch (error) {
      console.error('Error generating segment audio:', error);
      throw error;
    }
  };

  // Start playing podcast with audio generation
  const startPodcastPlayback = async () => {
    if (podcastState.segments.length === 0) return;
    
    setPodcastState(prev => ({ 
      ...prev, 
      isGeneratingAudio: true, 
      currentSegmentIndex: 0,
      isPaused: false
    }));

    try {
      // Generate audio for first segment
      const firstSegment = podcastState.segments[0];
      const firstAudio = await generateSegmentAudio(firstSegment);
      
      audioQueueRef.current = [firstAudio];
      currentAudioRef.current = firstAudio;
      
      setPodcastState(prev => ({ 
        ...prev, 
        isGeneratingAudio: false,
        isPlaying: true,
        currentAudio: firstAudio
      }));

      // Start playing first segment
      playCurrentSegment(0);
      
    } catch (error) {
      console.error('Error starting podcast playback:', error);
      setPodcastState(prev => ({ 
        ...prev, 
        isGeneratingAudio: false 
      }));
    }
  };

  // Play current segment
  const playCurrentSegment = (segmentIndex: number) => {
    const audio = audioQueueRef.current[segmentIndex];
    if (!audio) return;

    currentAudioRef.current = audio;
    audio.playbackRate = podcastState.playbackSpeed;

    audio.onended = () => {
      const nextIndex = segmentIndex + 1;
      if (nextIndex < podcastState.segments.length && !podcastState.isPaused) {
        setPodcastState(prev => ({ 
          ...prev, 
          currentSegmentIndex: nextIndex 
        }));
        
        // Generate next segment audio if not already generated
        if (nextIndex >= audioQueueRef.current.length) {
          setPodcastState(prev => ({ ...prev, isGeneratingAudio: true }));
          generateSegmentAudio(podcastState.segments[nextIndex])
            .then(nextAudio => {
              audioQueueRef.current.push(nextAudio);
              setPodcastState(prev => ({ ...prev, isGeneratingAudio: false }));
              if (!podcastState.isPaused) {
                playCurrentSegment(nextIndex);
              }
            })
            .catch(console.error);
        } else {
          playCurrentSegment(nextIndex);
        }
      } else {
        setPodcastState(prev => ({ ...prev, isPlaying: false }));
      }
    };

    audio.play().catch(console.error);
  };

  // Pause/Resume podcast
  const togglePodcastPlayback = () => {
    if (currentAudioRef.current) {
      if (podcastState.isPlaying && !podcastState.isPaused) {
        currentAudioRef.current.pause();
        setPodcastState(prev => ({ ...prev, isPaused: true }));
      } else if (podcastState.isPaused) {
        currentAudioRef.current.play();
        setPodcastState(prev => ({ ...prev, isPaused: false }));
      }
    }
  };

  // Change playback speed
  const changePlaybackSpeed = (speed: number) => {
    setPodcastState(prev => ({ ...prev, playbackSpeed: speed }));
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = speed;
    }
  };

  // Start listening for user question
  const startListening = async () => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not available');
      return;
    }

    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately, we just needed permission
      
      setPodcastState(prev => ({ 
        ...prev, 
        isListeningForQuestion: true 
      }));
      
      recognitionRef.current.start();
    } catch (error) {
      console.error('Microphone permission denied or not available:', error);
      
      // Show user-friendly error message
      setPodcastState(prev => ({ 
        ...prev, 
        isListeningForQuestion: false,
        userQuestion: 'Microphone access denied. Please enable microphone permissions and try again.'
      }));
      
      // Clear the error message after 3 seconds
      setTimeout(() => {
        setPodcastState(prev => ({ ...prev, userQuestion: '' }));
      }, 3000);
    }
  };

  const handleCardClick = (card: ContentCard) => {
    if (card.status === 'complete' && generatedContent) {
      setSelectedContent(card);
    }
  };

  const handleBackToCards = () => {
    setSelectedContent(null);
    if (podcastState.currentAudio) {
      podcastState.currentAudio.pause();
      setPodcastState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      localStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusIcon = (status: ContentCard['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = (status: ContentCard['status']) => {
    switch (status) {
      case 'complete':
        return 'Ready to view';
      case 'error':
        return 'Generation failed';
      default:
        return 'Generating...';
    }
  };

  // Handle text input change
  const handleTextInputChange = (value: string) => {
    setPodcastState(prev => ({ ...prev, textQuestion: value }));
  };

  // Open question modal
  const openQuestionModal = () => {
    // Pause podcast if playing
    const wasPlaying = podcastState.isPlaying && !podcastState.isPaused;
    if (wasPlaying && currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    
    setPodcastState(prev => ({ 
      ...prev, 
      showQuestionModal: true,
      wasPlayingBeforeModal: wasPlaying,
      isPaused: wasPlaying,
      showTextInput: false,
      textQuestion: '',
      userQuestion: '',
      isListeningForQuestion: false
    }));
  };

  // Close question modal
  const closeQuestionModal = () => {
    // Stop any ongoing speech recognition
    if (recognitionRef.current && podcastState.isListeningForQuestion) {
      recognitionRef.current.stop();
    }
    
    // Stop all AI response audio
    aiAudioRef.current.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    aiAudioRef.current = [];
    
    // Stop current AI audio if playing
    if (podcastState.currentAiAudio && !podcastState.currentAiAudio.paused) {
      podcastState.currentAiAudio.pause();
      podcastState.currentAiAudio.currentTime = 0;
    }
    
    // Resume podcast if it was playing before modal
    if (podcastState.wasPlayingBeforeModal && currentAudioRef.current) {
      currentAudioRef.current.play();
      setPodcastState(prev => ({ 
        ...prev, 
        isPaused: false,
        isPlaying: true
      }));
    }
    
    setPodcastState(prev => ({ 
      ...prev, 
      showQuestionModal: false,
      wasPlayingBeforeModal: false,
      showTextInput: false,
      textQuestion: '',
      userQuestion: '',
      isListeningForQuestion: false,
      isProcessingQuestion: false,
      aiResponse: '',
      showAiResponse: false,
      currentAiAudio: null
    }));
  };

  // Handle question submission from modal
  const handleModalQuestion = async (question: string) => {
    if (!question.trim()) return;
    
    // Keep modal open but clear input and show processing state
    setPodcastState(prev => ({ 
      ...prev, 
      isProcessingQuestion: true,
      showTextInput: false,
      textQuestion: '',
      userQuestion: question,
      isListeningForQuestion: false,
      aiResponse: '',
      showAiResponse: false
    }));
    
    try {
      // Generate AI response to user question using OpenAI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          context: `Current podcast context: ${podcastState.segments[podcastState.currentSegmentIndex]?.text || ''}. User interests: ${onboardingData?.interests.join(', ') || ''}`,
          systemPrompt: `You are Alex and Jordan, the podcast hosts. The user just interrupted with a question. Respond as both hosts would - Alex with practical insights, Jordan with thoughtful analysis. Keep responses conversational and under 100 words each.`
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Show AI response in modal
        const fullResponse = `Alex: ${responseData.alexResponse || responseData.response || 'Let me think about that...'}\n\nJordan: ${responseData.jordanResponse || `I'd add to what Alex said - ${responseData.response || 'that\'s a really interesting point.'}`}`;
        
        setPodcastState(prev => ({ 
          ...prev, 
          aiResponse: fullResponse,
          showAiResponse: true
        }));
        
        // Create response segments
        const responseSegments: PodcastSegment[] = [
          {
            speaker: 'Alex',
            text: `Great question! ${responseData.alexResponse || responseData.response || 'Let me think about that...'}`,
            timestamp: 0
          },
          {
            speaker: 'Jordan', 
            text: responseData.jordanResponse || `I'd add to what Alex said - ${responseData.response || 'that\'s a really interesting point.'}`,
            timestamp: 15
          }
        ];

        // Generate and play response audio
        for (const segment of responseSegments) {
          const responseAudio = await generateSegmentAudio(segment);
          
          // Track AI audio for cleanup
          aiAudioRef.current.push(responseAudio);
          setPodcastState(prev => ({ ...prev, currentAiAudio: responseAudio }));
          
          await new Promise<void>((resolve) => {
            responseAudio.onended = () => {
              setPodcastState(prev => ({ ...prev, currentAiAudio: null }));
              resolve();
            };
            responseAudio.play();
          });
        }

        // Mark processing as complete
        setPodcastState(prev => ({ 
          ...prev, 
          isProcessingQuestion: false
        }));
      }
    } catch (error) {
      console.error('Error handling user question:', error);
      setPodcastState(prev => ({ 
        ...prev, 
        isProcessingQuestion: false,
        aiResponse: 'Sorry, I encountered an error processing your question. Please try again.',
        showAiResponse: true
      }));
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!onboardingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to Zero Noise</h1>
          <p className="text-gray-300 mb-6">Complete your onboarding to get started</p>
          <Button 
            onClick={() => window.location.href = '/onboarding'}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            Start Onboarding
          </Button>
        </div>
      </div>
    );
  }

  // Selected content view
  if (selectedContent && generatedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={handleBackToCards}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Content Display */}
          <div className="max-w-4xl mx-auto">
            {selectedContent.type === 'podcast' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
              >
                <div className="text-center mb-8">
                  <Headphones className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {generatedContent.podcast.title}
                  </h1>
                  <p className="text-gray-300 text-lg">
                    {generatedContent.podcast.description}
                  </p>
                </div>

                {/* Interactive Podcast Controls */}
                <div className="bg-white/5 rounded-xl p-6 mb-8">
                  <div className="flex justify-center space-x-4 mb-6">
                    <Button
                      onClick={podcastState.segments.length > 0 && !podcastState.isPlaying ? startPodcastPlayback : togglePodcastPlayback}
                      disabled={podcastState.isGeneratingAudio || podcastState.segments.length === 0}
                      size="lg"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {podcastState.isGeneratingAudio ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Audio...
                        </>
                      ) : podcastState.isPlaying && !podcastState.isPaused ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 mr-2" />
                          {podcastState.isPaused ? 'Resume' : 'Play Podcast'}
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={openQuestionModal}
                      disabled={podcastState.isProcessingQuestion || !podcastState.isPlaying}
                      variant="outline"
                      size="lg"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      {podcastState.isProcessingQuestion ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-5 h-5 mr-2" />
                          Ask Question
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Playback Speed Controls */}
                  <div className="flex justify-center items-center space-x-4 mb-6">
                    <span className="text-sm text-gray-400">Speed:</span>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                      <Button
                        key={speed}
                        onClick={() => changePlaybackSpeed(speed)}
                        variant={podcastState.playbackSpeed === speed ? "default" : "outline"}
                        size="sm"
                        className={`text-xs ${
                          podcastState.playbackSpeed === speed 
                            ? 'bg-purple-500 text-white' 
                            : 'border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>

                  {/* Current Segment Display */}
                  {podcastState.segments.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-400">
                          {podcastState.segments[podcastState.currentSegmentIndex]?.speaker || 'Alex'}
                        </span>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>
                            Segment {podcastState.currentSegmentIndex + 1} of {podcastState.segments.length}
                          </span>
                          <span>
                            Speed: {podcastState.playbackSpeed}x
                          </span>
                        </div>
                      </div>
                      <p className="text-white text-sm leading-relaxed">
                        {podcastState.segments[podcastState.currentSegmentIndex]?.text || 'Loading...'}
                      </p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <Progress 
                      value={(podcastState.currentSegmentIndex / Math.max(podcastState.segments.length - 1, 1)) * 100} 
                      className="h-2" 
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Segment {podcastState.currentSegmentIndex + 1}</span>
                      <span>{podcastState.segments.length} segments total</span>
                    </div>
                  </div>

                  {/* User Question Display */}
                  {podcastState.userQuestion && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                      <p className="text-blue-200 text-sm">
                        <strong>Your Question:</strong> {podcastState.userQuestion}
                      </p>
                    </div>
                  )}

                  {/* Status Messages */}
                  {podcastState.isGeneratingAudio && (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                      <p className="text-yellow-200 text-sm">
                        🎵 Generating audio for segment {podcastState.currentSegmentIndex + 1}...
                      </p>
                    </div>
                  )}

                  {podcastState.isProcessingQuestion && (
                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 mb-4">
                      <p className="text-purple-200 text-sm">
                        🤔 Alex and Jordan are thinking about your question...
                      </p>
                    </div>
                  )}
                </div>

                {/* Question Modal */}
                {podcastState.showQuestionModal && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Ask a Question</h3>
                        <Button
                          onClick={closeQuestionModal}
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/10"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {/* Show conversation if question has been asked */}
                        {(podcastState.userQuestion || podcastState.showAiResponse) ? (
                          <div className="space-y-4">
                            {/* User Question */}
                            {podcastState.userQuestion && (
                              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-blue-200 text-sm">
                                  <strong>You:</strong> {podcastState.userQuestion}
                                </p>
                              </div>
                            )}
                            
                            {/* Processing State */}
                            {podcastState.isProcessingQuestion && (
                              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                  <p className="text-purple-200 text-sm">
                                    Alex and Jordan are thinking about your question...
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* AI Response */}
                            {podcastState.showAiResponse && (
                              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                                <p className="text-green-200 text-sm whitespace-pre-line">
                                  {podcastState.aiResponse}
                                </p>
                              </div>
                            )}
                            
                            {/* Continue Button */}
                            {podcastState.showAiResponse && !podcastState.isProcessingQuestion && (
                              <div className="flex space-x-2">
                                <Button
                                  onClick={closeQuestionModal}
                                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                >
                                  Continue Podcast
                                </Button>
                                <Button
                                  onClick={() => setPodcastState(prev => ({ 
                                    ...prev, 
                                    userQuestion: '', 
                                    aiResponse: '', 
                                    showAiResponse: false 
                                  }))}
                                  variant="outline"
                                  className="border-white/20 text-white hover:bg-white/10"
                                >
                                  Ask Another
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Voice Input */}
                            <div className="space-y-2">
                              <Button
                                onClick={startListening}
                                disabled={podcastState.isListeningForQuestion || podcastState.isProcessingQuestion}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                              >
                                {podcastState.isListeningForQuestion ? (
                                  <>
                                    <Mic className="w-5 h-5 mr-2 text-red-500" />
                                    🎤 Listening...
                                  </>
                                ) : (
                                  <>
                                    <Mic className="w-5 h-5 mr-2" />
                                    Speak Your Question
                                  </>
                                )}
                              </Button>
                              
                              {podcastState.userQuestion && !podcastState.isListeningForQuestion && !podcastState.showAiResponse && (
                                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                                  <p className="text-blue-200 text-sm">
                                    <strong>You said:</strong> {podcastState.userQuestion}
                                  </p>
                                  <div className="flex space-x-2 mt-2">
                                    <Button
                                      onClick={() => handleModalQuestion(podcastState.userQuestion)}
                                      size="sm"
                                      className="bg-green-500 hover:bg-green-600"
                                    >
                                      Submit
                                    </Button>
                                    <Button
                                      onClick={() => setPodcastState(prev => ({ ...prev, userQuestion: '' }))}
                                      size="sm"
                                      variant="outline"
                                      className="border-white/20 text-white hover:bg-white/10"
                                    >
                                      Try Again
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Divider */}
                            <div className="flex items-center space-x-4">
                              <div className="flex-1 h-px bg-white/20"></div>
                              <span className="text-gray-400 text-sm">or</span>
                              <div className="flex-1 h-px bg-white/20"></div>
                            </div>

                            {/* Text Input */}
                            <div className="space-y-2">
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={podcastState.textQuestion}
                                  onChange={(e) => handleTextInputChange(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleModalQuestion(podcastState.textQuestion)}
                                  placeholder="Type your question here..."
                                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  autoFocus={!podcastState.isListeningForQuestion}
                                  disabled={podcastState.isProcessingQuestion}
                                />
                                <Button
                                  onClick={() => handleModalQuestion(podcastState.textQuestion)}
                                  disabled={!podcastState.textQuestion.trim() || podcastState.isProcessingQuestion}
                                  className="bg-blue-500 hover:bg-blue-600"
                                >
                                  <Send className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Transcript */}
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Full Transcript</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {podcastState.segments.map((segment, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg ${
                          index === podcastState.currentSegmentIndex 
                            ? 'bg-purple-500/20 border border-purple-500/30' 
                            : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${
                            segment.speaker === 'Alex' ? 'text-blue-400' : 'text-pink-400'
                          }`}>
                            {segment.speaker}
                          </span>
                          <span className="text-xs text-gray-400">
                            {Math.floor(segment.timestamp / 60)}:{(segment.timestamp % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {segment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {selectedContent.type === 'report' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
              >
                <div className="text-center mb-8">
                  <FileText className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {generatedContent.richTextReport.title}
                  </h1>
                </div>

                <div className="prose prose-invert max-w-none">
                  <div 
                    className="text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: generatedContent.richTextReport.content.replace(/\n/g, '<br/>') 
                    }}
                  />
                </div>
              </motion.div>
            )}

            {selectedContent.type === 'tiktok' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
              >
                <div className="text-center mb-8">
                  <Video className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {generatedContent.tikTokScript.title}
                  </h1>
                  <p className="text-gray-300">60-second video script with lipsync preparation</p>
                </div>

                {/* Scene Breakdown */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-xl font-semibold text-white">Scene Breakdown</h3>
                  {generatedContent.tikTokScript.scenes.map((scene, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-400">
                          Scene {index + 1}
                        </span>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>{scene.duration}s</span>
                          <span className="capitalize">{scene.emotion}</span>
                        </div>
                      </div>
                      <p className="text-white text-sm leading-relaxed">
                        {scene.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Full Transcript */}
                <div className="bg-white/5 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Full Script</h3>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {generatedContent.tikTokScript.transcript}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Your Zero Noise Dashboard</h1>
              <p className="text-gray-300">
                Personalized content based on your interests: {onboardingData.interests.slice(0, 3).join(', ')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Content Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentCards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: card.status === 'complete' ? 1.02 : 1 }}
              className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all ${
                card.status === 'complete' 
                  ? 'cursor-pointer hover:bg-white/15' 
                  : 'cursor-default'
              }`}
              onClick={() => handleCardClick(card)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                {getStatusIcon(card.status)}
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-gray-300 text-sm mb-4">{card.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{card.estimatedTime}</span>
                </div>
                <span className={`text-sm font-medium ${
                  card.status === 'complete' ? 'text-green-400' :
                  card.status === 'error' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {getStatusText(card.status)}
                </span>
              </div>

              {card.status === 'in-progress' && (
                <div className="mt-4">
                  <Progress value={Math.random() * 70 + 20} className="h-2" />
                </div>
              )}

              {card.status === 'complete' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center text-purple-400 text-sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Click to view content
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* No content cards message */}
        {contentCards.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No content formats selected</h2>
            <p className="text-gray-300 mb-6">Go back to onboarding to select your preferred content formats</p>
            <Button 
              onClick={() => window.location.href = '/onboarding'}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Update Preferences
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}