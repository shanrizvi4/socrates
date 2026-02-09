import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

export async function POST(req: Request) {
  const body = await req.json();
  const { parentNode, pathHistory, excludeTitles = [] } = body;

  console.log("--- API CALLED (GEMINI 2.5 FLASH LITE) ---");
  console.log("Path history:", pathHistory);
  if (excludeTitles.length > 0) {
    console.log(`Excluding ${excludeTitles.length} existing topics`);
  }

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
Your goal is to map human knowledge into a structured, infinite tree.

TASK:
Generate 5 NEW, distinct sub-topics (Children) for the current node.

### 0. CONTEXTUAL AWARENESS (MOST CRITICAL)
- You will receive a CONTEXTUAL CHAIN showing the ancestor path leading to the current node.
- **ALWAYS generate children specific to this context.** Do NOT generate generic sub-topics.
- Example: If the chain is "World War 2 → Rise of Fascism → German Nazism → Totalitarian Control", children should be about totalitarian control SPECIFICALLY as practiced by Nazi Germany (e.g., "Gestapo Surveillance", "Propaganda Ministry", "Hitler Youth Indoctrination"), NOT generic concepts like "Censorship" or "Authoritarianism".

### 1. THE "ONE STEP DOWN" RULE
- **Granularity:** Determine the correct level of granularity. Do not skip layers.
- **Components vs Examples:** The new topics must be structural *components* of the parent, not just random *examples*.
- **Mutually Exclusive:** The new nodes must not overlap with each other.

### 2. LENGTH & STYLE CONSTRAINTS
- **TITLES:** Max 20 characters (including spaces). Keep to 2-3 punchy words. This is a hard limit — titles MUST fit in 20 characters.
- **HOOKS:** Max 50 characters (including spaces). Explain *what* it is in active voice. This is a hard limit.

### 3. POPUP CONTENT (The "Smart Student" Protocol)
- **DESCRIPTION:** A detailed summary (40-60 words). Contextualize *why* this sub-topic is important within the given ancestral context.
- **QUESTIONS:** Generate exactly 3 conversational questions specific to the contextual chain.
    1. **Causal:** Ask "How" or "Why," focusing on mechanisms.
    2. **Structural:** Ask about limits, systems, and paradoxes.
    3. **Tone:** Curious and conversational.

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

    const definition = parentNode.llm_config?.definition || "General sub-topics.";
    const exclusion = parentNode.llm_config?.exclude || "Avoid overlap.";

    // Build exclusion string from both llm_config and already-generated titles
    const allExclusions = [
      exclusion,
      ...(excludeTitles.length > 0 ? [`Already generated (DO NOT repeat these): ${excludeTitles.join(', ')}`] : [])
    ].join('. ');

    // Build ancestry context from the last 3 generations (excluding the current node)
    const ancestryPath = pathHistory.slice(-4, -1); // Last 3 ancestors before current
    const ancestryContext = ancestryPath.length > 0
      ? `This topic exists within a specific context: ${ancestryPath.join(' → ')} → ${parentNode.title}. Generate children that are SPECIFICALLY relevant to this contextual chain, NOT general information about "${parentNode.title}" in isolation.`
      : '';

    const userPrompt = `
      CURRENT NODE: "${parentNode.title}"
      ${ancestryContext ? `\nCONTEXTUAL CHAIN: ${ancestryContext}` : ''}

      SCOPE: "${definition}"
      EXCLUDE: "${allExclusions}"

      CRITICAL: The children you generate must be specifically about "${parentNode.title}" AS IT RELATES TO the contextual chain above.
      ${ancestryPath.length > 0 ? `For example, if the chain is "World War 2 → Rise of Fascism → German Nazism → Totalitarian Control", generate children about totalitarian control SPECIFICALLY in Nazi Germany during WW2, not general totalitarian control concepts.` : ''}

      Generate 5 NEW and DIFFERENT Children.
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