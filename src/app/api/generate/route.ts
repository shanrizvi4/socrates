import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI only if key exists
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

export async function POST(req: Request) {
  const body = await req.json();
  const { parentNode, pathHistory } = body;

  console.log("--- API CALLED ---");
  console.log("Parent:", parentNode.title);
  console.log("Has OpenAI Key?", !!openai);

  try {
    if (!openai) {
      throw new Error("Missing OpenAI API Key in .env.local");
    }

    console.log("🤖 Asking OpenAI (gpt-4o-mini)...");

    // 1. Construct the System Prompt (The Rules)
    const systemPrompt = `
      You are the Chief Taxonomist of an advanced Knowledge Graph. Your goal is to map human knowledge into a structured, infinite tree.

      You will be given a [Path History] representing the user's journey and a list of [Existing Children].
      Your task is to generate {COUNT} NEW, distinct sub-topics that fit under the current Leaf Node.

      ### 1. THE "ONE STEP DOWN" RULE (CRITICAL)
      You must determine the correct level of granularity based on the [Current Leaf].
      - **Do not skip layers.** If the current topic is broad (e.g., "History"), break it into eras or major themes, not specific events.
      - **Do not stay flat.** If the current topic is broad, do not just list synonyms for it.
      - **The Test:** The new topics must be *components* of the parent, not just *examples* of it.

      ### 2. RULES FOR TITLES (THE NODES)
      - **Mutually Exclusive:** The new nodes must not overlap with each other or the [Existing Children].
      - **Scope Adherence:** You must strictly follow the [Scope Definition] provided.
      - **Intellectual Clarity:** Titles should be descriptive and substantial. Avoid "Miscellaneous" or "General Overview."

      ### 3. RULES FOR HOOKS (THE PITCH)
      - **Length:** Under 60 characters.
      - **Style:** Active voice. Professional but engaging.
      - **Goal:** Describe the *significance* or *mechanism* of the sub-topic. Why does this bucket exist?

      ### 4. RULES FOR QUESTIONS (THE "SMART STUDENT" PROTOCOL)
      Generate 3 questions for the popup. Follow these 4 strict rules:
      1. **Causal, Not Speculative:** Ask "How" or "Why," not "Will." Focus on mechanisms.
      2. **Structural, Not Trivia:** Ask about limits, systems, and paradoxes, not biggest/smallest/dates.
      3. **Answerable with Theory/History:** Questions must have explainable answers, not just open guesses.
      4. **The "Professor" Test:** The question should invite an explanation of a fundamental theory or relationship.

      ### 5. OUTPUT FORMAT
      Return ONLY raw JSON. No markdown.
      {
        "children": [
          {
            "title": "Title Case String",
            "hook": "String <60 chars",
            "llm_config": {
              "definition": "Precise scope for the NEXT layer down",
              "exclude": "What belongs in sibling nodes"
            },
            "popup_data": {
              "description": "2-3 sentences contextualizing why this sub-topic is structurally important.",
              "questions": ["Question 1?", "Question 2?", "Question 3?"]
            }
          }
        ]
      }
    `;

    // 2. Construct the User Prompt (The Variables)
    const description = parentNode.popup_data?.description || "A sub-topic of the parent.";
    const definition = parentNode.llm_config?.definition || "General sub-topics of this concept.";
    const exclusion = parentNode.llm_config?.exclude || "Avoid overlap with siblings.";

    const userPrompt = `
      CONTEXT:
      - PATH_HISTORY: ${JSON.stringify(pathHistory)}
      - CURRENT_LEAF: "${parentNode.title}"
      - CURRENT_LEAF_DESCRIPTION: "${description}"
      - SCOPE_DEFINITION: "${definition}"
      - SCOPE_EXCLUSION: "${exclusion}"
      - EXISTING_CHILDREN: [] 
      - COUNT: 5

      Task: Analyze the depth of the Current Leaf and generate the next 5 logical sub-nodes.
    `;

    // --- LOGGING THE PROMPTS ---
    console.log("\n📝 --- SYSTEM PROMPT ---");
    console.log(systemPrompt);
    console.log("\n📝 --- USER PROMPT ---");
    console.log(userPrompt);
    console.log("-------------------------\n");

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    
    if (!content) throw new Error("No content generated");

    const data = JSON.parse(content);

    // CHANGED: Log the FULL response nicely
    console.log("✅ FULL OPENAI RESPONSE:");
    console.log(JSON.stringify(data, null, 2));

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('❌ Generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate nodes' }, { status: 500 });
  }
}