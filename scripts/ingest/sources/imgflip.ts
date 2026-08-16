import { MemeCandidate } from '../types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function fetchImgflipCandidates(limit: number = 20): Promise<MemeCandidate[]> {
  const candidates: MemeCandidate[] = [];

  try {
    const response = await fetch('https://api.imgflip.com/get_memes');
    if (!response.ok) {
      console.warn(`[Imgflip] HTTP error ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.data?.memes)) {
      console.warn('[Imgflip] Invalid API response format');
      return [];
    }

    const memes = data.data.memes;
    for (const meme of memes.slice(0, limit)) {
      const name = meme.name?.trim();
      const imageUrl = meme.url;

      if (!name || !imageUrl) continue;

      const slug = slugify(name);
      if (!slug || slug.length < 3) continue;

      candidates.push({
        title: name,
        imageUrl,
        sourceUrl: `https://imgflip.com/meme/${meme.id}`,
        source: 'imgflip',
        region: 'global',
        suggestedSlug: slug,
      });
    }
  } catch (error: any) {
    console.warn('[Imgflip] Error fetching memes:', error?.message || error);
  }

  return candidates;
}
