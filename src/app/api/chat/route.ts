import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

export async function POST(req: Request) {
  const body = await req.json();
  const { message, history } = body; // history is Array<{ role: 'user'|'model', content: string }>

  console.log("--- CHAT API CALLED ---");

  try {
    if (!genAI) {
      throw new Error("Missing GOOGLE_API_KEY");
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      systemInstruction: `
You are the Librarian of the "Socrates" Knowledge Graph.
Your goal is to explain complex topics simply, conversationally, and concisely.

STYLE:
- Tone: Academic but accessible (like a "Field Notes" journal).
- Length: Keep answers under 150 words unless asked for more depth.
- Format: Use short paragraphs. Avoid dense walls of text.
- Philosophy: Encourage curiosity.
`
    });

    // Convert history to Gemini format
    // Note: Gemini API expects 'user' and 'model' roles, which matches our store.
    const chat = model.startChat({
      history: history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });

  } catch (error: any) {
    console.error('❌ Chat error:', error);
    return NextResponse.json({ 
      response: "The library is currently closed for reorganization. (API Error)" 
    }, { status: 500 });
  }
}