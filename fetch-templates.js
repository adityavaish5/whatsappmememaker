const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');

async function downloadImage(url, dest) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(dest, buffer);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  const url = 'https://curiositycurve.blogspot.com/p/indian-meme-templates.html';
  console.log(`Fetching ${url}...`);
  const response = await fetch(url);
  const html = await response.text();
  
  const $ = cheerio.load(html);
  const templates = [];
  
  $('a[href] > img[alt]').each((i, el) => {
    const imgUrl = $(el).parent().attr('href');
    let name = $(el).attr('alt').trim();
    if (name && imgUrl && imgUrl.match(/\.(jpeg|jpg|png|webp|gif)/i)) {
      templates.push({ name, imgUrl });
    }
  });

  console.log(`Found ${templates.length} templates. Processing first 5...`);
  
  for (let i = 0; i < Math.min(5, templates.length); i++) {
    const { name, imgUrl } = templates[i];
    const slug = slugify(name);
    if (!slug) continue;
    
    console.log(`Processing: ${name} -> ${slug}`);
    
    const dir = path.join(process.cwd(), 'public', 'templates', slug);
    await fs.mkdir(dir, { recursive: true });
    
    const imagePath = path.join(dir, 'image.jpg');
    try {
      await downloadImage(imgUrl, imagePath);
      console.log(`  Downloaded image to ${imagePath}`);
    } catch (e) {
      console.error(`  Failed to download image: ${e.message}`);
      continue;
    }
    
    const config = {
      "id": slug,
      "name": name,
      "visual_description": `Indian meme template for ${name}`,
      "usage_context": `Use when appropriate based on ${name}`,
      "keywords": ["indian meme"],
      "sentiment": "neutral",
      "image_width": 800,
      "image_height": 600,
      "example": { "text": "Example text" },
      "text_areas": [
        {
          "id": "text",
          "description": "Main text area",
          "x": 50, "y": 50, "width": 700, "height": 200,
          "fontSize": 48, "color": "white", "stroke": "black", "uppercase": true, "textAlign": "center"
        }
      ]
    };
    
    const configPath = path.join(dir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`  Created config.json for ${slug}`);
  }
  
  console.log('Done!');
}

main().catch(console.error);
