const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const templatesDir = path.join(process.cwd(), 'public', 'templates');
  const folders = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`🚀 Found ${folders.length} templates to refine...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < folders.length; i++) {
    const templateId = folders[i];
    console.log(`==================================================`);
    console.log(`[${i + 1}/${folders.length}] Processing template: ${templateId}`);
    console.log(`==================================================`);

    try {
      execSync(`node scripts/refine-template.js "${templateId}"`, { stdio: 'inherit' });
      successCount++;
    } catch (e) {
      console.error(`⚠️ Failed processing template "${templateId}":`, e.message);
      failCount++;
    }

    // Small delay between calls to avoid hitting rate limits on Gemini API or GitHub API
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n🎉 Batch refinement complete!`);
  console.log(`Success: ${successCount} PRs created / updated.`);
  console.log(`Failed: ${failCount}`);
}

main().catch(console.error);
