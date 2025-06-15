import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    console.log('📊 Detailed report generation started');
    
    const { searchResults, reportStyle = 'comprehensive' } = await request.json();

    if (!searchResults || !Array.isArray(searchResults)) {
      return NextResponse.json(
        { error: 'Search results are required and must be an array' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const reportStartTime = Date.now();
    
    const successfulResults = searchResults.filter((r: SearchResult) => r.success);
    const searchResultsText = successfulResults
      .map((r: SearchResult) => `QUERY: ${r.query}\nINTENT: ${r.intent}\nRESULT:\n${r.response}\n---`)
      .join('\n\n');

    console.log(`📝 Generating detailed report from ${successfulResults.length} successful searches...`);

    const reportPrompt = `Create a comprehensive research report from these intelligence results. This should be a detailed, well-structured analysis suitable for strategic decision-making.

INTELLIGENCE RESULTS:
${searchResultsText}

COMPREHENSIVE REPORT STRUCTURE:

## Executive Summary
- Overview of key findings and their significance
- Primary trends and developments identified
- Strategic implications and recommendations

## Detailed Analysis
### Recent Developments
- Latest changes and updates in the field
- New releases, announcements, and innovations
- Timeline of significant events

### Market Intelligence
- Current competitive landscape
- Key players and their positions
- Market trends and shifts

### Technical Analysis
- Feature comparisons and capabilities
- Performance metrics and benchmarks
- Technology trends and directions

### Expert Insights
- Industry expert opinions and commentary
- Thought leader perspectives
- Professional analysis and predictions

## Strategic Implications
- What these developments mean for stakeholders
- Opportunities and risks identified
- Strategic considerations for decision-makers

## Recommendations
- Immediate action items
- Medium-term strategic moves
- Areas requiring continued monitoring

## Source Bibliography
- Categorized list of all sources
- Quality assessment of information sources
- Recency and reliability indicators

REPORT REQUIREMENTS:
- Professional research document quality
- In-depth analysis with supporting evidence
- Clear structure with numbered sections
- 1500-2000 words comprehensive coverage
- Balance of recent developments and strategic context
- Actionable insights throughout
- Proper attribution and source citation

Generate a thorough research report that provides comprehensive intelligence for strategic planning and decision-making.`;

    const reportResponse = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: reportPrompt,
        },
      ],
      temperature: 0.2,
    });

    const reportGenerationTime = Date.now() - reportStartTime;
    const detailedReport = reportResponse.choices[0]?.message?.content || '';

    console.log(`✅ Detailed report generation completed in ${reportGenerationTime}ms`);
    console.log(`📊 Generated report length: ${detailedReport.length} characters`);

    return NextResponse.json({
      success: true,
      detailedReport,
      performance: {
        reportGenerationTime,
        inputSearches: successfulResults.length,
        totalSearches: searchResults.length,
      },
      usage: {
        reportTokens: reportResponse.usage?.total_tokens || 0,
      },
    });

  } catch (error) {
    console.error('💥 Detailed report generation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Detailed Report Generation Error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 