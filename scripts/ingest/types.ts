export interface MemeCandidate {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  source: 'reddit' | 'imgflip' | 'web_scraper';
  region: 'indian' | 'global';
  suggestedSlug?: string;
  author?: string;
}

export interface IngestOptions {
  limit?: number;
  dryRun?: boolean;
  noGit?: boolean;
  minResolution?: number;
  sources?: string[];
}

export interface InspectionResult {
  candidate: MemeCandidate;
  passedFilter: boolean;
  reason?: string;
  perceptualHash?: string;
  dimensions?: { width: number; height: number };
}

export interface CandidateConfig {
  id: string;
  name: string;
  visual_description: string;
  usage_context: string;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'sarcastic' | 'comparison' | 'custom';
  image_width: number;
  image_height: number;
  example: Record<string, string>;
  text_areas: Array<{
    id: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    color: string;
    stroke?: string;
    maxLength?: number;
    uppercase?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    fontFamily?: string;
  }>;
}

export interface QAResult {
  passed: boolean;
  score: number;
  feedback: string;
}
