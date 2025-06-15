import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const { interests, preferences }: { 
      interests: string[]; 
      preferences: OnboardingData;
    } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    console.log('🔍 Generating comprehensive strategic report...');

    const comprehensiveReportPrompt = `
      You are a senior strategic analyst creating a comprehensive market intelligence report. This report must be DETAILED and COMPREHENSIVE - aim for 2500-4000 words with substantive analysis.

      CLIENT CONTEXT:
      - Primary Interest: ${interests[0]}
      - Communication Style: ${preferences.communicationStyle}
      - Learning Goals: ${preferences.learningGoals.join(', ')}

      CRITICAL REQUIREMENT: This must be a COMPREHENSIVE, LONG-FORM report. Each section must be substantial with multiple detailed paragraphs. This is for executive presentation.

      Write a detailed strategic intelligence report with the following structure. IMPORTANT: Make each section very long and comprehensive:

      # EXECUTIVE SUMMARY
      Write 5-6 detailed paragraphs (at least 400 words) covering:
      - Most critical strategic findings and their business implications
      - Key market dynamics and competitive forces shaping the industry
      - Major opportunities and strategic risks with specific examples
      - Essential actions and strategic recommendations for different stakeholders
      - Expected timeline for market evolution and key milestones

      # STRATEGIC MARKET OVERVIEW
      Write 8-10 paragraphs (at least 800 words) covering:
      - Current market valuation with detailed growth projections and drivers
      - Comprehensive analysis of 10-15 major market players and their strategies
      - Recent M&A activity, strategic partnerships, and industry consolidation
      - Regulatory environment impacts, policy changes, and compliance requirements
      - Geographic market distribution, regional performance, and international trends
      - Technology adoption curves, maturation cycles, and infrastructure requirements

      # COMPREHENSIVE TREND ANALYSIS
      Analyze 6-8 major trends with extensive detail (at least 1000 words total):
      For each trend, provide:
      - Detailed description and comprehensive current market state analysis
      - Specific companies, products, and real-world examples driving this trend
      - Quantitative impact data, growth projections, and market penetration rates
      - Timeline for adoption, maturation phases, and market saturation points
      - Strategic implications for different stakeholder groups and industries

      # DETAILED COMPETITIVE INTELLIGENCE
      Comprehensive competitive analysis (at least 600 words):
      - In-depth profiles of 6-8 market leaders with their strategic positioning
      - Emerging disruptors, their unique value propositions, and market traction
      - Competitive positioning matrices and differentiation strategies
      - Strategic vulnerabilities, market opportunities, and competitive threats
      - Innovation pipelines, R&D investments, and intellectual property landscapes

      # TECHNOLOGY AND INNOVATION DEEP DIVE
      Extensive technology analysis (at least 600 words):
      - Current state of core technologies, capabilities, and limitations
      - Breakthrough innovations, their commercial potential, and adoption barriers
      - Technology roadmaps, development timelines, and investment requirements
      - Venture capital flows, startup ecosystem, and innovation hubs
      - Patent landscapes, IP strategies, and technology licensing trends

      # EXPERT PERSPECTIVES AND INSIGHTS
      Comprehensive expert analysis (at least 500 words):
      - Industry leader viewpoints, strategic predictions, and market outlook
      - Academic research findings, studies, and their business implications
      - Contrarian analysis, alternative viewpoints, and skeptical perspectives
      - Investor sentiment, funding trends, and market valuation perspectives
      - International market perspectives, global trends, and cross-border dynamics

      # COMPREHENSIVE RISK ASSESSMENT
      Detailed risk analysis (at least 500 words):
      - Market and economic risk factors with scenario analysis
      - Technology risks, obsolescence threats, and innovation disruption
      - Regulatory and compliance challenges with policy impact assessment
      - Competitive threats, market disruption scenarios, and defensive strategies
      - Operational risks, supply chain vulnerabilities, and mitigation frameworks

      # OPPORTUNITY LANDSCAPE
      Extensive opportunity analysis (at least 500 words):
      - Emerging market segments, growth areas, and revenue opportunities
      - Underserved customer needs, market gaps, and white space analysis
      - Strategic partnership opportunities, collaboration models, and ecosystem development
      - Innovation opportunities, product development areas, and service expansion
      - Geographic expansion possibilities, market entry strategies, and localization requirements

      # STRATEGIC RECOMMENDATIONS
      Comprehensive recommendations (at least 600 words):
      - Specific actionable strategies for market leaders and competitive positioning
      - Market entry strategies, timing considerations, and success factors for new entrants
      - Investment priorities, resource allocation, and capability building requirements
      - Implementation roadmaps, phase-gate approaches, and milestone tracking
      - Success metrics, KPIs, and performance measurement frameworks

      # FUTURE OUTLOOK AND SCENARIOS
      Detailed forward-looking analysis (at least 600 words):
      - 12-month market predictions with confidence levels and key assumptions
      - 24-month strategic scenarios (optimistic, realistic, pessimistic) with probability assessments
      - Long-term 3-5 year market evolution, maturation patterns, and industry transformation
      - Potential disruptive events, black swan scenarios, and their market impact
      - Strategic positioning recommendations for future success and competitive advantage

      WRITING REQUIREMENTS:
      - Include specific data points, statistics, financial metrics, and market sizing
      - Reference 25+ real companies, products, initiatives, and market examples
      - Include recent developments, news, and trends from 2024-2025
      - Provide concrete examples, case studies, and real-world applications
      - Write in ${preferences.communicationStyle.toLowerCase()} executive communication style
      - Ensure each section is substantial, detailed, and meets word count requirements
      - Total target: 2500-4000 words with executive-quality analysis

      Context: Current date is December 2024. Focus on the most recent market developments, emerging trends, and strategic intelligence in ${interests[0]}.
    `;

    // Try GPT-4o first for highest quality
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a senior partner at McKinsey & Company specializing in strategic intelligence and market analysis. Your reports are used by Fortune 100 CEOs and institutional investors for critical business decisions. You have access to comprehensive market data and industry intelligence through December 2024. Your expertise spans multiple industries and you excel at connecting disparate trends into coherent strategic narratives.'
            },
            {
              role: 'user',
              content: comprehensiveReportPrompt
            }
          ],
          max_tokens: 6000, // Optimized for balance of quality and speed
          temperature: 0.7,
        }),
      });
    } catch {
      console.log('GPT-4o not available, using GPT-4o-mini...');
    }

    if (!response || !response.ok) {
      // Fallback to GPT-4o-mini
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a senior strategic analyst creating comprehensive intelligence reports for executive audiences. Your reports are detailed, insightful, and provide genuine strategic value.'
            },
            {
              role: 'user',
              content: comprehensiveReportPrompt
            }
          ],
          max_tokens: 6000, // Optimized for balance of quality and speed
          temperature: 0.7,
        }),
      });
    }

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'Unable to generate comprehensive report';

    console.log('✅ Comprehensive strategic report generated successfully');

    return NextResponse.json({
      success: true,
      report: {
        title: `Strategic Intelligence Report: ${interests[0]} - Comprehensive Market Analysis & Strategic Outlook`,
        content,
        url: `/reports/comprehensive-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        wordCount: content.split(' ').length,
        estimatedReadTime: Math.ceil(content.split(' ').length / 200) // Assuming 200 words per minute
      },
      model: data.model || 'gpt-4o-mini',
    });

  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    return NextResponse.json(
      { error: 'Failed to generate comprehensive report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Comprehensive report generation endpoint',
    description: 'Generates detailed strategic intelligence reports',
    supportedFormats: ['comprehensive', 'executive', 'strategic'],
    qualityLevel: 'premium'
  });
} 