import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

const EXPLORE_SYSTEM_PROMPT = `
You are the Librarian of the "Socrates" Knowledge Graph, creating rich exploratory content.

Your task: Write an engaging, in-depth article (around 600 words) about the given topic. Speak like you're an encyclopedia, not like you're talking to a person. Keep it somewhat casual though.

STYLE:
- Tone: Lean on being accessible and NOT pretentious. PLEASE DO NOT be pretentious, speak eloquently but normally (for example, avoid words like intertwined and tapestry talk normal)
- Format: Use short paragraphs. Include a subtle structure with some headers and organization so that its not just one big blob of text but is instead more easily digestable.
- Complete: Try not to be vague as much as possible, tell the complete answer as far as you can without hand-waiving. If you don't have space to cover something important in detail, include it in your suggested questions. Detail is key, teach with confidence.

IMPORTANT: At the END of your response, you must include a JSON block with 3 suggested follow-up questions. Format it EXACTLY like this, on its own line at the very end:
<!--QUESTIONS:["Question 1?", "Question 2?", "Question 3?"]-->

The questions should be interesting but not pretentious - what might a student new to this topic ask as a follow up? A good question is that which if answered, will genuinely make the user better understand about the topic. Pick from:
1. DEEPER - A "how" or "mechanism" question about internal workings
2. BROADER - A question connecting to other concepts, fields, or implications
3. LIMITS - A question about edge cases, challenges, or controversies
`;

const CHAT_SYSTEM_PROMPT = `
You are the Librarian of the "Socrates" Knowledge Graph, engaging in thoughtful conversation.

STYLE:
- Tone: Academic but accessible, conversational. Never start with "That is an excellent question" or any variation of it
- Length: Keep answers 150-300 words (for answers without simple answers, lean towards longer answers)
- Format: Short paragraphs, direct and engaging
- Complete: Try not to be vague as much as possible, tell the complete answer as far as you can without hand-waiving. If you don't have space to cover something important in detail, include it in your suggested questions.

IMPORTANT: At the END of your response, you must include a JSON block with 3 suggested follow-up questions. Format it EXACTLY like this, on its own line at the very end:
<!--QUESTIONS:["Question 1?", "Question 2?", "Question 3?"]-->

The questions should be interesting but not pretentious - what might a student ask as a follow up? A good question is that which if answered, will genuinely make the user better understand about the topic. Pick from:
1. DEEPER - A "how" or "mechanism" question about internal workings
2. BROADER - A question connecting to other concepts or fields
3. LIMITS - A question about edge cases, challenges, or limitations
`;

export async function POST(req: Request) {
  const body = await req.json();
  const { message, nodeTitle, ancestryPath = [], mode = 'chat', history } = body;

  console.log(`--- CHAT API CALLED (mode: ${mode}, streaming) ---`);
  console.log("Ancestry path:", ancestryPath);

  try {
    if (!genAI) {
      throw new Error("Missing GOOGLE_API_KEY");
    }

    const systemPrompt = mode === 'explore' ? EXPLORE_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemPrompt
    });

    // Convert history to Gemini format
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory
    });

    // Build ancestry context string
    const ancestryContext = ancestryPath.length > 0
      ? `\n\nIMPORTANT CONTEXT: This topic "${nodeTitle}" exists within a specific knowledge path: ${ancestryPath.join(' → ')} → ${nodeTitle}. Your response should be specifically about "${nodeTitle}" as it relates to this contextual chain, NOT general information about "${nodeTitle}" in isolation. For example, if discussing "Totalitarian Control" in the context of "World War 2 → Rise of Fascism → German Nazism", focus specifically on Nazi totalitarian control, not general totalitarianism. DO NOT reference or restate this context path in your response — the user already knows where they are.`
      : '';

    // Enhance the message with context for explore mode
    const enhancedMessage = mode === 'explore'
      ? `Write an in-depth exploration about "${nodeTitle}".${ancestryContext}`
      : `${message}${ancestryContext}`;

    // Use streaming
    const result = await chat.sendMessageStream(enhancedMessage);

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('❌ Chat error:', error);
    return new Response(
      JSON.stringify({ error: "The library is currently closed for reorganization. (API Error)" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
