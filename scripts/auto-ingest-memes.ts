import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { loadImage } from '@napi-rs/canvas';
import dotenv from 'dotenv';

import { fetchCandidates } from './ingest/sources';
import { fetchImageBuffer, inspectCandidate } from './ingest/filter';
import { annotateCandidate } from './ingest/annotate';
import { verifyCandidateQA } from './ingest/verify';
import { IngestOptions } from './ingest/types';

dotenv.config();

function parseArgs(): IngestOptions {
  const args = process.argv.slice(2);
  const options: IngestOptions = {
    limit: 5,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--limit=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val > 0) options.limit = val;
    } else if (arg === '--limit' && i + 1 < args.length) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val) && val > 0) {
        options.limit = val;
        i++; // skip next arg
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  console.log(`\n🚀 Starting Meme Template Ingestion CLI`);
  console.log(`Target Limit: ${options.limit} templates | Dry Run: ${options.dryRun}\n`);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not set in .env');
    process.exit(1);
  }

  // Debug: verify API key is loaded
  console.log(`✓ API Key loaded: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`);
  console.log(`✓ API Key length: ${apiKey.length}\n`);

  const genAI = new GoogleGenAI({ apiKey });

  // 1. Fetch Candidates from Sources
  const candidates = await fetchCandidates(options);
  if (candidates.length === 0) {
    console.log('No candidates returned from sources. Exiting.');
    return;
  }

  let addedCount = 0;
  let processedCount = 0;
  const summary: Array<{ slug: string; name: string; status: 'added' | 'skipped' | 'failed'; reason?: string }> = [];
  const addedSlugs: string[] = [];

  for (const candidate of candidates) {
    if (addedCount >= (options.limit || 5)) {
      console.log(`\n✅ Reached target limit of ${options.limit} new templates.`);
      break;
    }

    processedCount++;
    const slug = candidate.suggestedSlug || 'unknown';

    // 1. Quick local duplicate check upfront (before downloading/processing)
    const templatesDir = path.join(process.cwd(), 'public', 'templates');
    if (fs.existsSync(templatesDir)) {
      const existingDirs = fs.readdirSync(templatesDir);
      const normalizedCandidateSlug = slug.replace(/[-_]/g, '');

      const duplicateDir = existingDirs.find((dir) => {
        const normalizedExisting = dir.replace(/[-_]/g, '');
        return dir === slug || normalizedExisting === normalizedCandidateSlug || normalizedCandidateSlug.includes(normalizedExisting) || normalizedExisting.includes(normalizedCandidateSlug);
      });

      if (duplicateDir) {
        console.log(`\n--------------------------------------------------`);
        console.log(`[${processedCount}/${candidates.length}] Skipping duplicate candidate: "${candidate.title}" -> '${slug}'`);
        console.log(`  ⏭️ Skipped: Template already exists locally under 'public/templates/${duplicateDir}'.`);
        summary.push({ slug, name: candidate.title, status: 'skipped', reason: `Template already exists locally under '${duplicateDir}'` });
        continue;
      }
    }

    console.log(`\n--------------------------------------------------`);
    console.log(`[${processedCount}/${candidates.length}] Processing candidate: "${candidate.title}" -> '${slug}'`);

    try {
      // Fetch Image Buffer
      const imageBuffer = await fetchImageBuffer(candidate.imageUrl);
      const canvasImg = await loadImage(imageBuffer);
      const width = canvasImg.width;
      const height = canvasImg.height;

      // Filter Check (Deduplication & Blank Template Verification)
      console.log(`  🔍 Running blank-template inspection...`);
      const inspection = await inspectCandidate(candidate, imageBuffer, genAI);

      if (!inspection.passedFilter) {
        console.log(`  ⏭️ Skipped: ${inspection.reason}`);
        summary.push({ slug, name: candidate.title, status: 'skipped', reason: inspection.reason });
        continue;
      }

      console.log(`  ✓ Image inspected (${width}x${height}px) - Blank template verified.`);

      if (options.dryRun) {
        console.log(`  🧪 [Dry Run] Would annotate and save template '${slug}'.`);
        summary.push({ slug, name: candidate.title, status: 'added', reason: 'Dry run simulated' });
        addedCount++;
        continue;
      }

      // Auto-Annotation via Gemini Vision
      console.log(`  🤖 Running Gemini Vision auto-annotation for text areas...`);
      const config = await annotateCandidate(candidate, imageBuffer, genAI, width, height);

      // Save Files
      const templateDir = path.join(process.cwd(), 'public', 'templates', slug);
      fs.mkdirSync(templateDir, { recursive: true });

      const imagePath = path.join(templateDir, 'image.jpg');
      fs.writeFileSync(imagePath, imageBuffer);

      const configPath = path.join(templateDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Render Preview
      console.log(`  🎨 Rendering preview image...`);
      const qa = await verifyCandidateQA(config, genAI);

      console.log(`  ✨ Render Completed (Score ${qa.score}/100): ${qa.feedback}`);
      console.log(`  🎉 Successfully created public/templates/${slug}/!`);

      addedCount++;
      addedSlugs.push(slug);
      summary.push({ slug, name: candidate.title, status: 'added' });

      // Run refine-template.js immediately after ingest is done for this meme
      console.log(`  🔧 Running auto-refinement for '${slug}'...`);
      try {
        execSync(`node scripts/refine-template.js ${slug} --no-git`, { stdio: 'inherit' });
        console.log(`  ✓ Auto-refinement completed for '${slug}'.`);
      } catch (err: any) {
        console.warn(`  ⚠️ Refinement failed for '${slug}': ${err?.message || err}`);
      }

    } catch (err: any) {
      console.error(`  ❌ Error processing '${slug}':`, err?.message || err);
      summary.push({ slug, name: candidate.title, status: 'failed', reason: err?.message || String(err) });
    }
  }

  // Sync Registry if any new templates were added
  if (addedCount > 0 && !options.dryRun) {
    console.log(`\n🔄 Syncing template registry enum (src/types/templates.ts)...`);
    try {
      execSync('node scripts/sync-template-registry.js', { stdio: 'inherit' });
      console.log(`✓ Registry sync completed.`);
    } catch (err: any) {
      console.error(`Failed to sync registry:`, err?.message || err);
    }
  }

  console.log(`\n================ SUMMARY ================`);
  console.log(`Templates Processed: ${processedCount}`);
  console.log(`New Templates Added: ${addedCount}`);
  summary.forEach((item) => {
    console.log(` - [${item.status.toUpperCase()}] ${item.slug} (${item.name}) ${item.reason ? `-> ${item.reason}` : ''}`);
  });
  console.log(`=========================================\n`);
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
