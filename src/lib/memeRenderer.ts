import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { MemeTemplate } from '@/types';

// Register global fonts for serverless environments (e.g., Vercel / Linux containers)
try {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  const impactPath = path.join(fontsDir, 'Impact.ttf');
  const arialPath = path.join(fontsDir, 'Arial.ttf');
  const arialBoldPath = path.join(fontsDir, 'Arial Bold.ttf');

  if (fs.existsSync(impactPath)) {
    GlobalFonts.registerFromPath(impactPath, 'Impact');
  }
  if (fs.existsSync(arialPath)) {
    GlobalFonts.registerFromPath(arialPath, 'Arial');
  }
  if (fs.existsSync(arialBoldPath)) {
    GlobalFonts.registerFromPath(arialBoldPath, 'Arial Bold');
  }
} catch (e) {
  console.warn('Failed to register global fonts:', e);
}

// Simple text wrapping helper for Canvas
export function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number, hasStroke: boolean) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      const trimmed = line.trim();
      if (hasStroke) ctx.strokeText(trimmed, x, currentY);
      ctx.fillText(trimmed, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  const trimmedFinal = line.trim();
  if (hasStroke) ctx.strokeText(trimmedFinal, x, currentY);
  ctx.fillText(trimmedFinal, x, currentY);
}

export async function renderMeme(template: MemeTemplate, textPayloads: Record<string, string>): Promise<Buffer> {
  const imagePath = path.join(process.cwd(), 'public', 'templates', template.id, 'image.jpg');
  
  let image;
  try {
    image = await loadImage(imagePath);
  } catch(e) {
    const dummyCanvas = createCanvas(template.image_width || 1200, template.image_height || 1200);
    const dctx = dummyCanvas.getContext('2d');
    dctx.fillStyle = '#cccccc';
    dctx.fillRect(0, 0, dummyCanvas.width, dummyCanvas.height);
    dctx.fillStyle = '#000000';
    dctx.font = '40px Arial';
    dctx.fillText('Placeholder Image for: ' + template.id, 100, 100);
    template.text_areas.forEach(area => {
      dctx.strokeStyle = 'red';
      dctx.lineWidth = 4;
      dctx.strokeRect(area.x, area.y, area.width, area.height);
    });
    image = await loadImage(dummyCanvas.toBuffer('image/png'));
  }

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(image, 0, 0, image.width, image.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  template.text_areas.forEach(area => {
    // 1. Try exact match
    let text = textPayloads[area.id];
    
    // 2. Try case-insensitive match
    if (!text && textPayloads) {
      const lowerId = area.id.toLowerCase();
      const matchedKey = Object.keys(textPayloads).find(k => k.toLowerCase() === lowerId);
      if (matchedKey) text = textPayloads[matchedKey];
    }

    // 3. Example fallback if LLM omitted text for this area
    if (!text && template.example && template.example[area.id]) {
      text = template.example[area.id];
    }

    text = text || "";
    if (area.uppercase) text = text.toUpperCase();
    
    const fontFamily = area.fontFamily || 'Impact';
    const fontWeight = area.fontWeight || 'normal';
    ctx.font = `${fontWeight} ${area.fontSize}px ${fontFamily}`;
    ctx.fillStyle = area.color || 'white';
    
    const strokeColor = (area.stroke && area.stroke !== 'none') ? area.stroke : 'black';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(area.fontSize / 10, 2);
    const hasStroke = true;

    ctx.textAlign = area.textAlign || 'center';
    ctx.textBaseline = 'middle';

    let anchorX = area.x + (area.width / 2);
    if (ctx.textAlign === 'left') anchorX = area.x;
    if (ctx.textAlign === 'right') anchorX = area.x + area.width;

    const anchorY = area.y + (area.height / 2);
    wrapText(ctx, text, anchorX, anchorY, area.width, area.fontSize * 1.2, hasStroke);
  });

  return canvas.toBuffer('image/png');
}