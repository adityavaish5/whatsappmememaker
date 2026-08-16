export interface TextArea {
  id: string;
  description: string; // Tells the LLM what kind of text belongs in this box
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  stroke?: string;
  maxLength?: number; // Soft limit for LLM generation
  uppercase?: boolean; // If true, force uppercase rendering
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
}

export interface MemeTemplate {
  id: string;
  name: string;
  visual_description: string; // What does the image physically show?
  usage_context: string; // When is this meme appropriate?
  keywords: string[]; // Search tags
  sentiment?: 'positive' | 'negative' | 'neutral' | 'sarcastic' | 'comparison' | 'custom';
  image_width: number;
  image_height: number;
  example: Record<string, string>; // An example payload to help the LLM
  filename: string;
  text_areas: TextArea[];
}

export interface GenerateMemeRequest {
  context: string;
  conversation: string;
}

export interface MemeGenerationResult {
  selected_template_id: string;
  text_payloads: Record<string, string>;
}

export interface LLMResponse {
  memes: MemeGenerationResult[];
}
