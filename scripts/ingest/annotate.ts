import { GoogleGenAI } from '@google/genai';
import { MemeCandidate, CandidateConfig } from './types';

export async function annotateCandidate(
  candidate: MemeCandidate,
  imageBuffer: Buffer,
  genAI: GoogleGenAI,
  imageWidth: number,
  imageHeight: number
): Promise<CandidateConfig> {
  const slug = candidate.suggestedSlug || 'unknown';
  const base64Image = imageBuffer.toString('base64');

  const systemPrompt = `You are an expert meme curator and graphic designer.
Analyze the attached image and generate a complete, production-ready 'config.json' metadata object for this meme template.

Image actual dimensions: ${imageWidth}px width by ${imageHeight}px height.

Instructions:
1. **Metadata**:
   - 'name': ${JSON.stringify(candidate.title)}
   - 'visual_description': Detail characters, facial expressions, background, and visual scene elements.
   - 'usage_context': Explain when, why, and in what humorous situations someone uses this meme.
   - 'keywords': Relevant search tags (e.g. character names, emotions, topics).
   - 'sentiment': Select one of ["positive", "negative", "neutral", "sarcastic", "comparison", "custom"].
   - 'example': Provide funny, realistic key-value pairs matching each text_area id.

2. **Text Area Bounding Boxes**:
   - Place 1 to 4 'text_areas' bounding boxes (x, y, width, height) in pixels.
   - For multi-panel or labeled memes (like two buttons, Drake, comparison memes), locate each individual panel's white space or label box precisely.
   - For classic top/bottom memes, position top text box at y = 20px, height = ${Math.round(imageHeight * 0.2)}px, and bottom text box at y = ${Math.round(imageHeight * 0.75)}px.
   - Ensure x and y leave a 20-30px safety padding margin from extreme outer edges of the canvas to avoid text clipping.
   - Set 'fontSize' between 28px and 48px depending on available height.
   - Use 'color': "white" with 'stroke': "black" for classic dark/image backgrounds, or 'color': "black" (no stroke) for white background panels.
   - Set 'uppercase': true (for classic memes), 'textAlign': "center", 'fontFamily': "Impact".

Return ONLY raw valid JSON matching this exact structure (no markdown fences, no code blocks):
{
  "id": "${slug}",
  "name": "string",
  "visual_description": "string",
  "usage_context": "string",
  "keywords": ["string"],
  "sentiment": "positive|negative|neutral|sarcastic|comparison|custom",
  "image_width": ${imageWidth},
  "image_height": ${imageHeight},
  "example": { "text_area_id": "example joke" },
  "text_areas": [
    {
      "id": "string",
      "description": "string describing what text goes here",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "fontSize": number,
      "color": "string",
      "stroke": "string",
      "maxLength": number,
      "uppercase": boolean,
      "textAlign": "left|center|right",
      "fontFamily": "string"
    }
  ]
}`;

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: systemPrompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        ],
      }],
    });

    const rawText = (result.text ?? '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const config: CandidateConfig = JSON.parse(rawText);

    // Fallback defaults if missing & enforce white font color + black stroke
    config.id = slug;
    config.image_width = imageWidth;
    config.image_height = imageHeight;
    if (config.text_areas && Array.isArray(config.text_areas)) {
      config.text_areas.forEach(ta => {
        ta.color = 'white';
        if (!ta.stroke || ta.stroke === 'none') {
          ta.stroke = 'black';
        }
      });
    }

    return config;
  } catch (err: any) {
    // Fallback: if vision fails, create a basic config
    console.warn(`⚠️ Vision annotation skipped for ${slug}, using fallback config`);
    
    return {
      id: slug,
      name: candidate.title,
      visual_description: `Meme template: ${candidate.title}`,
      usage_context: `Use this meme template when appropriate`,
      keywords: [slug.replace(/-/g, ' ')],
      sentiment: 'neutral',
      image_width: imageWidth,
      image_height: imageHeight,
      example: { text_area: 'Example text' },
      text_areas: [
        {
          id: 'text_area',
          description: 'Main text area',
          x: 20,
          y: 20,
          width: imageWidth - 40,
          height: Math.round(imageHeight * 0.2),
          fontSize: Math.max(30, Math.round(imageHeight * 0.08)),
          color: 'white',
          stroke: 'black',
          maxLength: 60,
          uppercase: true,
          textAlign: 'center',
          fontFamily: 'Impact',
        },
      ],
    };
  }
}
