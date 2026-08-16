import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { GenerateMemeRequest, MemeTemplate, LLMResponse, MemeTemplateId } from '@/types';

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { renderMeme } from '@/lib/memeRenderer';

// Dynamically build the registry by reading the templates directory
const templatesDir = path.join(process.cwd(), 'public', 'templates');
const templates: MemeTemplate[] = [];

if (fs.existsSync(templatesDir)) {
  const folders = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const folder of folders) {
    const configPath = path.join(templatesDir, folder, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      templates.push(config);
    }
  }
}

async function getMemeFromLLM(reqData: GenerateMemeRequest): Promise<LLMResponse> {
  // Build a minimal catalog for the LLM to save tokens and keep it focused
  const llmCatalog = templates.map(t => ({
    id: t.id,
    name: t.name,
    visual_description: t.visual_description,
    usage_context: t.usage_context,
    keywords: t.keywords,
    example: t.example,
    text_areas_to_fill: t.text_areas.map(ta => ({
      id: ta.id,
      description: ta.description
    }))
  }));

  const systemInstruction = `You are a world-class meme generator bot. Your job is to generate up to 5 different meme options based on a user's conversation and context. Provide a variety of jokes, sentiments, and template choices.

Here is the catalog of available meme templates:
${JSON.stringify(llmCatalog, null, 2)}

Instructions:
1. Analyze the Context and Conversation provided by the user.
2. Select up to 5 templates from the catalog that best fit the humor or situation.
3. You MUST generate short, punchy text for EVERY text area defined in the chosen templates' 'text_areas_to_fill'.
4. CRITICAL: The 'text_payloads' object MUST contain keys that exactly match the IDs from 'text_areas_to_fill'. Do NOT leave it empty.
5. Ensure the text fits the 'description' of that text area.`;

  const userPrompt = `Context: ${reqData.context}\n\nConversation:\n${reqData.conversation}`;

  try {
    const validTemplateIds = templates.map(t => t.id).join(', ');
    
    // We use generateText and parse manually because Vercel AI SDK has a known bug
    // parsing z.record() objects with Gemini's structured output.
    const systemPromptWithSchema = systemInstruction + `\n\nCRITICAL: You MUST output strictly valid JSON and nothing else. No markdown formatting like \`\`\`json. Your JSON must follow this exact structure:
{
  "memes": [
    {
      "selected_template_id": "ONE OF: ${validTemplateIds}",
      "text_payloads": {
        "exact_text_area_id_here": "your funny text here"
      }
    }
  ]
}`;

    const { text } = await generateText({
      model: google('gemini-3.7-flash'),
      system: systemPromptWithSchema,
      prompt: userPrompt
    });
    
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const object = JSON.parse(cleanText);
    
    // We return it exactly as LLMResponse to fit the interface expected below
    return object as LLMResponse;
  } catch (e) {
    console.error("LLM Generation failed:", e);
    // Fallback if LLM fails
    return {
      memes: [
        {
          selected_template_id: MemeTemplateId.DRAKE,
          text_payloads: {
            top_right: "The LLM failed to connect",
            bottom_right: "But the fallback code works!"
          }
        }
      ]
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateMemeRequest = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    // 1. Ask LLM for the best templates and text
    const llmResponse = await getMemeFromLLM(body);
    
    console.log("RAW LLM Output:", JSON.stringify(llmResponse, null, 2));

    const generatedMemes = [];
    
    // Ensure we have an array of memes to process (max 5)
    const memesToProcess = Array.isArray(llmResponse.memes) ? llmResponse.memes.slice(0, 5) : [];

    for (const memeData of memesToProcess) {
      // 2. Find template details
      const template = templates.find(t => t.id === memeData.selected_template_id);
      if (!template) {
        console.error(`LLM chose an invalid template ID: "${memeData.selected_template_id}"`);
        continue;
      }

      // 3 & 4. Render Meme
      const buffer = await renderMeme(template, memeData.text_payloads);

      // 5. Convert to base64
      const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;
      
      generatedMemes.push({
        url: base64Image,
        template_name: template.name
      });
    }

    return NextResponse.json({ 
      success: true, 
      memes: generatedMemes,
      debug_info: {
        user_inputs: body,
        llm_system_instruction: "See server logs for prompt details",
        llm_input_prompt: `Context: ${body.context} | Conv: ${body.conversation}`,
        llm_raw_output: llmResponse
      }
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Unknown error",
      debug_info: {
        raw_error: error.toString()
      }
    }, { status: 500 });
  }
}
