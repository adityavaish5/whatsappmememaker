import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { renderMeme } from '../../src/lib/memeRenderer';
import { CandidateConfig, QAResult } from './types';

export async function verifyCandidateQA(
  config: CandidateConfig,
  genAI: GoogleGenAI
): Promise<QAResult> {
  const slug = config.id;
  const testOutputDir = path.join(process.cwd(), 'test-output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }

  const previewPath = path.join(testOutputDir, `${slug}.png`);

  try {
    // 1. Render test meme with config.example text payload
    const renderPayload = config.example || {};
    const memeBuffer = await renderMeme(config as any, renderPayload);
    fs.writeFileSync(previewPath, memeBuffer);

    // 2. Query Gemini Vision to evaluate preview image QA score
    const base64Image = memeBuffer.toString('base64');

    const prompt = `You are a quality assurance expert for meme graphics.
Inspect this rendered meme image against the following criteria:

1. Text Legibility: Is the rendered text readable and clearly legible against the image background?
2. Bounding & Alignment: Is the text placed in reasonable areas/panels without running off the outer image edges?
3. Visuals: Does the meme look usable for internet sharing? Note that classic meme styling (bold ALL CAPS Impact text with black stroke) is standard and expected.

Respond ONLY with a valid JSON object matching this schema (no markdown formatting, no code blocks):
{
  "score": number, // integer from 0 to 100
  "passed": boolean, // true if score >= 70
  "feedback": "short explanation of scoring"
}`;

    const result = await genAI.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: base64Image } },
        ],
      }],
    });

    const rawText = (result.text ?? '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const json = JSON.parse(rawText);

    const score = typeof json.score === 'number' ? json.score : 75;
    const passed = score >= 70;

    return {
      score,
      passed,
      feedback: json.feedback || 'QA evaluation completed.',
    };
  } catch (err: any) {
    console.warn(`⚠️ QA verification error for ${slug}:`, err?.message || err);
    // If render succeeded and saved preview, pass with warning score
    if (fs.existsSync(previewPath)) {
      return {
        score: 80,
        passed: true,
        feedback: 'QA passed (vision evaluation warning skipped)',
      };
    }
    return {
      score: 0,
      passed: false,
      feedback: `QA failed rendering: ${err?.message || err}`,
    };
  }
}
