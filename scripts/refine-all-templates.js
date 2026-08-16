const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

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

  const CONCURRENCY = 15; // Number of templates to process simultaneously

  async function processTemplate(templateId, index, total) {
    console.log(`📦 [${index + 1}/${total}] Started refining template: ${templateId}`);
    try {
      // Execute with --no-git so git branches and PRs aren't created in the loop.
      // This is extremely safe and prevents the branch/git conflicts that cause crashes.
      await execAsync(`node scripts/refine-template.js "${templateId}" --no-git`);
      successful.push(templateId);
      console.log(`✅ Successfully refined template locally: ${templateId}`);
    } catch (error) {
      console.error(`❌ Failed to refine template: ${templateId}\n${error.stdout || ''}\n${error.stderr || error.message}`);
      failed.push({ id: templateId, error: error.message || error });
    }
  }

  for (let i = 0; i < folders.length; i += CONCURRENCY) {
    const batch = folders.slice(i, i + CONCURRENCY);
    console.log(`\n🔄 Processing batch ${Math.floor(i / CONCURRENCY) + 1} of ${Math.ceil(folders.length / CONCURRENCY)} (size: ${batch.length})`);
    
    const promises = batch.map((templateId, batchIndex) => {
      return processTemplate(templateId, i + batchIndex, folders.length);
    });
    
    await Promise.all(promises);
    
    // Add a delay between batches to stay within API rate limits
    if (i + CONCURRENCY < folders.length) {
      console.log('⏳ Waiting 2s before next batch...');
      await delay(2000);
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

  try {
    const { execSync } = require('child_process');
    console.log('\n🔄 Running template registry sync...');
    execSync('node scripts/sync-template-registry.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Failed to sync template registry:', err.message);
  }
}

run().catch(console.error);
