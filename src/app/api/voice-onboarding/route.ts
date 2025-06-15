import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface OnboardingSession {
  sessionId: string;
  currentQuestionIndex: number;
  questions: Array<{
    id: number;
    question: string;
    context: string;
  }>;
  responses: Array<{
    questionId: number;
    question: string;
    response: string;
    timestamp: string;
  }>;
  userProfile: {
    interests: string[];
    contentFormat: string;
    dailyTime: number;
    podcastStyle: string;
    preferredSpeed: number;
    personalityTraits: string[];
    communicationStyle: string;
    learningGoals: string[];
  };
}

// In-memory storage for demo (in production, use a database)
const sessions = new Map<string, OnboardingSession>();

const ONBOARDING_QUESTIONS = [
  {
    id: 1,
    question: "Hi there! I'm Alex, your podcast host. Welcome to your personalized onboarding experience. Let's start with getting to know you better. What are your main professional interests or areas you'd like to stay updated on? For example, are you interested in startups, marketing, AI, or other tech topics?",
    context: "interests_discovery"
  },
  {
    id: 2,
    question: "Great choices! Now, how much time do you typically have for consuming content each day? Are you someone who prefers quick 5-minute updates, or do you enjoy longer deep-dive discussions?",
    context: "time_preferences"
  },
  {
    id: 3,
    question: "Perfect! Now let's talk about communication style. Do you prefer conversations that are more analytical and data-driven, or do you like energetic and motivational discussions? Maybe something more casual and relaxed?",
    context: "communication_style"
  },
  {
    id: 4,
    question: "Excellent! I'm curious about your learning goals. What would you like to achieve by listening to personalized content? Are you looking to stay current with industry trends, develop specific skills, get inspiration for your own projects, or something else?",
    context: "learning_goals"
  },
  {
    id: 5,
    question: "Last question! Tell me a bit about your personality when it comes to consuming information. Are you someone who likes to multitask while listening, or do you prefer focused listening? Do you enjoy being challenged with new perspectives, or do you prefer content that aligns with your existing views?",
    context: "personality_traits"
  }
];

