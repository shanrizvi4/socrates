import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

export async function POST(req: Request) {
  const body = await req.json();
  const { parentNode, pathHistory } = body;

  console.log("--- API CALLED (GEMINI 2.5 FLASH LITE) ---");

  try {
    if (!genAI) {
      throw new Error("Missing GOOGLE_API_KEY in .env.local");
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite", 
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: `
You are the Chief Taxonomist of an advanced Knowledge Graph.

TASK: Generate 5 NEW sub-topics (Children) for the current node.

### 1. STRUCTURE RULES
- **Granularity:** Do not skip layers.
- **Mutually Exclusive:** No overlap between nodes.

### 2. CONTENT RULES
- **Titles:** Max 4 words. Simple and definitive.
- **Hooks:** 55-65 chars. Active voice.

### 3. POPUP DATA (REQUIRED)
- **Description:** Robust summary (70-90 words). Explain the topic and contextualize *why* this sub-topic is structurally important. (Don't say anything like "This topic..." just write about the topic)
- **Questions:** Exactly 3 natural, conversational deep questions.

OUTPUT FORMAT (JSON ONLY):
{
  "children": [
    {
      "title": "Child Title",
      "hook": "Concise hook",
      "llm_config": { "definition": "...", "exclude": "..." },
      "popup_data": {
        "description": "Robust definition.",
        "questions": ["Q1?", "Q2?", "Q3?"]
      }
    }
  ]
}
`
    });

    const description = parentNode.popup_data?.description || "A sub-topic.";
    const definition = parentNode.llm_config?.definition || "General sub-topics.";
    const exclusion = parentNode.llm_config?.exclude || "Avoid overlap.";

    const userPrompt = `
      CONTEXT:
      - PATH: ${JSON.stringify(pathHistory)}
      - CURRENT: "${parentNode.title}"
      - SCOPE: "${definition}"
      - EXCLUDE: "${exclusion}"
      
      Generate 5 Children.
    `;

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("No content generated");

    const cleanedText = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('❌ Generation error:', error);
    return NextResponse.json({ children: [] });
  }
}