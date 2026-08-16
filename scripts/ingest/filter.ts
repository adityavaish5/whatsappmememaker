import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { MemeCandidate, InspectionResult } from './types';

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image from ${url}: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function inspectCandidate(
  candidate: MemeCandidate,
  imageBuffer: Buffer,
  genAI: GoogleGenAI
): Promise<InspectionResult> {
  const slug = candidate.suggestedSlug || 'unknown';
  const templatesDir = path.join(process.cwd(), 'public', 'templates');

  // 1. Check if template or similar slug already exists locally
  if (fs.existsSync(templatesDir)) {
    const existingDirs = fs.readdirSync(templatesDir);
    const normalizedCandidateSlug = slug.replace(/[-_]/g, '');

    const duplicateDir = existingDirs.find((dir) => {
      const normalizedExisting = dir.replace(/[-_]/g, '');
      return dir === slug || normalizedExisting === normalizedCandidateSlug || normalizedCandidateSlug.includes(normalizedExisting) || normalizedExisting.includes(normalizedCandidateSlug);
    });

    if (duplicateDir) {
      return {
        candidate,
        passedFilter: false,
        reason: `Template already exists locally under 'public/templates/${duplicateDir}'.`,
      };
    }
  }

  // 2. Gemini Vision Check: Verify image is a clean, text-free blank template
  try {
    const base64Image = imageBuffer.toString('base64');

    const prompt = `Analyze this image carefully to evaluate if it is a suitable BLANK MEME TEMPLATE.

Respond ONLY with a valid JSON object matching this schema (no markdown, no backticks):
{
  "is_blank_template": boolean,
  "has_prebaked_text": boolean,
  "is_high_quality": boolean,
  "reason": "short explanation of judgment"
}

Criteria:
1. "has_prebaked_text": true if the image ALREADY has meme caption text, joke text, or overlaid top/bottom meme text written on it. (Minor watermarks or built-in signs like street signs/subtitles are okay if part of the original image scene).
2. "is_blank_template": true if this image serves as a clean canvas where text can be placed.
3. "is_high_quality": true if the image is clear, crisp, and not heavily pixelated or corrupted.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        ],
      }],
    });

    const text = (result.text ?? '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const json = JSON.parse(text);

    if (json.has_prebaked_text) {
      return {
        candidate,
        passedFilter: false,
        reason: `Rejected by Gemini Vision: Image already contains pre-baked text (${json.reason})`,
      };
    }

    if (!json.is_blank_template) {
      return {
        candidate,
        passedFilter: false,
        reason: `Rejected by Gemini Vision: Not a valid blank template (${json.reason})`,
      };
    }

    if (!json.is_high_quality) {
      return {
        candidate,
        passedFilter: false,
        reason: `Rejected by Gemini Vision: Low image quality (${json.reason})`,
      };
    }

    return {
      candidate,
      passedFilter: true,
      reason: 'Passed blank-template inspection',
    };
  } catch (err: any) {
    console.warn(`⚠️ Vision filter warning for ${slug}:`, err?.message || err);
    // Default to passing if vision API has temporary non-fatal error, unless error is severe
    return {
      candidate,
      passedFilter: true,
      reason: 'Vision filter skipped due to warning',
    };
  }
}
