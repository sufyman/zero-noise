"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { Progress } from "@/components/ui/progress";
import { Headphones, FileText, Mail, Video, Play, Pause, Volume2, MessageCircle, ArrowLeft, LogOut, User, Mic } from "lucide-react";

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


interface ContentFormat {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  isReady: boolean;
  isHighlighted?: boolean;
}

export default function DashboardPage() {
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [isPreparationComplete, setIsPreparationComplete] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Podcast audio generation state - moved from PodcastPlayer
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
  const [isPodcastGenerating, setIsPodcastGenerating] = useState(false);
  const [podcastGenerationProgress, setPodcastGenerationProgress] = useState({ current: 0, total: 0 });

  const contentFormats: ContentFormat[] = [
    {
      id: "podcast",
      name: "Daily Podcast",
      icon: Headphones,
      description: "5-min audio briefing with Tim Ferriss & Lex Friedman style",
      isReady: true,
      isHighlighted: true
    },
    {
      id: "report",
      name: "Written Report",
      icon: FileText,
      description: "Detailed analysis and insights",
      isReady: false
    },
    {
      id: "email",
      name: "Email Briefing",
      icon: Mail,
      description: "Concise summary for your inbox",
      isReady: false
    },
    {
      id: "video",
      name: "Video Summary",
      icon: Video,
      description: "Visual presentation of key points",
      isReady: false
    }
  ];

  const transcript = [
    { speaker: "Alex", text: "You can do it Sam! Welcome to your personalized daily briefing. I'm Alex, and I'm here with Jordan." },
    { speaker: "Jordan", text: "Good morning Sam. Today we're diving deep into the startup ecosystem with some fascinating developments." },
    { speaker: "Alex", text: "Let's start with consumer startups. There's been significant movement in the direct-to-consumer space..." },
    { speaker: "Jordan", text: "Speaking of consumer behavior, the SEO landscape is evolving rapidly with AI-driven search..." },
    { speaker: "Alex", text: "And that brings us to AI progress for startups. The democratization of AI tools is remarkable..." },
    { speaker: "Jordan", text: "Absolutely. Stable diffusion models are particularly interesting for content creation startups..." }
  ];

  // Helper function to combine audio blobs
  const combineAudioBlobs = async (blobs: Blob[]): Promise<Blob> => {
    const audioBuffers: ArrayBuffer[] = [];
    
    for (const blob of blobs) {
      const arrayBuffer = await blob.arrayBuffer();
      audioBuffers.push(arrayBuffer);
    }
    
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const buffer of audioBuffers) {
      combined.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    return new Blob([combined], { type: 'audio/mpeg' });
  };

  // Generate podcast audio - moved from PodcastPlayer
  const generatePodcastAudio = async () => {
    setIsPodcastGenerating(true);
    try {
      const voices = {
        Alex: 'pNInz6obpgDQGcFmaJgB',
        Jordan: 'EXAVITQu4vr4xnSDxMaL',
      };

      const audioSegments = [];
      setPodcastGenerationProgress({ current: 0, total: transcript.length });
      
      for (let i = 0; i < transcript.length; i++) {
        const item = transcript[i];
        const voiceId = voices[item.speaker as keyof typeof voices] || voices.Alex;
        setPodcastGenerationProgress({ current: i + 1, total: transcript.length });
        
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: item.text,
            voiceId: voiceId,
            speed: 1.5
          }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          audioSegments.push(audioBlob);
        } else {
          console.error(`Failed to generate audio for ${item.speaker}`);
          throw new Error(`Failed to generate audio for ${item.speaker}`);
        }
        
        if (i < transcript.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const combinedAudio = await combineAudioBlobs(audioSegments);
      const url = URL.createObjectURL(combinedAudio);
      setPodcastAudioUrl(url);
      
    } catch (error) {
      console.error('Error generating podcast audio:', error);
    } finally {
      setIsPodcastGenerating(false);
    }
  };

  // Check authentication status and preferences on mount
  useEffect(() => {
    const checkAuthAndPreferences = async () => {
      try {
        // Check authentication
        const authResponse = await fetch('/api/auth');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData.authenticated) {
            setUser(authData.user);
            
                         // Check if user has preferences
             const prefsResponse = await fetch('/api/preferences');
             if (prefsResponse.ok) {
               const prefsData = await prefsResponse.json();
               
               // If no preferences, redirect to onboarding
               if (!prefsData.hasPreferences) {
                 window.location.href = '/onboarding';
                 return;
               }
             } else {
               // No preferences, redirect to onboarding
               window.location.href = '/onboarding';
               return;
             }
          } else {
            // Not authenticated, redirect to home
            window.location.href = '/';
            return;
          }
        } else {
          // Not authenticated, redirect to home
          window.location.href = '/';
          return;
        }
      } catch {
        // Error checking auth, redirect to home
        window.location.href = '/';
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndPreferences();
  }, []);

  // Generate podcast audio when dashboard loads
  useEffect(() => {
    if (!isCheckingAuth && user) {
      generatePodcastAudio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingAuth, user]);

  useEffect(() => {
    // Simulate preparation progress
    const interval = setInterval(() => {
      setPreparationProgress(prev => {
        if (prev >= 100) {
          setIsPreparationComplete(true);
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleFormatClick = (formatId: string) => {
    if (formatId === "podcast") {
      setSelectedFormat(formatId);
    }
  };

  const handleBackToFeed = () => {
    setSelectedFormat(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (podcastAudioUrl) {
        URL.revokeObjectURL(podcastAudioUrl);
      }
    };
  }, [podcastAudioUrl]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (selectedFormat === "podcast") {
    return (
      <PodcastPlayer 
        onBack={handleBackToFeed} 
        preGeneratedAudioUrl={podcastAudioUrl}
        isGenerating={isPodcastGenerating}
        generationProgress={podcastGenerationProgress}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* User Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Welcome back!</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
              <span>Logout</span>
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Content Feed
            </h1>
            <p className="text-gray-600">
              Personalized daily briefings ready when you are
            </p>
          </div>

          {/* Preparation Progress */}
          {!isPreparationComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-8 mb-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Preparing Your Feed
                </h2>
                <p className="text-gray-600">
                  AI is curating content based on your preferences...
                </p>
              </div>
              
              <div className="max-w-md mx-auto">
                <Progress value={preparationProgress} className="h-3" />
                <p className="text-center text-sm text-gray-500 mt-2">
                  {preparationProgress}% complete
                </p>
              </div>
            </motion.div>
          )}

          {/* Content Formats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isPreparationComplete ? 1 : 0.5 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {contentFormats.map((format, index) => (
              <motion.div
                key={format.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: format.isHighlighted ? [1, 1.05, 1] : 1 
                }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  scale: {
                    repeat: format.isHighlighted ? Infinity : 0,
                    duration: 2
                  }
                }}
                className={`bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 cursor-pointer ${
                  format.isReady 
                    ? 'hover:shadow-xl hover:scale-105' 
                    : 'opacity-60 cursor-not-allowed'
                } ${
                  format.isHighlighted 
                    ? 'ring-2 ring-purple-300 ring-opacity-50' 
                    : ''
                }`}
                onClick={() => format.isReady && handleFormatClick(format.id)}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    format.isReady 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                      : 'bg-gray-300'
                  }`}>
                    <format.icon className={`w-8 h-8 ${
                      format.isReady ? 'text-white' : 'text-gray-500'
                    }`} />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {format.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {format.description}
                  </p>
                  
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    format.isReady 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {format.isReady ? 'Ready' : 'Preparing...'}
                  </div>
                  
                  {format.isHighlighted && format.isReady && (
                    <div className="mt-3">
                      <button 
                        style={{
                          background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)',
                          color: '#000000',
                          fontWeight: '600',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontSize: '14px'
                        }}
                        onClick={() => handleFormatClick(format.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #06b6d4 0%, #1d4ed8 100%)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 211, 238, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Listen Now
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Coming Soon Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20"
          >
            <p className="text-gray-600">
              Other formats will be ready shortly. For now, enjoy your personalized podcast! 🎧
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function PodcastPlayer({ onBack, preGeneratedAudioUrl, isGenerating, generationProgress }: { onBack: () => void, preGeneratedAudioUrl: string | null, isGenerating: boolean, generationProgress: { current: number, total: number } }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300); // 5 minutes
  const [playbackSpeed, setPlaybackSpeed] = useState(1.5);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Q&A Modal state - completely separate from main podcast
  const [showQAModal, setShowQAModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [qaResponses, setQaResponses] = useState<Array<{speaker: string, text: string}>>([]);
  const [qaAudioUrl, setQaAudioUrl] = useState<string | null>(null);
  const [qaAudioElement, setQaAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isQAPlaying, setIsQAPlaying] = useState(false);
  const [qaGenerationProgress, setQaGenerationProgress] = useState({ current: 0, total: 0 });

  const podcastContent = {
    title: "Daily Tech & Startup Briefing",
    date: new Date().toLocaleDateString(),
    hosts: ["Alex (Tim Ferriss style)", "Jordan (Lex Friedman style)"],
    topics: [
      "Consumer Startup News",
      "SEO Trends Update", 
      "AI Progress for Startups",
      "Stable Diffusion Models"
    ]
  };

  const transcript = [
    { speaker: "Alex", text: "You can do it Sam! Welcome to your personalized daily briefing. I'm Alex, and I'm here with Jordan." },
    { speaker: "Jordan", text: "Good morning Sam. Today we're diving deep into the startup ecosystem with some fascinating developments." },
    { speaker: "Alex", text: "Let's start with consumer startups. There's been significant movement in the direct-to-consumer space..." },
    { speaker: "Jordan", text: "Speaking of consumer behavior, the SEO landscape is evolving rapidly with AI-driven search..." },
    { speaker: "Alex", text: "And that brings us to AI progress for startups. The democratization of AI tools is remarkable..." },
    { speaker: "Jordan", text: "Absolutely. Stable diffusion models are particularly interesting for content creation startups..." }
  ];

  // Helper function to combine audio blobs for Q&A
  const combineAudioBlobs = async (blobs: Blob[]): Promise<Blob> => {
    const audioBuffers: ArrayBuffer[] = [];
    
    for (const blob of blobs) {
      const arrayBuffer = await blob.arrayBuffer();
      audioBuffers.push(arrayBuffer);
    }
    
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const buffer of audioBuffers) {
      combined.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    return new Blob([combined], { type: 'audio/mpeg' });
  };

  // Handle play/pause for main podcast
  const handlePlayPause = async () => {
    // If audio is still generating, just wait
    if (isGenerating) {
      return;
    }
    
    // If no audio element exists and not generating, something went wrong
    if (!audioElement && !isGenerating && preGeneratedAudioUrl) {
      const audio = new Audio(preGeneratedAudioUrl);
      audio.playbackRate = playbackSpeed;
      setAudioElement(audio);
      setAudioUrl(preGeneratedAudioUrl);
      audio.play();
      setIsPlaying(true);
      return;
    }
    
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  // Open Q&A modal (pause podcast)
  const handleAskQuestion = () => {
    // Pause the main podcast when opening modal
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
      setIsPlaying(false);
    }
    
    setShowQAModal(true);
    setUserQuestion('');
    setQaResponses([]);
  };

  // Close Q&A modal and cleanup (resume podcast)
  const handleCloseQAModal = () => {
    setShowQAModal(false);
    setIsListening(false);
    setIsGeneratingResponse(false);
    setUserQuestion('');
    setQaResponses([]);
    
    // Cleanup Q&A audio
    if (qaAudioElement) {
      qaAudioElement.pause();
      setIsQAPlaying(false);
    }
    if (qaAudioUrl) {
      URL.revokeObjectURL(qaAudioUrl);
      setQaAudioUrl(null);
    }
    setQaAudioElement(null);
    
    // Resume the main podcast when closing modal
    if (audioElement && audioElement.paused) {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  // Start speech recognition in modal
  const startListening = async () => {
    // Check if we're on HTTPS or localhost (required for speech recognition)
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      const question = prompt('Speech recognition requires HTTPS or localhost. What would you like to ask the hosts?');
      if (question) {
        setUserQuestion(question);
        await processQuestion(question);
      }
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const question = prompt('Speech recognition not supported in this browser. Try Chrome, Edge, or Safari. What would you like to ask the hosts?');
      if (question) {
        setUserQuestion(question);
        await processQuestion(question);
      }
      return;
    }

    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not available');
      }
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      // Add timeout to prevent hanging
      const recognitionTimeout = setTimeout(() => {
        recognition.abort();
        setIsListening(false);
        console.log('Speech recognition timed out');
      }, 10000); // 10 second timeout

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        clearTimeout(recognitionTimeout);
        const transcript = event.results[0][0].transcript;
        setUserQuestion(transcript);
        processQuestion(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        clearTimeout(recognitionTimeout);
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Speech recognition failed.';
        let shouldPrompt = true;
        
        if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try speaking again.';
          shouldPrompt = false; // Don't prompt for no-speech, let user try again
        } else if (event.error === 'network') {
          errorMessage = 'Network connection error. This can happen due to browser restrictions or connectivity issues. You can still type your question.';
        } else if (event.error === 'aborted') {
          errorMessage = 'Speech recognition was cancelled.';
          shouldPrompt = false;
        } else if (event.error === 'audio-capture') {
          errorMessage = 'Could not capture audio. Please check your microphone.';
        } else if (event.error === 'service-not-allowed') {
          errorMessage = 'Speech recognition service is not available.';
        }
        
        if (shouldPrompt) {
          const question = prompt(`${errorMessage} What would you like to ask the hosts?`);
          if (question) {
            setUserQuestion(question);
            processQuestion(question);
          }
        } else {
          console.log(errorMessage);
        }
      };

      recognition.onend = () => {
        clearTimeout(recognitionTimeout);
        setIsListening(false);
      };

      recognition.start();
      
    } catch (error) {
      console.error('Microphone permission error:', error);
      const question = prompt('Microphone access required for speech recognition. What would you like to ask the hosts?');
      if (question) {
        setUserQuestion(question);
        await processQuestion(question);
      }
    }
  };

  // Process the user's question (in modal)
  const processQuestion = async (question: string) => {
    setIsGeneratingResponse(true);
    try {
      // Get AI response from hosts
      const response = await fetch('/api/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from hosts');
      }

      const { responses } = await response.json();
      setQaResponses(responses);
      
      // Generate audio for the responses
      await generateQAResponseAudio(responses);
      
    } catch (error) {
      console.error('Error processing question:', error);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  // Generate audio for Q&A responses (separate from main podcast)
  const generateQAResponseAudio = async (responses: Array<{speaker: string, text: string}>) => {
    setIsGeneratingResponse(true);
    try {
      const voices = {
        Alex: 'pNInz6obpgDQGcFmaJgB',
        Jordan: 'EXAVITQu4vr4xnSDxMaL',
      };

      const audioSegments = [];
      setQaGenerationProgress({ current: 0, total: responses.length });
      
      for (let i = 0; i < responses.length; i++) {
        const item = responses[i];
        const voiceId = voices[item.speaker as keyof typeof voices] || voices.Alex;
        setQaGenerationProgress({ current: i + 1, total: responses.length });
        
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: item.text,
            voiceId: voiceId,
          }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          audioSegments.push(audioBlob);
        } else {
          console.error(`Failed to generate audio for ${item.speaker}`);
          throw new Error(`Failed to generate audio for ${item.speaker}`);
        }
        
        if (i < responses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const combinedAudio = await combineAudioBlobs(audioSegments);
      const url = URL.createObjectURL(combinedAudio);
      
      // Clean up previous Q&A audio
      if (qaAudioUrl) {
        URL.revokeObjectURL(qaAudioUrl);
      }
      if (qaAudioElement) {
        qaAudioElement.pause();
      }
      
      setQaAudioUrl(url);
      
      // Create new audio element for Q&A and start playing
      const audio = new Audio(url);
      setQaAudioElement(audio);
      audio.play();
      setIsQAPlaying(true);
      
      audio.addEventListener('ended', () => {
        setIsQAPlaying(false);
      });
      
    } catch (error) {
      console.error('Error generating Q&A response audio:', error);
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  // Handle Q&A audio play/pause
  const handleQAPlayPause = () => {
    if (qaAudioElement) {
      if (isQAPlaying) {
        qaAudioElement.pause();
        setIsQAPlaying(false);
      } else {
        qaAudioElement.play();
        setIsQAPlaying(true);
      }
    }
  };

  // Set up audio element when pre-generated audio is available
  useEffect(() => {
    if (preGeneratedAudioUrl && !audioElement) {
      const audio = new Audio(preGeneratedAudioUrl);
      audio.playbackRate = playbackSpeed;
      setAudioElement(audio);
      setAudioUrl(preGeneratedAudioUrl);
    }
  }, [preGeneratedAudioUrl, audioElement, playbackSpeed]);

  useEffect(() => {
    if (audioElement) {
      const updateTime = () => setCurrentTime(Math.floor(audioElement.currentTime));
      const handleEnded = () => setIsPlaying(false);
      
      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('ended', handleEnded);
      audioElement.playbackRate = playbackSpeed;
      
      return () => {
        audioElement.removeEventListener('timeupdate', updateTime);
        audioElement.removeEventListener('ended', handleEnded);
      };
    } else {
      // Fallback timer for demo purposes
      let interval: NodeJS.Timeout;
      if (isPlaying) {
        interval = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= duration) {
              setIsPlaying(false);
              return duration;
            }
            return prev + 1;
          });
        }, 1000 / playbackSpeed);
      }
      return () => clearInterval(interval);
    }
  }, [audioElement, isPlaying, duration, playbackSpeed]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl !== preGeneratedAudioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (qaAudioUrl) {
        URL.revokeObjectURL(qaAudioUrl);
      }
    };
  }, [audioUrl, qaAudioUrl, preGeneratedAudioUrl]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button 
            onClick={onBack}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2 transition-colors duration-300 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </button>

          {/* Podcast Player */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <h1 className="text-2xl font-bold mb-2">{podcastContent.title}</h1>
              <p className="opacity-90">{podcastContent.date}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {podcastContent.hosts.map((host, index) => (
                  <span key={index} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                    {host}
                  </span>
                ))}
              </div>
            </div>

            {/* Player Controls */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePlayPause}
                    disabled={isGenerating}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-6 h-6 text-black" />
                    ) : (
                      <Play className="w-6 h-6 text-black ml-1" />
                    )}
                  </button>
                  <div className="text-sm text-gray-600">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-3 py-1 rounded-md transition-all duration-300 text-sm font-medium"
                    onClick={() => setPlaybackSpeed(playbackSpeed === 1.5 ? 1 : 1.5)}
                  >
                    {playbackSpeed}x
                  </button>
                  <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-3 py-1 rounded-md transition-all duration-300 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* Topics */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Today&apos;s Topics</h3>
                <div className="grid grid-cols-2 gap-2">
                  {podcastContent.topics.map((topic, index) => (
                    <div key={index} className="bg-gray-50 px-3 py-2 rounded-lg text-sm">
                      {topic}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status indicator */}
              {(isGenerating || isGeneratingResponse) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">
                      {isGeneratingResponse ? (
                        '🤖 Hosts are thinking about your question...'
                      ) : (
                        `🎙️ Preparing your personalized podcast with ElevenLabs voices... 
                        ${generationProgress.total > 0 ? 
                          ` (${generationProgress.current}/${generationProgress.total} segments)` : ''
                        }`
                      )}
                    </span>
                  </div>
                  {userQuestion && (
                    <div className="mt-2 p-2 bg-blue-100 rounded text-sm">
                      <strong>Your question:</strong> {userQuestion}
                    </div>
                  )}
                  {isGenerating && generationProgress.total > 0 && (
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium"
                  onClick={() => setShowTranscript(!showTranscript)}
                >
                  <FileText className="w-4 h-4 text-gray-600" />
                  {showTranscript ? 'Hide' : 'Show'} Transcript
                </button>
                <button 
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium disabled:opacity-50"
                  onClick={handleAskQuestion}
                  disabled={isGenerating || isGeneratingResponse}
                >
                  {isGeneratingResponse ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 text-gray-600" />
                      Ask Question
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Transcript */}
            {showTranscript && (
              <div className="border-t bg-gray-50 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Transcript</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {transcript.map((item, index) => (
                    <div key={index} className="flex space-x-3">
                      <div className="font-medium text-purple-600 min-w-0 flex-shrink-0">
                        {item.speaker}:
                      </div>
                      <div className="text-gray-700">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Q&A Modal */}
      {showQAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Ask the Hosts</h2>
                <button
                  onClick={handleCloseQAModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
                             <p className="text-sm opacity-90 mt-2">
                 Your podcast is paused and will resume when you close this
               </p>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Question Input */}
              {!userQuestion && !isGeneratingResponse && qaResponses.length === 0 && (
                <div className="text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      What would you like to ask Alex and Jordan?
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Use your voice or type your question
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={startListening}
                      disabled={isListening}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isListening ? (
                        <>
                          <Mic className="w-5 h-5 animate-pulse" />
                          Listening...
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          Use Voice
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const question = prompt('What would you like to ask the hosts?');
                        if (question) {
                          setUserQuestion(question);
                          processQuestion(question);
                        }
                      }}
                      className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-all duration-300"
                    >
                      Type Question
                    </button>
                  </div>
                </div>
              )}

              {/* Listening State */}
              {isGeneratingResponse && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    🤖 Alex and Jordan are thinking...
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Generating their response to your question
                  </p>
                </div>
              )}

              {/* Question Display */}
              {userQuestion && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Your Question:</h4>
                  <p className="text-blue-800">{userQuestion}</p>
                </div>
              )}

              {/* Host Responses */}
              {qaResponses.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Host Responses:</h4>
                  {qaResponses.map((response, index) => (
                    <div key={index} className="flex space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium text-purple-600 min-w-0 flex-shrink-0">
                        {response.speaker}:
                      </div>
                      <div className="text-gray-700">{response.text}</div>
                    </div>
                  ))}

                  {/* Q&A Audio Controls */}
                  {qaAudioUrl && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">
                            Audio response ready
                          </span>
                        </div>
                        <button
                          onClick={handleQAPlayPause}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                        >
                          {isQAPlaying ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Play Response
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ask Another Question */}
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => {
                        setUserQuestion('');
                        setQaResponses([]);
                        if (qaAudioElement) {
                          qaAudioElement.pause();
                          setIsQAPlaying(false);
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                    >
                      Ask Another Question
                    </button>
                  </div>
                </div>
              )}

              {/* Q&A Generation Progress */}
              {isGeneratingResponse && qaGenerationProgress.total > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">
                      Generating response voices... ({qaGenerationProgress.current}/{qaGenerationProgress.total} segments)
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(qaGenerationProgress.current / qaGenerationProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 