"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Copy, 
  Check, 
  AlertCircle, 
  Brain, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Mail,
  Mic,
  PlayCircle,
  PauseCircle,
  Download,
  Volume2,
  TrendingUp,
  Loader2
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

interface IntelligenceResponse {
  success: boolean;
  transcript: string;
  extractedQueries: Array<{ query: string; intent: string }>;
  searchResults: SearchResult[];
  performance: {
    totalPipelineTime: number;
    successfulSearches: number;
    totalSearches: number;
  };
  error?: string;
}

interface FormatResponse {
  success: boolean;
  error?: string;
}

interface BriefResponse extends FormatResponse {
  brief?: string;
}

interface EmailResponse extends FormatResponse {
  emailBrief?: string;
}

interface ReportResponse extends FormatResponse {
  detailedReport?: string;
}

interface PodcastResponse extends FormatResponse {
  audioData?: string;
  audioSize?: number;
  transcript?: string;
  podcastName?: string;
}

export default function ResearchPage() {
  const [transcript, setTranscript] = useState("");
  const [intelligenceResult, setIntelligenceResult] = useState<IntelligenceResponse | null>(null);
  const [isGatheringIntelligence, setIsGatheringIntelligence] = useState(false);
  
  // Format results
  const [briefResult, setBriefResult] = useState<BriefResponse | null>(null);
  const [emailResult, setEmailResult] = useState<EmailResponse | null>(null);
  const [reportResult, setReportResult] = useState<ReportResponse | null>(null);
  const [podcastResult, setPodcastResult] = useState<PodcastResponse | null>(null);
  
  // Loading states
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  
  // UI states
  const [copiedSections, setCopiedSections] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleIntelligenceGathering = async () => {
    if (!transcript.trim()) return;

    setIsGatheringIntelligence(true);
    setIntelligenceResult(null);
    
    // Clear previous format results
    setBriefResult(null);
    setEmailResult(null);
    setReportResult(null);
    setPodcastResult(null);

    try {
      const response = await fetch('/api/research-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: transcript.trim(),
          queryCount: 10,
          searchTimeframe: '6 months',
          searchContext: 'high'
        }),
      });

      const data = await response.json();
      setIntelligenceResult(data);
    } catch (error) {
      console.error('Intelligence gathering error:', error);
      setIntelligenceResult({
        success: false,
        transcript,
        extractedQueries: [],
        searchResults: [],
        performance: {
          totalPipelineTime: 0,
          successfulSearches: 0,
          totalSearches: 0,
        },
        error: 'Network error occurred',
      });
    } finally {
      setIsGatheringIntelligence(false);
    }
  };

  const handleFormatGeneration = async (format: string) => {
    if (!intelligenceResult?.success) return;

    const setLoading = {
      brief: setIsGeneratingBrief,
      email: setIsGeneratingEmail,
      report: setIsGeneratingReport,
      podcast: setIsGeneratingPodcast,
    }[format];

    const setResult = {
      brief: setBriefResult,
      email: setEmailResult,
      report: setReportResult,
      podcast: setPodcastResult,
    }[format];

    if (!setLoading || !setResult) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/research-pipeline/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchResults: intelligenceResult.searchResults
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(`${format} generation error:`, error);
      setResult({
        success: false,
        error: 'Network error occurred',
      });
    } finally {
      setLoading(false);
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
    if (!podcastResult?.audioData) return;
    
    const audioData = atob(podcastResult.audioData);
    const audioArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }
    
    const blob = new Blob([audioArray], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${podcastResult.podcastName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'podcast'}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !podcastResult?.audioData) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!audioRef.current.src) {
        const audioData = atob(podcastResult.audioData);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Zero Noise Research</h1>
          <p className="text-gray-600">Transform conversations into intelligence across multiple formats</p>
        </div>

        {/* Step 1: Transcript Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Step 1: Provide Transcript</h3>
          </div>
          <p className="text-gray-600 mb-4">Paste your conversation or transcript to begin intelligence gathering</p>
          
          <div className="space-y-4">
            <textarea
              placeholder="Paste your transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={8}
              disabled={isGatheringIntelligence}
            />
            <Button
              onClick={handleIntelligenceGathering}
              disabled={!transcript.trim() || isGatheringIntelligence}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isGatheringIntelligence ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gathering Intelligence...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Start Intelligence Gathering
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Step 2: Intelligence Results */}
        <AnimatePresence>
          {intelligenceResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Step 2: Intelligence Results</h3>
                {intelligenceResult.success && (
                  <span className="ml-auto bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                    {intelligenceResult.performance.successfulSearches}/{intelligenceResult.performance.totalSearches} searches successful
                  </span>
                )}
              </div>
              
              {intelligenceResult.success ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {intelligenceResult.extractedQueries.length}
                      </div>
                      <div className="text-sm text-gray-600">Queries Generated</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {intelligenceResult.performance.successfulSearches}
                      </div>
                      <div className="text-sm text-gray-600">Successful Searches</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(intelligenceResult.performance.totalPipelineTime / 1000)}s
                      </div>
                      <div className="text-sm text-gray-600">Processing Time</div>
                    </div>
                  </div>

                  {/* Show generated queries */}
                  <div className="border-t pt-4">
                    <button
                      onClick={() => toggleSection('queries')}
                      className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors w-full text-left"
                    >
                      <span className="font-medium">Generated Intelligence Queries ({intelligenceResult.extractedQueries.length})</span>
                      {expandedSections.queries ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.queries && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 space-y-2"
                        >
                          {intelligenceResult.extractedQueries.map((query, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="font-medium text-sm">{query.query}</div>
                              <div className="text-xs text-gray-600 mt-1">{query.intent}</div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600">Intelligence gathering failed</p>
                  {intelligenceResult.error && (
                    <p className="text-sm text-gray-600 mt-2">{intelligenceResult.error}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Format Generation */}
        <AnimatePresence>
          {intelligenceResult?.success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Step 3: Generate Output Formats</h3>
              </div>
              <p className="text-gray-600 mb-4">Transform your intelligence into different formats for various use cases</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Brief Button */}
                <button
                  onClick={() => handleFormatGeneration('brief')}
                  disabled={isGeneratingBrief}
                  className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all disabled:opacity-50"
                >
                  {isGeneratingBrief ? (
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Brief</span>
                </button>

                {/* Email Button */}
                <button
                  onClick={() => handleFormatGeneration('email')}
                  disabled={isGeneratingEmail}
                  className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all disabled:opacity-50"
                >
                  {isGeneratingEmail ? (
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  ) : (
                    <Mail className="h-6 w-6 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Email</span>
                </button>

                {/* Report Button */}
                <button
                  onClick={() => handleFormatGeneration('report')}
                  disabled={isGeneratingReport}
                  className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all disabled:opacity-50"
                >
                  {isGeneratingReport ? (
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Report</span>
                </button>

                {/* Podcast Button */}
                <button
                  onClick={() => handleFormatGeneration('podcast')}
                  disabled={isGeneratingPodcast}
                  className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all disabled:opacity-50"
                >
                  {isGeneratingPodcast ? (
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  ) : (
                    <Mic className="h-6 w-6 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Podcast</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Format Results */}
        <div className="space-y-6">
          {/* Brief Result */}
          <AnimatePresence>
            {briefResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Intelligence Brief</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(briefResult.brief || '', 'brief')}
                    className="flex items-center gap-2"
                  >
                    {copiedSections.brief ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedSections.brief ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                
                {briefResult.success ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {briefResult.brief}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600">Brief generation failed</p>
                    {briefResult.error && (
                      <p className="text-sm text-gray-600 mt-1">{briefResult.error}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Result */}
          <AnimatePresence>
            {emailResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Email Brief</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(emailResult.emailBrief || '', 'email')}
                    className="flex items-center gap-2"
                  >
                    {copiedSections.email ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedSections.email ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                
                {emailResult.success ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {emailResult.emailBrief}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600">Email generation failed</p>
                    {emailResult.error && (
                      <p className="text-sm text-gray-600 mt-1">{emailResult.error}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Report Result */}
          <AnimatePresence>
            {reportResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Detailed Research Report</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(reportResult.detailedReport || '', 'report')}
                    className="flex items-center gap-2"
                  >
                    {copiedSections.report ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedSections.report ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                
                {reportResult.success ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {reportResult.detailedReport}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600">Report generation failed</p>
                    {reportResult.error && (
                      <p className="text-sm text-gray-600 mt-1">{reportResult.error}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Podcast Result */}
          <AnimatePresence>
            {podcastResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center">
                      <Mic className="w-4 h-4 text-pink-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Podcast</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAudio}
                      disabled={!podcastResult.success}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(podcastResult.transcript || '', 'podcast')}
                      className="flex items-center gap-2"
                    >
                      {copiedSections.podcast ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedSections.podcast ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
                
                {podcastResult.success ? (
                  <div className="space-y-6">
                    {/* Audio Player */}
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">{podcastResult.podcastName || 'Intelligence Podcast'}</h4>
                        {podcastResult.audioSize && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Volume2 className="h-4 w-4" />
                            {Math.round(podcastResult.audioSize / 1024)} KB
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
                    {podcastResult.transcript && (
                      <div>
                        <button
                          onClick={() => toggleSection('transcript')}
                          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors w-full text-left mb-4"
                        >
                          <span className="font-medium">Podcast Transcript</span>
                          {expandedSections.transcript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <AnimatePresence>
                          {expandedSections.transcript && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-gray-50 p-4 rounded-lg"
                            >
                              <pre className="whitespace-pre-wrap font-mono text-sm">
                                {podcastResult.transcript}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600">Podcast generation failed</p>
                    {podcastResult.error && (
                      <p className="text-sm text-gray-600 mt-1">{podcastResult.error}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 