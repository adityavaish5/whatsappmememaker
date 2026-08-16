const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const templateId = process.argv[2];

if (!templateId) {
  console.error("Please provide a template ID. Usage: node scripts/refine-template.js <template_id>");
  process.exit(1);
}

const templateDir = path.join(process.cwd(), 'public', 'templates', templateId);
const configPath = path.join(templateDir, 'config.json');
const imagePath = path.join(templateDir, 'image.jpg');

if (!fs.existsSync(configPath) || !fs.existsSync(imagePath)) {
  console.error(`Error: Could not find template files in ${templateDir}`);
  process.exit(1);
}

const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Gemini Vision
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not set in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  console.log(`\n🔍 Analyzing template: ${templateId}...`);

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: 'image/jpeg'
    }
  };

  const systemPrompt = `You are an expert meme curator and graphic designer specializing in Indian pop culture and internet memes.

Analyze the attached image and the current config metadata. Your goal is to improve two key aspects:

1. **Context & Metadata**:
   - Accurately identify the character, actor, movie, scene, or real-life event depicted in the image.
   - Refine 'name', 'visual_description' (what is physically in the picture), 'usage_context' (when and why someone would use this meme in conversation), 'keywords', and 'sentiment'.
   - Update 'example' to show a realistic, funny example payload.

2. **Text Area Bounding Boxes & Positioning**:
   - Determine the actual pixel width and height of the image.
   - Position the 'text_areas' bounding boxes (x, y, width, height) so the text sits cleanly in empty space or designated caption areas WITHOUT covering essential faces, expressions, or key visual elements.
   - Configure appropriate 'fontSize' (MUST be at least 48px for legibility, larger if space permits), 'color' (usually "white" with "black" stroke, or "black"), 'stroke', 'uppercase', 'textAlign', and 'fontFamily'.

Current Config:
${JSON.stringify(currentConfig, null, 2)}

CRITICAL: Return ONLY a raw valid JSON object for config.json matching this exact schema (no markdown, no backticks, no code blocks):
{
  "id": "${templateId}",
  "name": "string",
  "visual_description": "string",
  "usage_context": "string",
  "keywords": ["string"],
  "sentiment": "positive|negative|neutral|sarcastic|comparison|custom",
  "image_width": number,
  "image_height": number,
  "example": { "text_area_id": "example text" },
  "text_areas": [
    {
      "id": "string",
      "description": "string describing what belongs here",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "fontSize": number,
      "color": "string",
      "stroke": "string",
      "maxLength": number,
      "uppercase": boolean,
      "textAlign": "left|center|right",
      "fontFamily": "string"
    }
  ]
}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

  try {
    // Git & PR Creation Workflow - MUST checkout branch BEFORE modifying files!
    const branchName = `template-improve/${templateId}`;
    console.log(`\n🌿 Creating git branch: ${branchName}...`);

    try {
      execSync(`git checkout main`, { stdio: 'pipe' });
      execSync(`git pull origin main`, { stdio: 'pipe' });
    } catch (e) {}

    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'pipe' });
    } catch (e) {
      execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
      // Ensure we have the latest master/main files (like scripts/render-single.ts) in the branch
      try {
        execSync(`git merge main --no-edit`, { stdio: 'pipe' });
      } catch (err) {}
    }

    const result = await model.generateContent([
      systemPrompt,
      imagePart
    ]);

    let responseText = result.response.text().trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const updatedConfig = JSON.parse(responseText);

    // Enforce minimum font size of 48px
    if (updatedConfig.text_areas && Array.isArray(updatedConfig.text_areas)) {
      updatedConfig.text_areas.forEach(ta => {
        if (typeof ta.fontSize === 'number' && ta.fontSize < 48) {
          console.log(`⚠️ Enforcing min fontSize 48px (was ${ta.fontSize}px) for text area "${ta.id}"`);
          ta.fontSize = 48;
        }
      });
    }

    // Save updated config.json
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    console.log(`✅ Updated public/templates/${templateId}/config.json`);

    // Run test renderer for ONLY this template to generate updated test output image
    console.log(`🎨 Rendering updated test image for ${templateId}...`);
    execSync(`npx ts-node -O '{"module":"commonjs"}' scripts/render-single.ts "${templateId}"`, { stdio: 'inherit' });

    // Stage only this template's config.json and its test output image
    // Using -f to force add the test image because test-output is in .gitignore
    execSync(`git add public/templates/${templateId}/config.json test-output/${templateId}.png -f`, { stdio: 'pipe' });

    // Commit
    const commitMsg = `refactor(template): improve metadata and bounding boxes for ${updatedConfig.name || templateId}`;
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });

    // Push branch
    console.log(`🚀 Pushing branch ${branchName} to GitHub...`);
    execSync(`git push -u origin ${branchName} --force`, { stdio: 'inherit' });

    // Create GitHub PR
    console.log(`📝 Creating Pull Request on GitHub...`);
    const prTitle = `refine(template): ${updatedConfig.name || templateId}`;
    const prBody = `## Template Refinement: ${updatedConfig.name || templateId}

### Improvements Made:
1. **Context & Metadata**: Refined visual description, usage context, and keywords after multimodal image analysis.
2. **Bounding Boxes & Positioning**: Adjusted text area coordinates (x, y, width, height) to sit cleanly on the image without obscuring key visual elements.

### Updated Template Sample:
Check test-output/${templateId}.png for the newly rendered sample.`;

    // Check if PR already exists to avoid throwing an error
    let prOutput = '';
    try {
      const prCheck = execSync(`gh pr list --head "${branchName}" --json url`, { stdio: 'pipe' }).toString().trim();
      const prs = JSON.parse(prCheck);
      if (prs && prs.length > 0) {
        prOutput = prs[0].url;
        console.log(`\n🔄 Pull Request already exists: ${prOutput}`);
        // Optionally edit/update the PR body if needed, or just push changes which updates the PR automatically
      } else {
        const prCommand = `gh pr create --title "${prTitle}" --body "${prBody}" --head "${branchName}" --base main`;
        prOutput = execSync(prCommand).toString().trim();
        console.log(`\n🎉 Pull Request created successfully!`);
        console.log(`PR Link: ${prOutput}\n`);
      }
    } catch (e) {
      console.log("Error checking/creating PR (might exist or CLI auth error):", e.message);
    }

    // Switch back to main branch
    execSync(`git checkout main`, { stdio: 'pipe' });

  } catch (err) {
    console.error(`❌ Failed to refine template ${templateId}:`, err);
    try { execSync(`git checkout main`, { stdio: 'pipe' }); } catch(e){}
    process.exit(1);
  }
}

run().catch(console.error);
