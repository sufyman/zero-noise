"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, Copy, Check, AlertCircle, Zap, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SearchResponse {
  success: boolean;
  query: string;
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  durationMs?: number;
  error?: string;
  rawResponse?: {
    initialResponse: object;
  };
}

export default function WebSearchTestPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/web-search-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        query,
        response: '',
        error: 'Network error occurred',
        model: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.response) {
      navigator.clipboard.writeText(result.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyRawToClipboard = () => {
    if (result?.rawResponse) {
      navigator.clipboard.writeText(JSON.stringify(result.rawResponse, null, 2));
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                OpenAI Web Search Test
              </h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Test OpenAI&apos;s web search capabilities. Enter a query and see how the AI searches the web and provides responses.
            </p>
          </motion.div>

          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Query
                </label>
                <textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your search query here... (e.g., &quot;What are the latest developments in AI?&quot; or &quot;Current news about climate change&quot;)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              
              <Button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search with AI
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Results */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              {/* Result Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {result.success ? 'Search Results' : 'Error'}
                  </h3>
                </div>
                
                {result.success && result.response && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Query Display */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">Query:</div>
                <div className="text-gray-900">{result.query}</div>
              </div>

              {/* Response or Error */}
              {result.success ? (
                <div className="space-y-4">
                  {/* Search Status */}
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Search className="w-4 h-4" />
                    Web search was performed with {result.model}
                  </div>

                  {/* AI Response */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">AI Response:</div>
                    <div className="markdown-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Headers
                          h1: ({ ...props }) => <h1 {...props} className="text-2xl font-bold text-gray-900 mt-4 mb-2" />,
                          h2: ({ ...props }) => <h2 {...props} className="text-xl font-bold text-gray-900 mt-4 mb-2" />,
                          h3: ({ ...props }) => <h3 {...props} className="text-lg font-bold text-gray-900 mt-3 mb-2" />,
                          
                          // Links
                          a: ({ ...props }) => (
                            <a 
                              {...props} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 underline break-all"
                            />
                          ),
                          
                          // Paragraphs
                          p: ({ ...props }) => <p {...props} className="text-gray-900 leading-relaxed mb-3" />,
                          
                          // Strong/Bold
                          strong: ({ ...props }) => <strong {...props} className="font-bold text-gray-900" />,
                          
                          // Lists
                          ul: ({ ...props }) => <ul {...props} className="list-disc list-inside mb-3 text-gray-900" />,
                          ol: ({ ...props }) => <ol {...props} className="list-decimal list-inside mb-3 text-gray-900" />,
                          li: ({ ...props }) => <li {...props} className="mb-1" />,
                          
                          // Code
                          code: ({ inline, ...props }) => (
                            inline ? 
                              <code {...props} className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-sm font-mono" /> :
                              <code {...props} className="block bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono overflow-x-auto" />
                          ),
                          
                          // Blockquotes
                          blockquote: ({ ...props }) => (
                            <blockquote {...props} className="border-l-4 border-blue-300 pl-4 italic text-gray-700 my-3" />
                          )
                        }}
                      >
                        {result.response}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  {(result.usage || typeof result.durationMs === 'number') && (
                    <div className={`grid grid-cols-2 ${result.durationMs ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 pt-4 border-t border-gray-200`}>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Model</div>
                        <div className="text-lg font-semibold text-purple-600">{result.model}</div>
                      </div>
                      {result.usage && (
                        <>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700">Prompt Tokens</div>
                            <div className="text-lg font-semibold text-purple-600">{result.usage.prompt_tokens}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700">Response Tokens</div>
                            <div className="text-lg font-semibold text-purple-600">{result.usage.completion_tokens}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700">Total Tokens</div>
                            <div className="text-lg font-semibold text-purple-600">{result.usage.total_tokens}</div>
                          </div>
                        </>
                      )}
                      {typeof result.durationMs === 'number' && (
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-700">Duration</div>
                          <div className="text-lg font-semibold text-purple-600">{(result.durationMs / 1000).toFixed(1)}s</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-sm font-medium text-red-700 mb-2">Error:</div>
                  <div className="text-red-900">{result.error}</div>
                </div>
              )}
            </motion.div>
          )}

          {/* Raw Response Dropdown */}
          {result && result.success && result.rawResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 mt-6"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span className="font-medium">Raw API Response</span>
                  {showRawResponse ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {showRawResponse && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRawToClipboard}
                    className="flex items-center gap-2"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                )}
              </div>

              {showRawResponse && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className="p-4 bg-gray-50 rounded-lg overflow-auto">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                      {JSON.stringify(result.rawResponse, null, 2)}
                    </pre>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    This shows the complete OpenAI API response including tool calls, message objects, and metadata.
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 p-4 bg-blue-50 rounded-lg"
          >
            <div className="text-sm text-blue-800">
              <strong>Note:</strong> This is a testing interface for OpenAI&apos;s web search capabilities using the new gpt-4o-search-preview model. 
              The AI will search the web for current information and provide responses with proper citations. 
              Responses support markdown formatting including links, lists, and code blocks.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}