export async function POST(request: NextRequest) {
  try {
    const { action, sessionId, transcribedResponse } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    switch (action) {
      case 'start_session':
        return await startSession();
      
      case 'submit_response':
        return await submitResponse(sessionId, transcribedResponse);
      
      case 'get_session':
        return await getSession(sessionId);
      
      case 'generate_report':
        return await generateReport(sessionId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Voice onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function startSession() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session: OnboardingSession = {
    sessionId,
    currentQuestionIndex: 0,
    questions: ONBOARDING_QUESTIONS,
    responses: [],
    userProfile: {
      interests: [],
      contentFormat: 'podcast',
      dailyTime: 5,
      podcastStyle: 'conversational',
      preferredSpeed: 1.5,
      personalityTraits: [],
      communicationStyle: '',
      learningGoals: [],
    }
  };

  sessions.set(sessionId, session);

  return NextResponse.json({
    sessionId,
    currentQuestion: ONBOARDING_QUESTIONS[0],
    totalQuestions: ONBOARDING_QUESTIONS.length,
    questionIndex: 0
  });
}

async function submitResponse(sessionId: string, transcribedResponse: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const currentQuestion = session.questions[session.currentQuestionIndex];
  
  // Store the response
  session.responses.push({
    questionId: currentQuestion.id,
    question: currentQuestion.question,
    response: transcribedResponse,
    timestamp: new Date().toISOString()
  });

  // Move to next question
  session.currentQuestionIndex++;
  
  if (session.currentQuestionIndex >= session.questions.length) {
    // Onboarding complete
    return NextResponse.json({
      sessionId,
      completed: true,
      message: "Thank you! Your onboarding is complete. Let me generate your personalized profile now."
    });
  }

  const nextQuestion = session.questions[session.currentQuestionIndex];
  
  return NextResponse.json({
    sessionId,
    currentQuestion: nextQuestion,
    totalQuestions: session.questions.length,
    questionIndex: session.currentQuestionIndex,
    completed: false
  });
}

async function getSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}

async function generateReport(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.responses.length === 0) {
    return NextResponse.json({ error: 'No responses to analyze' }, { status: 400 });
  }

  // Use OpenAI to analyze responses and generate profile
  const analysisPrompt = `Analyze the following onboarding interview responses and create a detailed user profile for personalized podcast content generation.

Responses:
${session.responses.map(r => `Q: ${r.question}\nA: ${r.response}\n`).join('\n')}

Based on these responses, please provide:
1. A list of specific interests/topics (extract from their answers)
2. Preferred content format and length
3. Communication style preferences  
4. Learning goals and objectives
5. Personality traits for content personalization
6. Recommended podcast style (conversational, analytical, energetic, casual)
7. A summary profile paragraph

Format your response as JSON with the following structure:
{
  "interests": ["topic1", "topic2", ...],
  "contentFormat": "podcast",
  "dailyTime": number_in_minutes,
  "podcastStyle": "style_preference",
  "preferredSpeed": number,
  "personalityTraits": ["trait1", "trait2", ...],
  "communicationStyle": "style_description",
  "learningGoals": ["goal1", "goal2", ...],
  "profileSummary": "A detailed paragraph describing the user's preferences and how to personalize content for them",
  "podcastPersona": "Description of the ideal podcast persona/host style for this user"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-realtime-preview-2024-12-17",
      messages: [
        { role: "system", content: "You are an expert at analyzing user preferences and creating detailed profiles for content personalization. Always respond with valid JSON." },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No analysis generated');
    }

    const analysis = JSON.parse(responseText);
    
    // Update session with analyzed profile
    session.userProfile = {
      ...session.userProfile,
      ...analysis
    };

    // Generate report document
    const report = {
      sessionId,
      timestamp: new Date().toISOString(),
      responses: session.responses,
      userProfile: session.userProfile,
      profileSummary: analysis.profileSummary,
      podcastPersona: analysis.podcastPersona,
      recommendedTopics: analysis.interests,
      contentStrategy: `Based on the user's preferences for ${analysis.podcastStyle} style content, ${analysis.dailyTime}-minute sessions, and interests in ${analysis.interests.join(', ')}, we recommend creating personalized podcast content that ${analysis.communicationStyle} and focuses on ${analysis.learningGoals.join(', ')}.`
    };

    return NextResponse.json({ 
      success: true,
      report,
      message: "Profile analysis complete! Your personalized podcast experience is ready."
    });

  } catch (error) {
    console.error('Error generating profile analysis:', error);
    
    // Fallback analysis based on basic response parsing
    const fallbackProfile = generateFallbackProfile(session.responses);
    session.userProfile = { ...session.userProfile, ...fallbackProfile };

    const report = {
      sessionId,
      timestamp: new Date().toISOString(),
      responses: session.responses,
      userProfile: session.userProfile,
      profileSummary: "Profile created from user responses with personalized content preferences.",
      contentStrategy: "Personalized podcast content based on stated interests and preferences."
    };

    return NextResponse.json({ 
      success: true,
      report,
      message: "Profile created! Your personalized podcast experience is ready."
    });
  }
}

function generateFallbackProfile(responses: OnboardingSession['responses']) {
  // Basic text analysis for fallback
  const allResponses = responses.map(r => r.response.toLowerCase()).join(' ');
  
  const interests = [];
  if (allResponses.includes('startup') || allResponses.includes('entrepreneur')) interests.push('Consumer Startups');
  if (allResponses.includes('ai') || allResponses.includes('artificial intelligence')) interests.push('AI & Machine Learning');
  if (allResponses.includes('marketing') || allResponses.includes('seo')) interests.push('SEO & Marketing');
  if (allResponses.includes('tech') || allResponses.includes('technology')) interests.push('Tech Industry News');

  let dailyTime = 5;
  if (allResponses.includes('quick') || allResponses.includes('short')) dailyTime = 3;
  if (allResponses.includes('long') || allResponses.includes('deep')) dailyTime = 15;

  let podcastStyle = 'conversational';
  if (allResponses.includes('analytical') || allResponses.includes('data')) podcastStyle = 'analytical';
  if (allResponses.includes('energetic') || allResponses.includes('motivational')) podcastStyle = 'energetic';
  if (allResponses.includes('casual') || allResponses.includes('relaxed')) podcastStyle = 'casual';

  return {
    interests: interests.length > 0 ? interests : ['Tech Industry News'],
    dailyTime,
    podcastStyle,
    communicationStyle: podcastStyle,
    personalityTraits: ['curious', 'learning-focused'],
    learningGoals: ['stay updated', 'professional development']
  };
}

export async function GET() {
  return NextResponse.json({ message: 'Voice onboarding endpoint is running' });
} 