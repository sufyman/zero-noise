"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
  Target,
  BookOpen,
  Clock,
  Settings
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface QueryItem {
  query: string;
  intent: string;
}

interface SearchResult {
  query: string;
  intent: string;
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  durationMs: number;
  success: boolean;
  error?: string;
}

interface ReportData {
  executiveSummary: string;
  detailedFindings: string;
  actionableInsights: string;
  sourceBibliography: string;
  fullReport: string;
}

interface PipelineResponse {
  success: boolean;
  transcript: string;
  extractedQueries: QueryItem[];
  searchResults: SearchResult[];
  reportData: ReportData;
  performance: {
    queryExtractionTime: number;
    searchExecutionTime: number;
    reportCompilationTime: number;
    totalPipelineTime: number;
    avgSearchTime: number;
    successfulSearches: number;
    totalSearches: number;
  };
  usage: {
    totalTokens: number;
    queryExtractionTokens: number;
    reportCompilationTokens: number;
    searchTokens: number;
  };
  settings: {
    searchTimeframe: string;
    queryCount: number;
    searchContext: string;
    reportStyle: string;
  };
  error?: string;
}

export default function ResearchTestPage() {
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'complete'>('input');
  const [progress, setProgress] = useState(0);
  
  // Customization options
  const [showSettings, setShowSettings] = useState(false);
  const [searchTimeframe, setSearchTimeframe] = useState('6 months');
  const [queryCount, setQueryCount] = useState(6);
  const [searchContext, setSearchContext] = useState('high');
  const [reportStyle, setReportStyle] = useState('detailed');
  
  // UI state
  const [copiedSections, setCopiedSections] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    queries: true,
    searches: true,
    report: true,
  });
  const [expandedSearchResults, setExpandedSearchResults] = useState<Record<number, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transcript.trim()) return;

    setIsProcessing(true);
    setResult(null);
    setCurrentStep('processing');
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await fetch('/api/research-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: transcript.trim(),
          searchTimeframe,
          queryCount,
          searchContext,
          reportStyle,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      setResult(data);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Pipeline error:', error);
      setResult({
        success: false,
        transcript,
        extractedQueries: [],
        searchResults: [],
        reportData: {
          executiveSummary: '',
          detailedFindings: '',
          actionableInsights: '',
          sourceBibliography: '',
          fullReport: '',
        },
        performance: {
          queryExtractionTime: 0,
          searchExecutionTime: 0,
          reportCompilationTime: 0,
          totalPipelineTime: 0,
          avgSearchTime: 0,
          successfulSearches: 0,
          totalSearches: 0,
        },
        usage: {
          totalTokens: 0,
          queryExtractionTokens: 0,
          reportCompilationTokens: 0,
          searchTokens: 0,
        },
        settings: {
          searchTimeframe,
          queryCount,
          searchContext,
          reportStyle,
        },
        error: 'Network error occurred',
      });
      setCurrentStep('complete');
    } finally {
      setIsProcessing(false);
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

  const toggleSearchResult = (index: number) => {
    setExpandedSearchResults(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isSearchResultExpanded = (index: number) => {
    return expandedSearchResults[index] ?? true; // Default to expanded
  };

  const getStepIcon = (step: number) => {
    const icons = [FileText, Brain, Search, BookOpen];
    const Icon = icons[step];
    return <Icon className="w-4 h-4" />;
  };

  const getStepProgress = () => {
    if (currentStep === 'input') return 0;
    if (currentStep === 'processing') return progress;
    return 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Research Pipeline
              </h1>
            </div>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Transform interview transcripts into comprehensive research reports. Enter your transcript and watch as AI extracts queries, searches the web, and compiles actionable intelligence.
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
                <h3 className="text-lg font-semibold text-gray-900">Pipeline Progress</h3>
                <span className="text-sm text-gray-600">
                  {currentStep === 'processing' ? 'Processing...' : 'Complete'}
                </span>
              </div>
              
              <Progress value={getStepProgress()} className="mb-4" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Transcript', 'Extract Queries', 'Search Web', 'Compile Report'].map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      getStepProgress() >= (index + 1) * 25 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {getStepProgress() >= (index + 1) * 25 ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        getStepIcon(index)
                      )}
                    </div>
                    <span className={`text-sm ${
                      getStepProgress() >= (index + 1) * 25 ? 'text-gray-900' : 'text-gray-500'
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="transcript" className="block text-sm font-medium text-gray-700">
                    Interview Transcript
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-3 h-3" />
                    Settings
                  </Button>
                </div>
                
                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your interview transcript here... The AI will analyze the content to understand interests, topics, and research needs, then automatically generate targeted search queries and compile a comprehensive research report."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={8}
                  disabled={isProcessing}
                />
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-gray-50 rounded-lg space-y-4"
                >
                  <h4 className="font-medium text-gray-900">Research Parameters</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Timeframe
                      </label>
                      <select
                        value={searchTimeframe}
                        onChange={(e) => setSearchTimeframe(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                        disabled={isProcessing}
                      >
                        <option value="3 months">Last 3 months</option>
                        <option value="6 months">Last 6 months</option>
                        <option value="12 months">Last 12 months</option>
                        <option value="24 months">Last 24 months</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Queries: {queryCount}
                      </label>
                      <input
                        type="range"
                        min="3"
                        max="10"
                        value={queryCount}
                        onChange={(e) => setQueryCount(parseInt(e.target.value))}
                        className="w-full"
                        disabled={isProcessing}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Context
                      </label>
                      <select
                        value={searchContext}
                        onChange={(e) => setSearchContext(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                        disabled={isProcessing}
                      >
                        <option value="medium">Medium Context</option>
                        <option value="high">High Context</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Report Style
                      </label>
                      <select
                        value={reportStyle}
                        onChange={(e) => setReportStyle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                        disabled={isProcessing}
                      >
                        <option value="brief">Brief Summary</option>
                        <option value="detailed">Detailed Analysis</option>
                        <option value="comprehensive">Comprehensive Report</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <Button
                type="submit"
                disabled={!transcript.trim() || isProcessing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing Research Pipeline...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Start Research Pipeline
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
                    <h3 className="text-lg font-semibold text-gray-900">Pipeline Error</h3>
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
                  {/* Extracted Queries */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => toggleSection('queries')}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Target className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Extracted Queries ({result.extractedQueries.length})
                        </h3>
                        {expandedSections.queries ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {expandedSections.queries && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(
                            JSON.stringify(result.extractedQueries, null, 2),
                            'queries'
                          )}
                          className="flex items-center gap-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        >
                          {copiedSections.queries ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Queries
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {expandedSections.queries && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        {result.extractedQueries.map((query, index) => (
                          <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                            <div className="font-medium text-gray-900 mb-1">
                              &quot;{query.query}&quot;
                            </div>
                            <div className="text-sm text-gray-600">
                              Intent: {query.intent}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Search Results */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => toggleSection('searches')}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <Search className="w-4 h-4 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Search Results ({result.performance.successfulSearches}/{result.performance.totalSearches})
                        </h3>
                        {expandedSections.searches ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {expandedSections.searches && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(
                            result.searchResults.map(r => `Query: ${r.query}\n\nResponse: ${r.response}`).join('\n\n---\n\n'),
                            'searches'
                          )}
                          className="flex items-center gap-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        >
                          {copiedSections.searches ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy All
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {expandedSections.searches && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4"
                      >
                        {result.searchResults.map((searchResult, index) => (
                          <div key={index} className={`p-4 rounded-lg border ${
                            searchResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <button
                                onClick={() => toggleSearchResult(index)}
                                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors flex-1 text-left"
                              >
                                <div className="font-medium text-gray-900 flex-1">
                                  {searchResult.query}
                                </div>
                                {isSearchResultExpanded(index) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              
                              <div className="flex items-center gap-2">
                                {searchResult.success && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(searchResult.response, `search-${index}`)}
                                    className="flex items-center gap-1 text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900 px-2 py-1 h-7"
                                  >
                                    {copiedSections[`search-${index}`] ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  {(searchResult.durationMs / 1000).toFixed(1)}s
                                </div>
                              </div>
                            </div>
                            
                            {isSearchResultExpanded(index) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3"
                              >
                                {searchResult.success ? (
                                  <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {searchResult.response}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <div className="text-red-700 text-sm">
                                    Error: {searchResult.error}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Final Report */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => toggleSection('report')}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Research Report
                        </h3>
                        {expandedSections.report ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {expandedSections.report && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(result.reportData.fullReport, 'report')}
                          className="flex items-center gap-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        >
                          {copiedSections.report ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Report
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {expandedSections.report && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="prose prose-lg max-w-none"
                      >
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ ...props }) => <h1 {...props} className="text-2xl font-bold text-gray-900 mt-6 mb-4" />,
                            h2: ({ ...props }) => <h2 {...props} className="text-xl font-bold text-gray-900 mt-5 mb-3" />,
                            h3: ({ ...props }) => <h3 {...props} className="text-lg font-bold text-gray-900 mt-4 mb-2" />,
                            a: ({ ...props }) => (
                              <a 
                                {...props} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800 underline"
                              />
                            ),
                            p: ({ ...props }) => <p {...props} className="text-gray-900 leading-relaxed mb-4" />,
                            ul: ({ ...props }) => <ul {...props} className="list-disc list-inside mb-4 text-gray-900" />,
                            ol: ({ ...props }) => <ol {...props} className="list-decimal list-inside mb-4 text-gray-900" />,
                            li: ({ ...props }) => <li {...props} className="mb-2" />,
                            strong: ({ ...props }) => <strong {...props} className="font-bold text-gray-900" />,
                            code: ({ node, ...props }) => {
                              const isInline = node?.tagName === 'code' && node?.properties?.inline;
                              return isInline ? 
                                <code {...props} className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-sm font-mono" /> :
                                <code {...props} className="block bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono overflow-x-auto" />
                            },
                            blockquote: ({ ...props }) => (
                              <blockquote {...props} className="border-l-4 border-purple-300 pl-4 italic text-gray-700 my-4" />
                            )
                          }}
                        >
                          {result.reportData.fullReport}
                        </ReactMarkdown>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Performance Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Performance</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Total Time</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {(result.performance.totalPipelineTime / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Query Extraction</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {(result.performance.queryExtractionTime / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Search Time</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {(result.performance.searchExecutionTime / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Report Time</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {(result.performance.reportCompilationTime / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Total Tokens</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {result.usage.totalTokens.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Success Rate</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {Math.round((result.performance.successfulSearches / result.performance.totalSearches) * 100)}%
                        </div>
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
            className="mt-8 p-4 bg-blue-50 rounded-lg"
          >
            <div className="text-sm text-blue-800">
              <strong>How it works:</strong> The AI Research Pipeline transforms your interview transcript into comprehensive intelligence by extracting targeted search queries, executing parallel web searches, and synthesizing findings into an actionable report. The entire process typically takes 30-60 seconds depending on the complexity of your transcript.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}