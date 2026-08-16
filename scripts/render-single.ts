import fs from 'fs';
import path from 'path';
import { renderMeme } from '../src/lib/memeRenderer';
import { MemeTemplate } from '../src/types';

const templateId = process.argv[2];
if (!templateId) {
  console.error('No templateId provided to render-single.ts');
  process.exit(1);
}

const configPath = path.join(process.cwd(), 'public', 'templates', templateId, 'config.json');
const outputDir = path.join(process.cwd(), 'test-output');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (fs.existsSync(configPath)) {
  const config: MemeTemplate = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  renderMeme(config, config.example || {}).then(buffer => {
    fs.writeFileSync(path.join(outputDir, `${templateId}.png`), buffer);
    console.log(`✅ Saved sample to test-output/${templateId}.png`);
  }).catch(err => {
    console.error(`❌ Failed rendering ${templateId}:`, err);
    process.exit(1);
  });
} else {
  console.error(`Config path not found: ${configPath}`);
  process.exit(1);
}
