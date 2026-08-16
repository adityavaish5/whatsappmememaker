# WhatsApp Meme Maker - Design Document

## 1. Overview
The WhatsApp Meme Maker is an AI-powered web application that turns boring chat conversations into highly contextual memes. Users paste their chat history, and the system uses a Large Language Model (Google Gemini) to analyze the context, select appropriate meme templates from a predefined catalog, generate punchy text, and render the final meme images on the server using HTML5 Canvas.

## 2. System Architecture

The application is built as a single monolithic repository using **Next.js (React + API Routes)**.

```mermaid
flowchart TD
    User([User]) -->|Inputs Chat History| UI[Frontend UI (React)]
    UI -->|POST /api/generate| API[Next.js API Route]
    
    subgraph Server [Backend Backend Environment]
        API -->|Fetch Catalog| Registry[(registry.json)]
        API -->|System Prompt + Chat| LLM[Google Gemini API]
        LLM -->|Returns array of Template IDs & Text| API
        API -->|Load Images & Draw Text| Canvas[Node Canvas Engine]
    end
    
    Canvas -->|Returns Base64 Images| API
    API -->|200 OK (JSON with Base64)| UI
    UI -->|Displays Meme Gallery| User
```

### 2.1 Frontend (Client)
- **Framework:** Next.js 16.3 (App Router) + React
- **Styling:** Tailwind CSS + Lucide Icons
- **Functionality:** 
  - Two primary text areas for "Context" and "Conversation".
  - Submits data to the backend and displays a loading state.
  - Receives an array of generated memes and renders them in a scrollable gallery.
  - Provides instant "Download" functionality for each generated image.

### 2.2 Backend (Server)
- **Framework:** Next.js API Routes (Serverless Functions)
- **AI SDK:** Vercel AI SDK (`@ai-sdk/google`, `ai`)
- **Image Processing:** `canvas` (Node.js Cairo wrapper)
- **Functionality:**
  1. Validates the incoming context.
  2. Constructs a strict system prompt containing the metadata of all available templates.
  3. Uses `generateText` with strict JSON-parsing instructions to safely bypass SDK schema bugs, enforcing the LLM to choose only valid template IDs.
  4. Parses the LLM's JSON response, which contains up to 5 meme configurations.
  5. Uses Node Canvas to load the base `.jpg` templates.
  6. Applies rendering modifiers (`textAlign`, `uppercase`, `fontFamily`, `color`) and automatically wraps the LLM's text to fit exactly inside the bounding boxes defined in `registry.json`.
  7. Converts the final canvases into Base64 strings and returns them to the frontend.

## 3. Data Models

### Template Registry (`registry.json`)
The application is entirely data-driven. The backend knows nothing about specific memes; it relies completely on the metadata provided in the registry.

```typescript
export interface TextArea {
  id: string; // Unique programmatic ID (e.g., "top_right")
  description: string; // Instructions for the LLM on what belongs here
  x: number; y: number; width: number; height: number; // Bounding box
  fontSize: number; color: string; stroke?: string;
  uppercase?: boolean; textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
}

export interface MemeTemplate {
  id: string; 
  name: string; 
  visual_description: string; // What the image shows
  usage_context: string; // When the AI should pick it
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'sarcastic' | 'comparison' | 'custom';
  image_width: number; image_height: number;
  filename: string; // Base image file
  text_areas: TextArea[];
}
```

### LLM Output Schema
The AI is strictly constrained to output the following JSON format:
```json
{
  "memes": [
    {
      "selected_template_id": "drake",
      "text_payloads": {
        "top_right": "Using regular chat",
        "bottom_right": "Using AI memes"
      }
    }
  ]
}
```

## 4. Current Limitations & Future Improvements
1. **Node Canvas Deployment:** `canvas` relies on native system libraries (Cairo). When deploying to environments like Vercel, it requires specific pre-built binaries. A future improvement could be swapping `canvas` for `@vercel/og` (Satori) or `jimp` to ensure smoother edge deployments.
2. **Template Library Size:** The context window grows as more templates are added to `registry.json`. If the library exceeds 50-100 templates, we may need to implement a pre-filtering mechanism (e.g., Vector Search / RAG) to only send the top 10 most relevant templates to the LLM's context window.
3. **Sharing:** Implement the native Web Share API to allow mobile users to share the Base64 image directly to the WhatsApp app.