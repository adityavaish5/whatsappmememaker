import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import { MemeTemplate } from '@/types';

// Simple text wrapping helper for Canvas
export function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.strokeText(line, x, currentY);
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.strokeText(line, x, currentY);
  ctx.fillText(line, x, currentY);
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
    let text = textPayloads[area.id] || "";
    if (area.uppercase) text = text.toUpperCase();
    
    const fontFamily = area.fontFamily || 'Arial';
    ctx.font = `bold ${area.fontSize}px ${fontFamily}`;
    ctx.fillStyle = area.color;
    
    if (area.stroke) {
      ctx.strokeStyle = area.stroke;
      ctx.lineWidth = area.fontSize / 10;
    } else {
      ctx.lineWidth = 0;
    }

    ctx.textAlign = area.textAlign || 'center';
    ctx.textBaseline = 'middle';

    let anchorX = area.x + (area.width / 2);
    if (ctx.textAlign === 'left') anchorX = area.x;
    if (ctx.textAlign === 'right') anchorX = area.x + area.width;

    const anchorY = area.y + (area.height / 2);
    wrapText(ctx, text, anchorX, anchorY, area.width, area.fontSize * 1.2);
  });

  return canvas.toBuffer('image/png');
}