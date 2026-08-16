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
}

export interface MemeTemplate {
  id: string;
  name: string;
  visual_description: string; // What does the image physically show?
  usage_context: string; // When is this meme appropriate?
  keywords: string[]; // Search tags
  example: Record<string, string>; // An example payload to help the LLM
  filename: string;
  text_areas: TextArea[];
}

export interface GenerateMemeRequest {
  context: string;
  conversation: string;
}

export interface LLMResponse {
  selected_template_id: string;
  text_payloads: Record<string, string>;
}
