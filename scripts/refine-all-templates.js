const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to pause execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  console.log(`ℹ️ Templates will be refined locally using the --no-git flag to prevent branch conflicts.`);

  const successful = [];
  const failed = [];

  for (let i = 0; i < folders.length; i++) {
    const templateId = folders[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`📦 [${i + 1}/${folders.length}] Refining template: ${templateId}`);
    console.log(`--------------------------------------------------`);

    try {
      // Execute with --no-git so git branches and PRs aren't created in the loop.
      // This is extremely safe and prevents the branch/git conflicts that cause crashes.
      execSync(`node scripts/refine-template.js "${templateId}" --no-git`, { stdio: 'inherit' });
      successful.push(templateId);
      console.log(`✅ Successfully refined template locally: ${templateId}`);
    } catch (error) {
      console.error(`❌ Failed to refine template: ${templateId}`);
      failed.push({ id: templateId, error: error.message || error });
    }

    // Add a short 1-second delay between templates to stay within API rate limits
    if (i < folders.length - 1) {
      console.log('⏳ Waiting 1s before next template...');
      await delay(1000);
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
