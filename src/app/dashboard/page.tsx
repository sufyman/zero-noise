"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Headphones, FileText, Mail, Video, Play, Pause, Volume2, MessageCircle, ArrowLeft, LogOut, User } from "lucide-react";

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
    return <PodcastPlayer onBack={handleBackToFeed} />;
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
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
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
                      <Button 
                        size="sm" 
                        className="btn-primary"
                        onClick={() => handleFormatClick(format.id)}
                      >
                        Listen Now
                      </Button>
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

function PodcastPlayer({ onBack }: { onBack: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300); // 5 minutes
  const [playbackSpeed, setPlaybackSpeed] = useState(1.5);
  const [showTranscript, setShowTranscript] = useState(false);

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

  useEffect(() => {
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
  }, [isPlaying, duration, playbackSpeed]);

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
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>

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
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full btn-primary"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white ml-1" />
                    )}
                  </Button>
                  <div className="text-sm text-gray-600">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPlaybackSpeed(playbackSpeed === 1.5 ? 1 : 1.5)}
                  >
                    {playbackSpeed}x
                  </Button>
                  <Button variant="outline" size="sm">
                    <Volume2 className="w-4 h-4" />
                  </Button>
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

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTranscript(!showTranscript)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {showTranscript ? 'Hide' : 'Show'} Transcript
                </Button>
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Ask Question
                </Button>
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
    </div>
  );
} 