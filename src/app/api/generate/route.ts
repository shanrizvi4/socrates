import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

export async function POST(req: Request) {
  const body = await req.json();
  const { parentNode, pathHistory, excludeTitles = [] } = body;

  console.log("--- API CALLED (GEMINI 2.5 FLASH LITE) ---");
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
Generate 5 NEW, distinct sub-topics (Children) for the current node + 5 Preview Grandchildren for each.

### 1. THE "ONE STEP DOWN" RULE (CRITICAL)
- **Granularity:** Determine the correct level of granularity. Do not skip layers. If the topic is broad (e.g., "Physics"), break it into major branches (e.g., "Classical Mechanics"), not specific equations.
- **Components vs Examples:** The new topics must be structural *components* of the parent, not just random *examples*.
- **Mutually Exclusive:** The new nodes must not overlap with each other.

### 2. LENGTH & STYLE CONSTRAINTS
- **TITLES:** Max 4 words. Simple, punchy, and definitive (e.g., "Quantum Mechanics", not "The Study of Quantum Mechanics").
- **HOOKS:** Max 60 chars. Explain *what* it is in active voice. (e.g., "The physics of the subatomic world.")

### 3. POPUP CONTENT (The "Smart Student" Protocol)
- **DESCRIPTION:** A detailed, robust summary (approx 40-60 words). Contextualize *why* this sub-topic is structurally important. Explain the mechanism, not just the definition.
- **QUESTIONS:** Generate exactly 3 natural, conversational questions that invite deep explanation.
    1. **Causal:** Ask "How" or "Why," not "What." Focus on mechanisms.
    2. **Structural:** Ask about limits, systems, and paradoxes.
    3. **Tone:** Curious and conversational, not dry or academic.

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

    const userPrompt = `
      CONTEXT:
      - PATH: ${JSON.stringify(pathHistory)}
      - CURRENT: "${parentNode.title}"
      - SCOPE: "${definition}"
      - EXCLUDE: "${allExclusions}"

      Generate 5 NEW and DIFFERENT Children that do not overlap with any previously generated topics.
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