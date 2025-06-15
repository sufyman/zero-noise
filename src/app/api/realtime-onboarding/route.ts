import { NextRequest, NextResponse } from 'next/server';

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
    const { action, sessionId, response: userResponse } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    switch (action) {
      case 'start_session':
        return await startSession();
      
      case 'submit_response':
        return await submitResponse(sessionId, userResponse);
      
      case 'get_session':
        return await getSession(sessionId);
      
      case 'generate_report':
        return await generateReport(sessionId);
      
      case 'get_realtime_config':
        return await getRealtimeConfig();
      
      case 'create_ephemeral_token':
        return await createEphemeralToken();
      
      case 'get_api_key':
        return await getApiKey();
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Realtime onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function startSession() {
  const sessionId = `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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

async function submitResponse(sessionId: string, userResponse: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const currentQuestion = session.questions[session.currentQuestionIndex];
  
  // Store the response
  session.responses.push({
    questionId: currentQuestion.id,
    question: currentQuestion.question,
    response: userResponse,
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

  // For now, use a simplified analysis since the Realtime API will handle the conversation
  // In a full implementation, you could still use GPT for final profile analysis
  const fallbackProfile = generateFallbackProfile(session.responses);
  session.userProfile = { ...session.userProfile, ...fallbackProfile };

  const report = {
    sessionId,
    timestamp: new Date().toISOString(),
    responses: session.responses,
    userProfile: session.userProfile,
    profileSummary: "Profile created from real-time conversation with personalized content preferences.",
    contentStrategy: "Personalized podcast content based on natural conversation and stated preferences."
  };

  return NextResponse.json({ 
    success: true,
    report,
    message: "Profile created from your conversation! Your personalized podcast experience is ready."
  });
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

async function createEphemeralToken() {
  try {
    // Create ephemeral token using OpenAI's sessions API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        modalities: ['text', 'audio'],
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        instructions: `You are Alex, a friendly and engaging podcast host conducting a voice onboarding interview. 

Your personality: You're practical, efficiency-focused like Tim Ferriss - you ask great questions and focus on actionable insights. You're warm, conversational, and genuinely interested in understanding the user.

Current context: You're conducting a 5-question onboarding interview to create a personalized podcast experience for this user.

Guidelines:
1. Keep responses natural and conversational
2. Ask follow-up questions when appropriate  
3. Be encouraging and show genuine interest
4. Maintain a friendly, professional tone
5. Remember previous answers and reference them
6. Guide the conversation through the 5 main areas: interests, time preferences, communication style, learning goals, and personality traits

After each user response, either:
- Ask a relevant follow-up question within the current topic
- Move to the next main question area
- Provide encouraging feedback before the next question

Make this feel like a natural conversation, not a rigid interview.`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create ephemeral token:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('OpenAI ephemeral token response:', {
      success: true,
      session_id: data.id,
      expires_at: data.expires_at,
      client_secret_type: typeof data.client_secret,
      client_secret_value_type: typeof data.client_secret?.value,
      client_secret_value_length: data.client_secret?.value?.length,
      client_secret_preview: typeof data.client_secret?.value === 'string' ? data.client_secret.value.substring(0, 10) + '...' : 'NOT_A_STRING',
      full_response_keys: Object.keys(data),
      client_secret_keys: data.client_secret ? Object.keys(data.client_secret) : 'NO_CLIENT_SECRET'
    });

    // Extract the actual client secret from the nested structure
    const clientSecret = data.client_secret?.value;
    
    if (!clientSecret || typeof clientSecret !== 'string') {
      throw new Error(`Invalid client_secret structure: ${JSON.stringify(data.client_secret)}`);
    }

    return NextResponse.json({
      client_secret: clientSecret,
      session_id: data.id,
      expires_at: data.expires_at
    });

  } catch (error) {
    console.error('Error creating ephemeral token:', error);
    return NextResponse.json(
      { error: 'Failed to create ephemeral token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getApiKey() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Return the API key for direct WebSocket connection
    // Note: This is only safe for server-side usage or development
    return NextResponse.json({
      api_key: process.env.OPENAI_API_KEY
    });

  } catch (error) {
    console.error('Error getting API key:', error);
    return NextResponse.json(
      { error: 'Failed to get API key', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getRealtimeConfig() {
  // Return configuration for direct WebSocket connection using ephemeral token
  return NextResponse.json({
    websocketUrl: 'wss://api.openai.com/v1/realtime',
    model: 'gpt-4o-mini-realtime-preview-2024-12-17',
    sessionConfig: {
      modalities: ['text', 'audio'],
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      voice: 'alloy',
      temperature: 0.8,
      max_response_output_tokens: 4096
    }
  });
}

export async function GET() {
  return NextResponse.json({ message: 'Realtime onboarding endpoint is running' });
} 