import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

export async function POST(req: Request) {
  const body = await req.json();
  const { parentNode, pathHistory } = body;

  console.log("--- API CALLED (GEMINI 3 FLASH) ---");
  console.log("Parent:", parentNode.title);

  try {
    if (!genAI) {
      throw new Error("Missing GOOGLE_API_KEY in .env.local");
    }

    console.log("🤖 Asking Gemini (gemini-3-flash-preview)...");
    
    // USING GEMINI 3 FLASH PREVIEW
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", 
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
      "hook": "Concise hook < 60 chars",
      "llm_config": { "definition": "Precise scope for this node", "exclude": "What belongs in sibling nodes" },
      "popup_data": {
        "description": "Robust definition (40-60 words).",
        "questions": ["Deep Question 1?", "Deep Question 2?", "Deep Question 3?"]
      },
      "preview_children": [
         { "title": "Grandchild 1", "hook": "Concise hook" },
         { "title": "Grandchild 2", "hook": "Concise hook" },
         { "title": "Grandchild 3", "hook": "Concise hook" },
         { "title": "Grandchild 4", "hook": "Concise hook" },
         { "title": "Grandchild 5", "hook": "Concise hook" }
      ]
    }
  ]
}
`
    });

    const description = parentNode.popup_data?.description || "A sub-topic of the parent.";
    const definition = parentNode.llm_config?.definition || "General sub-topics of this concept.";
    const exclusion = parentNode.llm_config?.exclude || "Avoid overlap with siblings.";

    const userPrompt = `
      CONTEXT:
      - PATH: ${JSON.stringify(pathHistory)}
      - CURRENT: "${parentNode.title}"
      - SCOPE: "${definition}"
      - EXCLUDE: "${exclusion}"
      
      Generate 5 Children + 25 Preview Grandchildren (5 per child).
    `;

    console.log("\n📝 --- USER PROMPT SENT TO GEMINI ---");
    console.log(userPrompt);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("No content generated");

    console.log("✅ FULL GEMINI RESPONSE:");
    const cleanedText = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanedText);

    console.log(JSON.stringify(data, null, 2));

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('❌ Generation error:', error);
    
    // MOCK FALLBACK
    const mockChildren = Array.from({ length: 5 }).map((_, i) => ({
      title: `${parentNode.title} Part ${i + 1}`,
      hook: `Deep dive into ${parentNode.title} - Section ${i + 1}`,
      llm_config: { definition: "Mock", exclude: "Mock" },
      popup_data: { description: "Mock", questions: [] },
      preview_children: Array.from({ length: 5 }).map((_, j) => ({
        title: `Next Step ${j + 1}`,
        hook: `Future topic ${j + 1}`
      }))
    }));

    return NextResponse.json({ children: mockChildren });
  }
}