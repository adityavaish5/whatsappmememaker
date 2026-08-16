import fs from 'fs';
import path from 'path';
import { renderMeme } from '../src/lib/memeRenderer';
import { MemeTemplate } from '../src/types';

async function main() {
  const templateId = process.argv[2];
  if (!templateId) {
    console.error('Please provide a template ID. Usage: npx ts-node scripts/render-single.ts <template_id>');
    process.exit(1);
  }

  const templatesDir = path.join(process.cwd(), 'public', 'templates');
  const outputDir = path.join(process.cwd(), 'test-output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const configPath = path.join(templatesDir, templateId, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`Error: Config file not found for template ${templateId} at ${configPath}`);
    process.exit(1);
  }

  const config: MemeTemplate = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  console.log(`Rendering single template: ${config.id}...`);
  try {
    const buffer = await renderMeme(config, config.example || {});
    const outputPath = path.join(outputDir, `${config.id}.png`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Saved sample to test-output/${config.id}.png`);
  } catch (e) {
    console.error(`❌ Failed to render ${config.id}:`, e);
    process.exit(1);
  }
}

main().catch(console.error);
