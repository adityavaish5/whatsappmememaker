const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run() {
  const templatesDir = path.join(process.cwd(), 'public', 'templates');

  if (!fs.existsSync(templatesDir)) {
    console.error(`Error: Templates directory not found at ${templatesDir}`);
    process.exit(1);
  }

  const folders = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Checking ${folders.length} templates for font sizes < 48px...`);

  let updatedCount = 0;
  const updatedTemplates = [];

  for (const folder of folders) {
    const configPath = path.join(templatesDir, folder, 'config.json');
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      let wasUpdated = false;

      if (config.text_areas && Array.isArray(config.text_areas)) {
        config.text_areas.forEach(ta => {
          if (typeof ta.fontSize === 'number' && ta.fontSize < 48) {
            console.log(`[${folder}] Enforcing min fontSize 48px (was ${ta.fontSize}px) for text area "${ta.id}"`);
            ta.fontSize = 48;
            wasUpdated = true;
          }
        });
      }

      if (wasUpdated) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        updatedTemplates.push(folder);
        updatedCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${folder}:`, error.message);
    }
  }

  console.log(`\n✅ Completed checking templates!`);
  console.log(`Updated ${updatedCount} templates to have a minimum font size of 48px.`);

  if (updatedTemplates.length > 0) {
    console.log(`\n🎨 Re-rendering updated templates to update test-output/...`);
    for (const templateId of updatedTemplates) {
      try {
        console.log(`Rendering updated test image for ${templateId}...`);
        execSync(`npx ts-node -O '{"module":"commonjs"}' scripts/render-single.ts "${templateId}"`, { stdio: 'inherit' });
      } catch (err) {
        console.error(`❌ Failed to render test output for ${templateId}:`, err.message);
      }
    }
  }
}

run();
