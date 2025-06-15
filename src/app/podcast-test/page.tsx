"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  Copy, 
  Check, 
  AlertCircle, 
  Settings,
  ChevronDown, 
  ChevronUp,
  FileText,
  PlayCircle,
  PauseCircle,
  Download,
  Volume2,
  Clock,
  Loader2,
  Upload,
  Zap
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SearchResult {
  query: string;
  intent: string;
  response: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

interface PodcastResponse {
  success: boolean;
  audioData?: string;
  audioSize?: number;
  transcript?: string;
  podcastName?: string;
  podcastTagline?: string;
  performance: {
    podcastGenerationTime: number;
    inputSearches: number;
    totalSearches: number;
  };
  settings: {
    ttsModel: string;
    wordCount: number;
    conversationStyle: string;
  };
  error?: string;
}

export default function PodcastTestPage() {
  const [inputMode, setInputMode] = useState<'sample' | 'custom' | 'searchResults'>('sample');
  const [customText, setCustomText] = useState("");
  const [searchResultsInput, setSearchResultsInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setPodcastResult] = useState<PodcastResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'complete'>('input');
  const [progress, setProgress] = useState(0);
  
  // Podcast Settings
  const [showSettings, setShowSettings] = useState(false);
  const [podcastName, setPodcastName] = useState('Zero Noise Podcast Test');
  const [podcastTagline, setPodcastTagline] = useState('Testing podcast generation capabilities');
  const [ttsModel, setTtsModel] = useState<'elevenlabs' | 'openai' | 'edge'>('elevenlabs');
  const [wordCount, setWordCount] = useState(800);
  const [conversationStyle, setConversationStyle] = useState('engaging,informative,professional');
  const [rolesPerson1, setRolesPerson1] = useState('Intelligence Analyst');
  const [rolesPerson2, setRolesPerson2] = useState('Expert Commentator');
  const [creativity, setCreativity] = useState(0.7);
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // UI state
  const [copiedSections, setCopiedSections] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transcript: false,
    settings: false,
  });

  // Sample data for testing
  const sampleSearchResults: SearchResult[] = [
    {
      query: "Latest developments in AI coding assistants",
      intent: "Technology trends analysis",
      response: "Recent developments in AI coding assistants show significant improvements in code completion accuracy and multi-language support. GitHub Copilot has expanded its capabilities with better context understanding, while new competitors like Amazon CodeWhisperer and Google Bard for coding are gaining traction. Key improvements include better handling of complex codebases, improved security scanning, and enhanced natural language to code translation.",
      success: true,
      durationMs: 1200
    },
    {
      query: "Impact of AI tools on software development productivity",
      intent: "Productivity analysis",
      response: "Studies indicate that AI coding tools can increase developer productivity by 25-40% for routine tasks. However, the impact varies significantly based on task complexity and developer experience. Senior developers tend to benefit more from AI assistance in rapid prototyping, while junior developers show improvement in code quality and learning. The key benefits include faster bug fixing, automated documentation generation, and improved code refactoring capabilities.",
      success: true,
      durationMs: 1800
    },
    {
      query: "Future outlook for AI in software engineering",
      intent: "Future trends prediction",
      response: "The future of AI in software engineering points toward more sophisticated tools that can understand entire project contexts, automatically generate tests, and provide architectural recommendations. We're moving toward AI systems that can handle full-stack development tasks, from database design to frontend implementation. Key areas of development include natural language requirements to full application generation, automated DevOps optimization, and AI-powered code security analysis.",
      success: true,
      durationMs: 2100
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let searchResults: SearchResult[];
    
    if (inputMode === 'sample') {
      searchResults = sampleSearchResults;
    } else if (inputMode === 'custom') {
      if (!customText.trim()) return;
      // Convert custom text to search results format
      searchResults = [{
        query: "Custom content analysis",
        intent: "User provided content",
        response: customText.trim(),
        success: true,
        durationMs: 0
      }];
    } else {
      if (!searchResultsInput.trim()) return;
      try {
        searchResults = JSON.parse(searchResultsInput);
      } catch (error) {
        alert('Invalid JSON format for search results');
        return;
      }
    }

    setIsGenerating(true);
    setPodcastResult(null);
    setCurrentStep('processing');
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 5;
        });
      }, 1000);

      const response = await fetch('/api/research-pipeline/podcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchResults,
          podcastName,
          podcastTagline,
          ttsModel,
          wordCount,
          conversationStyle,
          rolesPerson1,
          rolesPerson2,
          creativity,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      setPodcastResult(data);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Podcast generation error:', error);
      setPodcastResult({
        success: false,
        performance: {
          podcastGenerationTime: 0,
          inputSearches: 0,
          totalSearches: 0,
        },
        settings: {
          ttsModel,
          wordCount,
          conversationStyle,
        },
        error: 'Network error occurred',
      });
      setCurrentStep('complete');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSections(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      setCopiedSections(prev => ({ ...prev, [section]: false }));
    }, 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const downloadAudio = () => {
    if (!result?.audioData) return;
    
    const audioData = atob(result.audioData);
    const audioArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }
    
    const blob = new Blob([audioArray], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.podcastName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'podcast-test'}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !result?.audioData) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!audioRef.current.src) {
        const audioData = atob(result.audioData);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const blob = new Blob([audioArray], { type: 'audio/mpeg' });
        audioRef.current.src = URL.createObjectURL(blob);
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStepProgress = () => {
    if (currentStep === 'input') return 0;
    if (currentStep === 'processing') return progress;
    return 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Podcast Generation Test
              </h1>
            </div>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Test the podcast generation pipeline with sample data, custom content, or your own search results. 
              Configure TTS models, conversation styles, and other parameters to fine-tune your audio output.
            </p>
          </motion.div>

          {/* Progress Indicator */}
          {currentStep !== 'input' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Generation Progress</h3>
                <span className="text-sm text-gray-600">
                  {currentStep === 'processing' ? 'Generating Audio...' : 'Complete'}
                </span>
              </div>
              
              <Progress value={getStepProgress()} className="mb-4" />
              
              <div className="grid grid-cols-3 gap-4">
                {['Prepare Content', 'Generate Audio', 'Process Result'].map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      getStepProgress() >= (index + 1) * 33.33 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {getStepProgress() >= (index + 1) * 33.33 ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <div className="w-2 h-2 bg-current rounded-full" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      getStepProgress() >= (index + 1) * 33.33 ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Input Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Input Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Content Source
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setInputMode('sample')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      inputMode === 'sample' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Sample Data</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Use pre-built AI coding assistant intelligence
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setInputMode('custom')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      inputMode === 'custom' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Custom Text</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Provide your own content for the podcast
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setInputMode('searchResults')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      inputMode === 'searchResults' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Search Results</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Upload JSON search results from pipeline
                    </p>
                  </button>
                </div>
              </div>

              {/* Content Input Areas */}
              {inputMode === 'custom' && (
                <div>
                  <label htmlFor="customText" className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Content
                  </label>
                  <textarea
                    id="customText"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Enter your content here. This will be converted into a podcast conversation..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={6}
                    disabled={isGenerating}
                  />
                </div>
              )}

              {inputMode === 'searchResults' && (
                <div>
                  <label htmlFor="searchResults" className="block text-sm font-medium text-gray-700 mb-2">
                    Search Results JSON
                  </label>
                  <textarea
                    id="searchResults"
                    value={searchResultsInput}
                    onChange={(e) => setSearchResultsInput(e.target.value)}
                    placeholder={JSON.stringify(sampleSearchResults, null, 2)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
                    rows={8}
                    disabled={isGenerating}
                  />
                </div>
              )}

              {inputMode === 'sample' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Data Preview</h4>
                  <div className="space-y-2">
                    {sampleSearchResults.map((result, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-purple-600">Query:</span>{' '}
                        {result.query}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Panel */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Podcast Settings</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-3 h-3" />
                    {showSettings ? 'Hide' : 'Show'} Settings
                  </Button>
                </div>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Podcast Name
                          </label>
                          <input
                            type="text"
                            value={podcastName}
                            onChange={(e) => setPodcastName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                            disabled={isGenerating}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            TTS Model
                          </label>
                          <select
                            value={ttsModel}
                            onChange={(e) => setTtsModel(e.target.value as 'elevenlabs' | 'openai' | 'edge')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                            disabled={isGenerating}
                          >
                            <option value="elevenlabs">ElevenLabs (High Quality)</option>
                            <option value="openai">OpenAI (Fast)</option>
                            <option value="edge">Edge (Free)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Word Count: {wordCount}
                          </label>
                          <input
                            type="range"
                            min="300"
                            max="3000"
                            step="100"
                            value={wordCount}
                            onChange={(e) => setWordCount(parseInt(e.target.value))}
                            className="w-full"
                            disabled={isGenerating}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Creativity: {creativity}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={creativity}
                            onChange={(e) => setCreativity(parseFloat(e.target.value))}
                            className="w-full"
                            disabled={isGenerating}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Conversation Style
                        </label>
                        <input
                          type="text"
                          value={conversationStyle}
                          onChange={(e) => setConversationStyle(e.target.value)}
                          placeholder="engaging,informative,professional"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                          disabled={isGenerating}
                        />
                        <p className="text-xs text-gray-600 mt-1">Comma-separated style keywords</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Host 1 Role
                          </label>
                          <input
                            type="text"
                            value={rolesPerson1}
                            onChange={(e) => setRolesPerson1(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                            disabled={isGenerating}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Host 2 Role
                          </label>
                          <input
                            type="text"
                            value={rolesPerson2}
                            onChange={(e) => setRolesPerson2(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                            disabled={isGenerating}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <Button
                type="submit"
                disabled={isGenerating || (inputMode === 'custom' && !customText.trim()) || (inputMode === 'searchResults' && !searchResultsInput.trim())}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Podcast...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Generate Podcast
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Error Display */}
              {!result.success && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Generation Error</h3>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-sm font-medium text-red-700 mb-2">Error:</div>
                    <div className="text-red-900">{result.error}</div>
                  </div>
                </motion.div>
              )}

              {/* Success Results */}
              {result.success && (
                <>
                  {/* Audio Player */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center">
                          <Mic className="w-4 h-4 text-pink-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Generated Podcast</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadAudio}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                    
                    {/* Audio Player */}
                    <div className="bg-gray-100 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">{result.podcastName}</h4>
                        {result.audioSize && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Volume2 className="h-4 w-4" />
                            {Math.round(result.audioSize / 1024)} KB
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <button
                          onClick={togglePlayPause}
                          className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                        >
                          {isPlaying ? (
                            <PauseCircle className="h-6 w-6" />
                          ) : (
                            <PlayCircle className="h-6 w-6" />
                          )}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                          <Progress 
                            value={duration > 0 ? (currentTime / duration) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                      </div>
                      
                      <audio
                        ref={audioRef}
                        onTimeUpdate={() => {
                          if (audioRef.current) {
                            setCurrentTime(audioRef.current.currentTime);
                          }
                        }}
                        onDurationChange={() => {
                          if (audioRef.current) {
                            setDuration(audioRef.current.duration);
                          }
                        }}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                    </div>

                    {/* Transcript */}
                    {result.transcript && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => toggleSection('transcript')}
                            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                          >
                            <span className="font-medium">Source Content</span>
                            {expandedSections.transcript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(result.transcript || '', 'transcript')}
                            className="flex items-center gap-2"
                          >
                            {copiedSections.transcript ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copiedSections.transcript ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                        
                        <AnimatePresence>
                          {expandedSections.transcript && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-gray-50 p-4 rounded-lg"
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {result.transcript}
                                </ReactMarkdown>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>

                  {/* Performance Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Performance</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Generation Time</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {(result.performance.podcastGenerationTime / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">TTS Model</div>
                        <div className="text-lg font-semibold text-purple-600 capitalize">
                          {result.settings.ttsModel}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Word Count</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {result.settings.wordCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Sources Used</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {result.performance.inputSearches}/{result.performance.totalSearches}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-800">
                        <strong>Settings:</strong> {result.settings.conversationStyle}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          )}

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-4 bg-pink-50 rounded-lg"
          >
            <div className="text-sm text-pink-800">
              <strong>How it works:</strong> The Podcast Test Tool transforms your content into engaging audio conversations using AI. Choose from sample data, custom text, or your own search results. The system uses advanced TTS models to create natural-sounding dialogue between two hosts discussing your content. Generation typically takes 2-5 minutes depending on content length and TTS model selection.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 