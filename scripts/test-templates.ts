import fs from 'fs';
import path from 'path';
import { renderMeme } from '../src/lib/memeRenderer';
import { MemeTemplate } from '../src/types';

async function runTests() {
  const templatesDir = path.join(process.cwd(), 'public', 'templates');
  const outputDir = path.join(process.cwd(), 'test-output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const folders = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${folders.length} templates. Generating samples...`);

  for (const folder of folders) {
    const configPath = path.join(templatesDir, folder, 'config.json');
    if (fs.existsSync(configPath)) {
      const config: MemeTemplate = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      console.log(`Rendering: ${config.id}...`);
      try {
        const buffer = await renderMeme(config, config.example || {});
        const outputPath = path.join(outputDir, `${config.id}.png`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved sample to test-output/${config.id}.png`);
      } catch (e) {
        console.error(`❌ Failed to render ${config.id}:`, e);
      }
    }
  }
  
  console.log('\nAll tests complete! Check the /test-output folder for the generated samples.');
}

runTests();
