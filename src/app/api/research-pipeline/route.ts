import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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



export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Research pipeline started');
    
    const { 
      transcript, 
      searchTimeframe = '3 month',
      queryCount = 5,
      searchContext = 'high',
      reportStyle = 'detailed'
    } = await request.json();

    console.log('📋 Pipeline configuration:', {
      transcriptLength: transcript?.length || 0,
      searchTimeframe,
      queryCount,
      searchContext,
      reportStyle
    });

    if (!transcript || typeof transcript !== 'string') {
      console.error('❌ Invalid transcript provided');
      return NextResponse.json(
        { error: 'Transcript is required and must be a string' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const pipelineStartTime = Date.now();

    // Step 1: Extract Queries
    console.log('🔍 Step 1: Starting query extraction...');
    const queryExtractionStart = Date.now();
    
    const queryExtractionPrompt = `Analyze this conversation/transcript and extract ${queryCount} intelligence queries to help the user stay up-to-date on their interests.

    CURRENT TIME: ${new Date().toISOString()}

INPUT: ${transcript}

INTELLIGENCE GATHERING FRAMEWORK:
1. Identify core topics and subtopics mentioned
2. Prioritize recency-focused query types:
   - Update Intelligence (what's changed recently?)
   - Trend Monitoring (what's emerging or shifting?)
   - Competitive Intelligence (how are options evolving?)
   - Development Tracking (what's new in implementation?)
   - Market Intelligence (latest movements and announcements)

3. Temporal Intelligence Focus:
   - What has changed in the past ${searchTimeframe}?
   - What are the latest developments?
   - What's emerging or trending now?
   - What updates should the user know about?

4. Intelligence Scope:
   - Recent announcements and releases
   - Latest expert opinions and analysis
   - Current industry movements
   - Fresh insights and discoveries

CREATE QUERIES THAT:
- Prioritize recent developments and changes
- Focus on "what's new" and "what's changed"
- Target current state and latest updates
- Emphasize fresh intelligence over historical context

OUTPUT FORMAT (return only valid JSON):
{
  "queries": [
    {"query": "specific search string", "intent": "what we hope to find"},
    {"query": "another specific search string", "intent": "what we hope to find"}
  ]
}

EXAMPLES:
Input: "I'm interested in AI coding tools like Cursor and Windsurf"
Output: {"queries": [{"query": "Cursor Windsurf latest updates new features", "intent": "Track recent developments and feature releases in AI coding assistants"}]}

Input: "Tell me about sustainable packaging trends"
Output: {"queries": [{"query": "sustainable packaging latest innovations recent announcements", "intent": "Monitor current developments and new solutions in eco-friendly packaging"}]}

Input: "I want to stay current on quantum computing"
Output: {"queries": [{"query": "quantum computing recent breakthroughs latest research", "intent": "Intelligence on current quantum computing advances and discoveries"}]}`;

    const extractionCompletion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: queryExtractionPrompt,
        },
      ],
      temperature: 0.6,
    });

    const queryExtractionTime = Date.now() - queryExtractionStart;
    console.log(`✅ Query extraction completed in ${queryExtractionTime}ms`);

    // Parse the response using string parsing instead of structured output
    const extractionResponse = extractionCompletion.choices[0]?.message?.content || '';
    let extractedQueries: QueryItem[] = [];
    
    console.log('📝 Parsing extraction response...');
    try {
      // Try to extract JSON from the response
      const jsonMatch = extractionResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        extractedQueries = parsedResponse.queries || [];
        console.log(`✅ Successfully extracted ${extractedQueries.length} queries:`, 
          extractedQueries.map(q => q.query));
      } else {
        console.warn('⚠️ No JSON found in extraction response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse query extraction response:', parseError);
      console.log('🔄 Using fallback query generation...');
      // Fallback: create default queries based on transcript
      extractedQueries = [
        { query: `${transcript.substring(0, 100)}`, intent: 'Find recent developments related to transcript topic' }
      ];
      console.log('✅ Created fallback query:', extractedQueries[0].query);
    }

    // Step 2: Execute Parallel Searches
    console.log(`🌐 Step 2: Starting ${extractedQueries.length} parallel searches...`);
    const searchStartTime = Date.now();
    
    const searchPromises = extractedQueries.map(async (queryItem: QueryItem, index: number): Promise<SearchResult> => {
      const searchStart = Date.now();
      console.log(`🔎 Search ${index + 1}/${extractedQueries.length}: "${queryItem.query}"`);
      
      try {
        const searchPrompt = `Conduct intelligence gathering to surface the most recent developments for this query.

QUERY: ${queryItem.query}
INTENT: ${queryItem.intent}

RECENCY-FOCUSED INTELLIGENCE PRINCIPLES:

1. PRIORITIZE FRESH SOURCES:
   - Breaking news and recent announcements
   - Latest releases, updates, and launches
   - Recent expert commentary and analysis  
   - Current discussions and emerging insights
   - Fresh research and new findings

2. TEMPORAL INTELLIGENCE PRIORITY:
   - STRONGLY prioritize information from the last ${searchTimeframe}
   - Surface what's changed, what's new, what's different
   - Track recent developments and shifts
   - Identify emerging patterns and trends

3. INTELLIGENCE EXTRACTION:
   - What's new or changed recently?
   - Latest developments and announcements
   - Current expert opinions and reactions
   - Recent data points and evidence
   - Fresh insights and discoveries
   - Emerging challenges or opportunities

4. RECENCY FILTERS:
   - Favor: recent posts, latest updates, current discussions
   - Avoid: outdated information, stale content, historical context
   - Focus: current state, recent changes, latest intelligence

Return the freshest intelligence with clear recency indicators and source attribution.`;

        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini-search-preview',
          web_search_options: {
            search_context_size: searchContext as "high" | "medium",
          },
          messages: [
            {
              role: 'user',
              content: searchPrompt,
            },
          ],
        });

        const searchDuration = Date.now() - searchStart;
        const responseLength = response.choices[0]?.message?.content?.length || 0;
        
        console.log(`✅ Search ${index + 1} completed in ${searchDuration}ms (${responseLength} chars response)`);

        return {
          query: queryItem.query,
          intent: queryItem.intent,
          response: response.choices[0]?.message?.content || '',
          usage: response.usage,
          durationMs: searchDuration,
          success: true,
        };
      } catch (error) {
        const searchDuration = Date.now() - searchStart;
        console.error(`❌ Search ${index + 1} failed after ${searchDuration}ms:`, error);
        
        return {
          query: queryItem.query,
          intent: queryItem.intent,
          response: '',
          durationMs: searchDuration,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown search error',
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const searchExecutionTime = Date.now() - searchStartTime;
    
    const successfulSearchCount = searchResults.filter(r => r.success).length;
    console.log(`✅ All searches completed in ${searchExecutionTime}ms`);
    console.log(`📊 Search results: ${successfulSearchCount}/${searchResults.length} successful`);

    const totalPipelineTime = Date.now() - pipelineStartTime;

    // Calculate usage stats
    const totalTokens = searchResults.reduce((acc: number, r: SearchResult) => acc + (r.usage?.total_tokens || 0), 0);
    const avgSearchTime = searchResults.length > 0 ? searchResults.reduce((acc: number, r: SearchResult) => acc + r.durationMs, 0) / searchResults.length : 0;
    const successfulSearches = searchResults.filter(r => r.success).length;

    console.log('📊 Intelligence gathering completed successfully! Performance summary:');
    console.log(`  ⏱️  Total time: ${totalPipelineTime}ms`);
    console.log(`  🔍 Query extraction: ${queryExtractionTime}ms`);
    console.log(`  🌐 Search execution: ${searchExecutionTime}ms`);
    console.log(`  🎯 Average search time: ${Math.round(avgSearchTime)}ms`);
    console.log(`  🔢 Total tokens used: ${totalTokens}`);
    console.log(`  ✅ Success rate: ${successfulSearches}/${searchResults.length} searches`);

    return NextResponse.json({
      success: true,
      transcript,
      extractedQueries,
      searchResults,
      performance: {
        queryExtractionTime,
        searchExecutionTime,
        totalPipelineTime,
        avgSearchTime,
        successfulSearches,
        totalSearches: searchResults.length,
      },
      usage: {
        totalTokens,
        queryExtractionTokens: extractionCompletion.usage?.total_tokens || 0,
        searchTokens: totalTokens,
      },
      settings: {
        searchTimeframe,
        queryCount,
        searchContext,
        reportStyle,
      },
    });

  } catch (error) {
    console.error('💥 Research pipeline error:', error);
    console.error('🔍 Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Pipeline Error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}