"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";

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
  audioElement?: HTMLAudioElement;
}

interface PodcastState {
  segments: PodcastSegment[];
  currentSegmentIndex: number;
  isPlaying: boolean;
  isGeneratingAudio: boolean;
  isPreGeneratingAudio: boolean;
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
  audioPreGenerated: boolean;
}

// Format report content with proper HTML structure and styling
const formatReportContent = (content: string): string => {
  // Split content into paragraphs
  const paragraphs = content.split(/\n\s*\n/);
  
  return paragraphs.map(paragraph => {
    const trimmed = paragraph.trim();
    if (!trimmed) return '';
    
    // Check if it's a heading (starts with # or is all caps and short)
    if (trimmed.startsWith('#') || (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && !trimmed.includes('.'))) {
      const headingText = trimmed.replace(/^#+\s*/, '');
      return `<h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-white/20 pb-2">${headingText}</h2>`;
    }
    
    // Check if it's a subheading (contains colons or starts with numbers/letters followed by dots)
    if (trimmed.match(/^(\d+\.|[A-Z]\.|[IVX]+\.)/) || trimmed.includes(':') && trimmed.length < 100) {
      return `<h3 class="text-xl font-semibold text-green-400 mt-6 mb-3">${trimmed}</h3>`;
    }
    
    // Check if it's a list item (starts with -, *, •, or numbers)
    if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      const listItems = trimmed.split('\n').filter(line => line.trim());
      const formattedItems = listItems.map(item => {
        const cleanItem = item.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
        return `<li class="text-gray-300 mb-2 pl-2">${cleanItem}</li>`;
      }).join('');
      return `<ul class="list-disc list-inside space-y-2 ml-4 mb-4">${formattedItems}</ul>`;
    }
    
    // Format bold text (**text** or __text__)
    let formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong class="text-white font-semibold">$1</strong>');
    
    // Format italic text (*text* or _text_)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-blue-300 italic">$1</em>');
    formatted = formatted.replace(/_(.*?)_/g, '<em class="text-blue-300 italic">$1</em>');
    
    // Format inline code (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-white/10 text-green-300 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // Format quotes (lines starting with >)
    if (trimmed.startsWith('>')) {
      const quote = trimmed.replace(/^>\s*/, '');
      return `<blockquote class="border-l-4 border-purple-500 pl-4 italic text-purple-200 bg-purple-900/20 py-3 my-4 rounded-r">${quote}</blockquote>`;
    }
    
    // Replace single newlines with <br/> within paragraphs
    formatted = formatted.replace(/\n/g, '<br/>');
    
    // Regular paragraph
    return `<p class="text-gray-300 leading-relaxed text-lg mb-4">${formatted}</p>`;
  }).filter(Boolean).join('');
};

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
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
    isPreGeneratingAudio: false,
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
    currentAiAudio: null,
    audioPreGenerated: false
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
    if (loading) return; // Wait for auth to load
    
    if (!user) {
      // Not authenticated, redirect to home
      window.location.href = '/';
      return;
    }

    const loadData = async () => {
      try {
        // First priority: Check localStorage for immediate content (works in production)
        let contentGenerationStatus = localStorage.getItem('contentGenerationStatus') || 'in-progress';
        const storedGeneratedContent = localStorage.getItem('generatedContent');
        const storedOnboardingData = localStorage.getItem('onboardingData');
        
        console.log('📱 Checking localStorage first...', {
          contentStatus: contentGenerationStatus,
          hasContent: !!storedGeneratedContent,
          hasOnboarding: !!storedOnboardingData
        });

        // If we have complete content in localStorage, use it immediately
        if (storedOnboardingData) {
          const localOnboardingData = JSON.parse(storedOnboardingData);
          const data: OnboardingData = {
            interests: localOnboardingData.interests || [],
            contentFormats: localOnboardingData.contentFormats || ['podcast'],
            dailyTime: localOnboardingData.dailyTime || 15,
            podcastStyle: localOnboardingData.podcastStyle || 'conversational',
            preferredSpeed: localOnboardingData.preferredSpeed || 1.5,
            personalityTraits: localOnboardingData.personalityTraits || [],
            communicationStyle: localOnboardingData.communicationStyle || 'Casual & Conversational',
            learningGoals: localOnboardingData.learningGoals || [],
            informationPreferences: localOnboardingData.informationPreferences || []
          };
          
          setOnboardingData(data);

          // Check if content generation is needed
          if (!storedGeneratedContent && contentGenerationStatus !== 'complete') {
            console.log('🚀 No generated content found, triggering content generation...');
            contentGenerationStatus = 'in-progress';
            localStorage.setItem('contentGenerationStatus', 'in-progress');
            triggerContentGeneration(data);
          }

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

          // Load generated content if available in localStorage
          if (storedGeneratedContent && contentGenerationStatus === 'complete') {
            const content = JSON.parse(storedGeneratedContent);
            setGeneratedContent(content);
            
            // Parse podcast script into segments if podcast content exists
            if (content.podcast && content.podcast.script) {
              const segments = parsePodcastScript(content.podcast.script);
              
              setPodcastState(prev => ({ ...prev, segments }));
              // Start pre-generating audio immediately
              preGenerateAllAudioSegments(segments);
            }
          }
          
          console.log('✅ Loaded content from localStorage');
          return; // Success with localStorage, no need to check Supabase
        }

        // Fallback: Load from Supabase if localStorage is empty
        console.log('📦 LocalStorage empty, checking Supabase...');
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

            // Check if we have generated content in Supabase
            if (preferencesData.content?.generatedContent) {
              console.log('📦 Found generated content in Supabase, syncing to localStorage');
              const content = preferencesData.content.generatedContent;
              
              // Sync to localStorage for faster future access
              localStorage.setItem('generatedContent', JSON.stringify(content));
              localStorage.setItem('contentGenerationStatus', 'complete');
              localStorage.setItem('onboardingData', JSON.stringify(data));
              
              setGeneratedContent(content);
              
              // Parse podcast script into segments if podcast content exists
              if (content.podcast && content.podcast.script) {
                const segments = parsePodcastScript(content.podcast.script);
                
                setPodcastState(prev => ({ ...prev, segments }));
                // Start pre-generating audio immediately
                preGenerateAllAudioSegments(segments);
              }
              
              contentGenerationStatus = 'complete';
            } else {
              // No content found in Supabase, trigger content generation
              console.log('🚀 No content found, triggering content generation...');
              contentGenerationStatus = 'in-progress';
              localStorage.setItem('contentGenerationStatus', 'in-progress');
              localStorage.setItem('onboardingData', JSON.stringify(data));
              
              // Trigger content generation in background
              triggerContentGeneration(data);
            }

            // Initialize content cards based on selected formats
            const cards: ContentCard[] = [];

            if (data.contentFormats.includes('podcast')) {
              cards.push({
                id: 'podcast',
                type: 'podcast',
                title: `${data.interests.slice(0, 2).join(' & ')} Weekly Podcast`,
                description: `A ${data.dailyTime}-minute personalized podcast covering your interests`,
                icon: Headphones,
                status: contentGenerationStatus === 'complete' ? 'complete' : 'in-progress',
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
                status: contentGenerationStatus === 'complete' ? 'complete' : 'in-progress',
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
                status: contentGenerationStatus === 'complete' ? 'complete' : 'in-progress',
                estimatedTime: '60 seconds'
              });
            }

            setContentCards(cards);
            console.log('✅ Loaded content from Supabase');
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
      }
    };

    loadData();

    // Poll for content generation completion (works in production)
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
          // Start pre-generating audio immediately
          preGenerateAllAudioSegments(segments);
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

  // Trigger content generation when missing
  const triggerContentGeneration = async (data: OnboardingData) => {
    try {
      console.log('🚀 Starting content generation for dashboard...');
      
      // Generate comprehensive user profile summary first
      const summaryResponse = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingData: data })
      });

      if (!summaryResponse.ok) {
        throw new Error('Failed to generate profile summary');
      }

      const summaryData = await summaryResponse.json();
      const profileSummary = summaryData.summary;

      console.log('✅ Profile summary generated, creating enhanced content...');

      // Generate high-quality content using enhanced API
      const contentResponse = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: profileSummary,
          interests: data.interests,
          preferences: data
        })
      });

      if (!contentResponse.ok) {
        throw new Error('Failed to generate enhanced content');
      }

      const enhancedContent = await contentResponse.json();
      
      console.log('🎉 Enhanced content generated successfully!');
      
      const generatedContent = {
        podcast: enhancedContent.podcast || {
          title: `${data.interests.slice(0, 2).join(' & ')} Deep Dive`,
          description: `An insightful analysis of ${data.interests.join(' and ')}`,
          script: `Enhanced podcast content for ${data.interests.join(', ')}`
        },
        richTextReport: enhancedContent.richTextReport || {
          title: `${data.interests[0]} Strategic Analysis`,
          content: `# ${data.interests[0]} Intelligence Report\n\nComprehensive analysis and insights...`,
          url: `/reports/enhanced-${Date.now()}`
        },
        tikTokScript: enhancedContent.tikTokScript || {
          title: `${data.interests[0]} Breakthrough`,
          transcript: `60-second insight into ${data.interests[0]}`,
          scenes: []
        }
      };

      // Save to localStorage
      localStorage.setItem('generatedContent', JSON.stringify(generatedContent));
      localStorage.setItem('contentGenerationStatus', 'complete');
      
      // Also try to save to Supabase for persistence (non-blocking)
      fetch('/api/content', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          type: 'all',
          data: generatedContent
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ Content also saved to Supabase for persistence');
        } else {
          console.log('⚠️ Failed to save to Supabase, but content is available in localStorage');
        }
      }).catch(error => {
        console.log('⚠️ Supabase save failed, but content is available in localStorage:', error);
      });
      
    } catch (error) {
      console.error('❌ Content generation failed:', error);
      localStorage.setItem('contentGenerationStatus', 'error');
    }
  };

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
  const parsePodcastScript = (script: string | unknown[]): PodcastSegment[] => {
    const segments: PodcastSegment[] = [];
    
    // Handle if script is already an array of segments (from API)
    if (typeof script !== 'string') {
      if (Array.isArray(script)) {
        return script.map((segment: unknown, index: number) => ({
          speaker: (segment as { speaker?: string })?.speaker || (index % 2 === 0 ? 'Alex' : 'Jordan'),
          text: (segment as { text?: string })?.text || segment?.toString() || '',
          timestamp: (segment as { timestamp?: number })?.timestamp || index * 20,
          audioElement: (segment as { audioElement?: HTMLAudioElement })?.audioElement
        }));
      }
      // If it's an object, try to convert to string
      script = JSON.stringify(script);
    }
    
    const lines = script.split('\n').filter(line => line.trim());
    
    let currentTimestamp = 0;
    let currentSpeaker = 'Alex'; // Default speaker
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 10) continue;
      
      // Skip common formatting markers and headers
      if (trimmedLine.match(/^(#|##|###|\*\*|Title:|Description:|Segment \d+|Opening:|Closing:)/i)) {
        continue;
      }
      
      let extractedText = '';
      let speakerForThisLine = currentSpeaker;
      
      // Check for explicit speaker indicators
      if (trimmedLine.toLowerCase().match(/^(alex|host 1|speaker 1)[:*]\s*/)) {
        speakerForThisLine = 'Alex';
        extractedText = trimmedLine.replace(/^(alex|host 1|speaker 1)[:*]\s*/i, '').trim();
      } else if (trimmedLine.toLowerCase().match(/^(jordan|host 2|speaker 2)[:*]\s*/)) {
        speakerForThisLine = 'Jordan';
        extractedText = trimmedLine.replace(/^(jordan|host 2|speaker 2)[:*]\s*/i, '').trim();
      } else if (trimmedLine.toLowerCase().includes('alex') && trimmedLine.toLowerCase().includes(':')) {
        speakerForThisLine = 'Alex';
        extractedText = trimmedLine.split(':').slice(1).join(':').trim();
      } else if (trimmedLine.toLowerCase().includes('jordan') && trimmedLine.toLowerCase().includes(':')) {
        speakerForThisLine = 'Jordan';
        extractedText = trimmedLine.split(':').slice(1).join(':').trim();
      } else {
        // No explicit speaker, use the current speaker and the full line
        extractedText = trimmedLine;
      }
      
      // Clean up the extracted text
      extractedText = extractedText
        .replace(/^\*+|\*+$/g, '') // Remove asterisks
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic formatting
        .trim();
      
      // Only add substantial content
      if (extractedText && extractedText.length > 15) {
        segments.push({
          speaker: speakerForThisLine,
          text: extractedText,
          timestamp: currentTimestamp
        });
        
        // Estimate duration based on text length (roughly 150 words per minute)
        const wordCount = extractedText.split(' ').length;
        const estimatedDuration = Math.max(10, (wordCount / 150) * 60);
        currentTimestamp += estimatedDuration;
        
        // Alternate speakers for natural conversation if no explicit speaker was found
        if (!trimmedLine.toLowerCase().match(/(alex|jordan|host [12]|speaker [12])/)) {
          currentSpeaker = currentSpeaker === 'Alex' ? 'Jordan' : 'Alex';
        } else {
          currentSpeaker = speakerForThisLine;
        }
      }
    }
    
    // If we didn't find any segments, create a fallback
    if (segments.length === 0) {
      console.log('⚠️ No segments found, creating fallback segments from raw script');
      
      // Split the script into chunks and create segments
      const words = script.split(' ');
      const chunkSize = Math.max(50, Math.floor(words.length / 6)); // Aim for ~6 segments
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ').trim();
        if (chunk.length > 20) {
          segments.push({
            speaker: i % (chunkSize * 2) < chunkSize ? 'Alex' : 'Jordan',
            text: chunk,
            timestamp: (i / chunkSize) * 30 // 30 seconds per segment
          });
        }
      }
    }
    
    console.log(`📝 Parsed ${segments.length} podcast segments:`, segments.slice(0, 2));
    return segments;
  };

  // Generate audio for a segment using ElevenLabs
  const generateSegmentAudio = async (segment: PodcastSegment): Promise<HTMLAudioElement> => {
    try {
      const voiceId = voices[segment.speaker as keyof typeof voices];
      const segmentId = `${segment.speaker}_${segment.timestamp}_${Date.now()}`;
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: segment.text,
          voiceId: voiceId,
          speed: podcastState.playbackSpeed,
          segmentId: segmentId,
          saveToProfile: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 402 && errorData.quotaExceeded) {
          console.warn('⚠️ TTS quota exceeded, continuing without audio');
          // Create a short silent audio data URL (1 second of silence)
          const silentAudioData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
          const silentAudio = new Audio(silentAudioData);
          return new Promise((resolve) => {
            silentAudio.onloadeddata = () => resolve(silentAudio);
            // Immediately resolve if loading fails  
            setTimeout(() => resolve(silentAudio), 100);
          });
        }
        
        throw new Error(`Failed to generate audio: ${response.status}`);
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

  // Pre-generate all audio segments when content is ready
  const preGenerateAllAudioSegments = async (segments: PodcastSegment[]) => {
    if (segments.length === 0) return;
    
    console.log('🎵 Starting pre-generation of all podcast audio segments...');
    setPodcastState(prev => ({ 
      ...prev, 
      isPreGeneratingAudio: true,
      currentSegmentIndex: 0 // Use this to track pre-generation progress
    }));

    try {
      const segmentsWithAudio: PodcastSegment[] = [];
      
      // Generate audio for each segment
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`🎵 Pre-generating audio for segment ${i + 1}/${segments.length}: ${segment.speaker}`);
        
        // Update progress indicator
        setPodcastState(prev => ({ 
          ...prev, 
          currentSegmentIndex: i
        }));
        
        try {
          const audio = await generateSegmentAudio(segment);
          
          // Store the audio element directly
          segmentsWithAudio.push({
            ...segment,
            audioElement: audio
          });
        } catch (error) {
          console.error(`Failed to generate audio for segment ${i + 1}:`, error);
          // Add segment without audio URL so it can be retried later
          segmentsWithAudio.push(segment);
        }
      }
      
      console.log('✅ Finished pre-generating all podcast audio segments');
      
      setPodcastState(prev => ({ 
        ...prev, 
        segments: segmentsWithAudio,
        isPreGeneratingAudio: false,
        audioPreGenerated: true,
        currentSegmentIndex: 0 // Reset to start
      }));
      
    } catch (error) {
      console.error('Error pre-generating audio segments:', error);
      setPodcastState(prev => ({ 
        ...prev, 
        isPreGeneratingAudio: false,
        currentSegmentIndex: 0 // Reset on error
      }));
    }
  };

  // Start playing podcast with pre-generated audio
  const startPodcastPlayback = async () => {
    if (podcastState.segments.length === 0) return;
    
    // If audio hasn't been pre-generated yet, wait for it or generate on demand
    if (!podcastState.audioPreGenerated && !podcastState.isPreGeneratingAudio) {
      console.log('Audio not pre-generated, starting pre-generation...');
      await preGenerateAllAudioSegments(podcastState.segments);
    }
    
    setPodcastState(prev => ({ 
      ...prev, 
      currentSegmentIndex: 0,
      isPaused: false
    }));

    try {
      // Use pre-generated audio or generate first segment if needed
      const firstSegment = podcastState.segments[0];
      let firstAudio: HTMLAudioElement;
      
      if (firstSegment.audioElement) {
        // Use pre-generated audio
        firstAudio = firstSegment.audioElement;
        firstAudio.playbackRate = podcastState.playbackSpeed;
      } else {
        // Generate on demand if pre-generation failed
        setPodcastState(prev => ({ ...prev, isGeneratingAudio: true }));
        firstAudio = await generateSegmentAudio(firstSegment);
        setPodcastState(prev => ({ ...prev, isGeneratingAudio: false }));
      }
      
      audioQueueRef.current = [firstAudio];
      currentAudioRef.current = firstAudio;
      
      setPodcastState(prev => ({ 
        ...prev, 
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

  // Play current segment using pre-generated audio
  const playCurrentSegment = (segmentIndex: number) => {
    const segment = podcastState.segments[segmentIndex];
    if (!segment) return;

    let audio: HTMLAudioElement;
    
    // Check if we have pre-generated audio
    if (segment.audioElement) {
      audio = segment.audioElement;
      audio.playbackRate = podcastState.playbackSpeed;
      currentAudioRef.current = audio;
    } else {
      // Fallback to audio queue if available
      audio = audioQueueRef.current[segmentIndex];
      if (!audio) {
        console.log('No pre-generated audio found, generating on demand...');
        // Generate on demand as last resort
        setPodcastState(prev => ({ ...prev, isGeneratingAudio: true }));
        generateSegmentAudio(segment)
          .then(generatedAudio => {
            audioQueueRef.current[segmentIndex] = generatedAudio;
            currentAudioRef.current = generatedAudio;
            setPodcastState(prev => ({ ...prev, isGeneratingAudio: false }));
            if (!podcastState.isPaused) {
              generatedAudio.onended = () => {
                const nextIndex = segmentIndex + 1;
                if (nextIndex < podcastState.segments.length && !podcastState.isPaused) {
                  setPodcastState(prev => ({ 
                    ...prev, 
                    currentSegmentIndex: nextIndex 
                  }));
                  playCurrentSegment(nextIndex);
                } else {
                  setPodcastState(prev => ({ ...prev, isPlaying: false }));
                }
              };
              generatedAudio.play().catch(console.error);
            }
          })
          .catch(console.error);
        return;
      }
      currentAudioRef.current = audio;
      audio.playbackRate = podcastState.playbackSpeed;
    }

    audio.onended = () => {
      const nextIndex = segmentIndex + 1;
      if (nextIndex < podcastState.segments.length && !podcastState.isPaused) {
        setPodcastState(prev => ({ 
          ...prev, 
          currentSegmentIndex: nextIndex 
        }));
        playCurrentSegment(nextIndex);
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
      await signOut();
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

  if (loading) {
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
                      disabled={podcastState.isGeneratingAudio || podcastState.isPreGeneratingAudio || podcastState.segments.length === 0}
                      size="lg"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {podcastState.isPreGeneratingAudio ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Preparing Audio...
                        </>
                      ) : podcastState.isGeneratingAudio ? (
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
                  {podcastState.isPreGeneratingAudio && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                      <p className="text-blue-200 text-sm mb-2">
                        🎵 Pre-generating all audio segments for instant playback... This only happens once!
                      </p>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={((podcastState.currentSegmentIndex + 1) / podcastState.segments.length) * 100} 
                          className="h-2 flex-1" 
                        />
                        <span className="text-xs text-blue-300">
                          {podcastState.currentSegmentIndex + 1}/{podcastState.segments.length}
                        </span>
                      </div>
                    </div>
                  )}

                  {podcastState.audioPreGenerated && !podcastState.isPlaying && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4">
                      <p className="text-green-200 text-sm">
                        ✅ Audio ready! Click play to start listening instantly.
                      </p>
                    </div>
                  )}

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
                className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-white/20 p-8 text-center">
                  <FileText className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {generatedContent.richTextReport.title}
                  </h1>
                  <p className="text-green-200 text-sm">
                    Comprehensive Analysis Report
                  </p>
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="max-w-4xl mx-auto">
                    <div 
                      className="formatted-content"
                      dangerouslySetInnerHTML={{ 
                        __html: formatReportContent(generatedContent.richTextReport.content)
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-white/5 border-t border-white/10 p-6 text-center">
                  <p className="text-gray-400 text-sm">
                    Generated based on your interests and preferences
                  </p>
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

                {/* Video Preview */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Video Preview</h3>
                  <div className="bg-black rounded-xl overflow-hidden aspect-[9/16] max-w-xs mx-auto">
                    <video
                      controls
                      className="w-full h-full object-cover"
                      poster="/api/placeholder-image"
                    >
                      <source 
                        src="https://private-sync-user-generations-v2.s3.amazonaws.com/generations/86996d2d-4df4-44e2-884a-42f9b2912980/f5ab3754-b328-4131-bc1a-7b06d667ca77_stitcher/result.mp4" 
                        type="video/mp4" 
                      />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <p className="text-center text-gray-400 text-sm mt-2">
                    Demo video - Your personalized content will appear here
                  </p>
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