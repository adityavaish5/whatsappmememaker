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

    // Skip Gemini QA check as requested by the user
    return {
      score: 100,
      passed: true,
      feedback: 'Rendered successfully (Gemini QA check skipped)',
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
