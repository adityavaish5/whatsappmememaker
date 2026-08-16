import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { GenerateMemeRequest, MemeTemplate, LLMResponse } from '@/types';

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// Read registry once
const registryPath = path.join(process.cwd(), 'public', 'templates', 'registry.json');
const templates: MemeTemplate[] = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

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

  const systemInstruction = `You are a world-class meme generator bot. Your job is to select the most appropriate meme template based on a user's conversation and context, and then generate funny, highly-relevant text to place on that meme.

Here is the catalog of available meme templates:
${JSON.stringify(llmCatalog, null, 2)}

Instructions:
1. Analyze the Context and Conversation provided by the user.
2. Select ONE template from the catalog that best fits the humor or situation.
3. You MUST generate short, punchy text for EVERY text area defined in the chosen template's 'text_areas_to_fill'.
4. CRITICAL: The 'text_payloads' object MUST contain keys that exactly match the IDs from 'text_areas_to_fill'. Do NOT leave it empty.
5. Ensure the text fits the 'description' of that text area.`;

  const userPrompt = `Context: ${reqData.context}\n\nConversation:\n${reqData.conversation}`;

  try {
    const validTemplateIds = templates.map(t => t.id).join(', ');
    
    // We use generateText and parse manually because Vercel AI SDK has a known bug
    // parsing z.record() objects with Gemini's structured output.
    const systemPromptWithSchema = systemInstruction + `\n\nCRITICAL: You MUST output strictly valid JSON and nothing else. No markdown formatting like \`\`\`json. Your JSON must follow this exact structure:
{
  "selected_template_id": "ONE OF: ${validTemplateIds}",
  "text_payloads": {
    "exact_text_area_id_here": "your funny text here"
  }
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
      selected_template_id: 'drake',
      text_payloads: {
        top_right: "The LLM failed to connect",
        bottom_right: "But the fallback code works!"
      }
    };
  }
}

// Simple text wrapping helper for Canvas
function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.strokeText(line, x, currentY);
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.strokeText(line, x, currentY);
  ctx.fillText(line, x, currentY);
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateMemeRequest = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    // 1. Ask LLM for the best template and text
    const llmResponse = await getMemeFromLLM(body);
    
    console.log("RAW LLM Output:", JSON.stringify(llmResponse, null, 2));

    // 2. Find template details
    const template = templates.find(t => t.id === llmResponse.selected_template_id);
    if (!template) {
      console.error(`LLM chose an invalid template ID: "${llmResponse.selected_template_id}"`);
      throw new Error(`Template '${llmResponse.selected_template_id}' not found in registry`);
    }

    // 3. Load image buffer
    const imagePath = path.join(process.cwd(), 'public', 'templates', template.filename);
    
    // Fallback logic if image doesn't exist (since we haven't downloaded the actual jpgs yet)
    let image;
    try {
      image = await loadImage(imagePath);
    } catch(e) {
      // Create a dummy image if file is missing
      const dummyCanvas = createCanvas(1200, 1200);
      const dctx = dummyCanvas.getContext('2d');
      dctx.fillStyle = '#cccccc';
      dctx.fillRect(0, 0, 1200, 1200);
      dctx.fillStyle = '#000000';
      dctx.font = '40px Arial';
      dctx.fillText('Placeholder Image for: ' + template.filename, 100, 100);
      
      // Draw placeholder boxes
      template.text_areas.forEach(area => {
        dctx.strokeStyle = 'red';
        dctx.lineWidth = 4;
        dctx.strokeRect(area.x, area.y, area.width, area.height);
      });
      image = await loadImage(dummyCanvas.toBuffer());
    }

    // 4. Set up Canvas to draw the meme
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Draw text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    template.text_areas.forEach(area => {
      const text = llmResponse.text_payloads[area.id] || "";
      
      ctx.font = `bold ${area.fontSize}px Impact, Arial`;
      ctx.fillStyle = area.color;
      
      if (area.stroke) {
        ctx.strokeStyle = area.stroke;
        ctx.lineWidth = area.fontSize / 10;
      } else {
        ctx.lineWidth = 0;
      }

      // Center the text inside the bounding box
      const centerX = area.x + (area.width / 2);
      const centerY = area.y + (area.height / 2);
      
      wrapText(ctx, text, centerX, centerY, area.width, area.fontSize * 1.2);
    });

    // 5. Convert back to base64 to send to client
    const buffer = canvas.toBuffer('image/png');
    const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

    return NextResponse.json({ 
      success: true, 
      imageUrl: base64Image,
      template_used: template.name,
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
