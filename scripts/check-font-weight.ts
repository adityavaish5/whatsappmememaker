import assert from 'node:assert/strict';

const canvasModule = require('@napi-rs/canvas');
const originalCreateCanvas = canvasModule.createCanvas as (...args: any[]) => any;
const observedFonts: string[] = [];

canvasModule.createCanvas = ((...args: any[]) => {
  const canvas = originalCreateCanvas(...args);
  const ctx = canvas.getContext('2d');
  const originalFillText = ctx.fillText.bind(ctx);

  ctx.fillText = (...fillArgs: any[]) => {
    observedFonts.push(ctx.font);
    return originalFillText(...fillArgs);
  };

  return canvas;
}) as typeof canvasModule.createCanvas;

const { renderMeme } = require('../src/lib/memeRenderer');

async function main() {
  const template = {
    id: 'test-template',
    name: 'Test template',
    visual_description: 'A placeholder',
    usage_context: 'A placeholder',
    keywords: ['test'],
    image_width: 300,
    image_height: 200,
    example: {},
    text_areas: [
      {
        id: 'title',
        description: 'Headline text',
        x: 10,
        y: 10,
        width: 280,
        height: 80,
        fontSize: 32,
        color: '#ffffff',
        stroke: '#000000',
        textAlign: 'center',
        fontFamily: 'Impact',
      },
    ],
  };

  await renderMeme(template, { title: 'Hello world' });
  console.log('Observed fonts:', observedFonts);

  assert.ok(
    !observedFonts.some((font) => /bold/i.test(font)),
    'Generated meme text should not be bold by default.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
