const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
  const templatesDir = path.join(process.cwd(), 'public', 'templates');
  
  if (!fs.existsSync(templatesDir)) {
    console.error(`Error: Templates directory not found at ${templatesDir}`);
    process.exit(1);
  }

  // Read all folders in templatesDir
  const folders = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`🚀 Starting refinement for all ${folders.length} templates...`);

  const successful = [];
  const failed = [];

  for (let i = 0; i < folders.length; i++) {
    const templateId = folders[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`📦 [${i + 1}/${folders.length}] Refining template: ${templateId}`);
    console.log(`--------------------------------------------------`);

    try {
      // Execute the refine-template.js script for this template
      // inherit stdio so we see the full log output and any interactive / error messages
      execSync(`node scripts/refine-template.js "${templateId}"`, { stdio: 'inherit' });
      successful.push(templateId);
      console.log(`✅ Successfully refined template: ${templateId}`);
    } catch (error) {
      console.error(`❌ Failed to refine template: ${templateId}`);
      failed.push({ id: templateId, error: error.message || error });
    }
  }

  console.log(`\n==================================================`);
  console.log(`🏁 Refinement Complete!`);
  console.log(`✅ Successfully refined: ${successful.length}/${folders.length}`);
  console.log(`❌ Failed: ${failed.length}/${folders.length}`);
  if (failed.length > 0) {
    console.log(`\nFailed templates:`);
    failed.forEach(f => console.log(`- ${f.id}`));
  }
  console.log(`==================================================`);
}

run().catch(console.error);
