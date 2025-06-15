// lib/podcastfy.ts
import { Client } from "@gradio/client";

export interface PodcastfyParams {
  textInput: string;
  geminiKey: string;
  openaiKey?: string;
  elevenlabsKey?: string;
  wordCount?: number;
  conversationStyle?: string;
  rolesPerson1?: string;
  rolesPerson2?: string;
  dialogueStructure?: string;
  podcastName?: string;
  podcastTagline?: string;
  ttsModel?: "openai" | "edge" | "elevenlabs";
  creativity?: number;
  userInstructions?: string;
}

export async function generatePodcast(params: PodcastfyParams): Promise<Buffer> {
  // Connect to the Podcastfy Space
  const client = await Client.connect("thatupiso/Podcastfy.ai_demo");
  
  // Call the API with parameters in the exact order expected
  const result = await client.predict("/process_inputs", {
    text_input: params.textInput,
    urls_input: "", // Empty for text-only input
    pdf_files: null,
    image_files: null,
    gemini_key: params.geminiKey,
    openai_key: params.openaiKey || "",
    elevenlabs_key: params.elevenlabsKey || "",
    word_count: params.wordCount || 2000,
    conversation_style: params.conversationStyle || "engaging,fast-paced,enthusiastic",
    roles_person1: params.rolesPerson1 || "main summarizer",
    roles_person2: params.rolesPerson2 || "questioner/clarifier",
    dialogue_structure: params.dialogueStructure || "Introduction,Main Content Summary,Conclusion",
    podcast_name: params.podcastName || "PODCASTFY",
    podcast_tagline: params.podcastTagline || "YOUR PERSONAL GenAI PODCAST",
    tts_model: params.ttsModel || "openai",
    creativity_level: params.creativity || 0.7,
    user_instructions: params.userInstructions || ""
  });
  
  // Debug: Log the actual response format
  console.log('🔍 Gradio response:', JSON.stringify(result, null, 2));
  
  // Handle different response formats from Gradio client
  let audioUrl: string;
  
  if (typeof result.data === 'string') {
    audioUrl = result.data;
  } else if (Array.isArray(result.data) && result.data.length > 0) {
    // Extract URL from the first file object
    const fileObj = result.data[0];
    if (fileObj && typeof fileObj === 'object' && 'url' in fileObj) {
      audioUrl = (fileObj as any).url;
    } else {
      throw new Error(`Expected file object with URL, got: ${JSON.stringify(fileObj)}`);
    }
  } else if (result.data && typeof result.data === 'object' && 'url' in result.data) {
    audioUrl = (result.data as any).url;
  } else if (result.data && typeof result.data === 'object' && 'path' in result.data) {
    // If it's a file path, construct the full URL
    const spaceDomain = "thatupiso-podcastfy-ai-demo.hf.space";
    audioUrl = `https://${spaceDomain}/file=${encodeURIComponent((result.data as any).path)}`;
  } else {
    throw new Error(`Unexpected response format: ${JSON.stringify(result)}`);
  }
  
  console.log('🎵 Audio URL:', audioUrl);
  
  // Fetch the audio file
  const response = await fetch(audioUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  
  return Buffer.from(arrayBuffer);
} 