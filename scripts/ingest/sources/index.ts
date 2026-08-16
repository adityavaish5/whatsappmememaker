import { MemeCandidate, IngestOptions } from '../types';
import { fetchImgflipCandidates } from './imgflip';

export async function fetchCandidates(options: IngestOptions): Promise<MemeCandidate[]> {
  console.log('📡 Fetching candidates from Imgflip API...');
  const limit = options.limit || 5;
  const candidates = await fetchImgflipCandidates(limit);
  console.log(`✓ Fetched ${candidates.length} candidates from Imgflip.`);
  return candidates;
}
