# Meme Template Guide

This guide explains the schema we use to add new meme templates to the generator. By giving the LLM rich metadata, we guarantee that the AI will understand the nuance of the meme and generate highly relevant text.

## 1. The Schema (`MemeTemplate` and `TextArea`)

Every template lives inside `public/templates/registry.json` and must adhere to the following schema:

```typescript
export interface TextArea {
  id: string; // A unique programmatic ID for this specific text box (e.g. "top_right")
  description: string; // Critical: Tell the LLM exactly what belongs here (e.g., "The bad/rejected option")
  
  // Coordinates and Size (measured from the top-left of the image)
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Styling
  fontSize: number;
  color: string; // e.g., "black" or "white"
  stroke?: string; // Optional: Outline color (e.g., "black" for classic meme font)
  
  // Constraints & Modifiers
  maxLength?: number; // Optional soft limit to prevent the LLM from writing an essay
  uppercase?: boolean; // If true, forces text to render IN ALL CAPS
  textAlign?: 'left' | 'center' | 'right'; // Defaults to 'center'
  fontFamily?: string; // Defaults to 'Arial'. Use 'Impact' for classic memes.
}

export interface MemeTemplate {
  id: string; // Global unique identifier for the template (e.g., "distracted_boyfriend")
  name: string; // Human readable name
  
  // AI Context Metadata
  visual_description: string; // Detail exactly what is happening in the picture
  usage_context: string; // Explain to the AI *when* it should choose this template
  keywords: string[]; // Search tags
  sentiment?: 'positive' | 'negative' | 'neutral' | 'sarcastic' | 'comparison' | 'custom';
  
  // Dimensions
  image_width: number;
  image_height: number;
  
  // Reference
  example: Record<string, string>; // Keys must match TextArea IDs. Provides a few shot example for the AI.
  
  // File bindings
  filename: string; // Must exactly match the image file in the public/templates folder
  text_areas: TextArea[];
}
```

## 2. How to find the Coordinates (`x, y, width, height`)

To map out a new template, you need to define the "bounding boxes" where text is allowed to be drawn. 

1. **Open your image in a tool:** You can use Figma, Photoshop, Photopea, or even MacOS Preview.
2. **Draw a rectangle:** Draw a rectangle exactly where you want the text to sit.
3. **Write down the values:**
   - `x`: Distance from the left edge of the image to the left edge of your rectangle.
   - `y`: Distance from the top edge of the image to the top edge of your rectangle.
   - `width`: Width of the rectangle.
   - `height`: Height of the rectangle.

The system will automatically center the text (horizontally and vertically) *inside* this bounding box and wrap words that exceed the `width`.

## 3. Adding a new Meme (Step-by-Step)

1. **Download the Image:**
   - Find a high-quality, blank version of the meme template.
   - Save it as a `.jpg` or `.png` into `public/templates/` (e.g., `public/templates/my_meme.jpg`).
   
2. **Measure the text areas:**
   - Find the image's total dimensions (`image_width`, `image_height`).
   - Find the coordinates for each text box as described above.

3. **Add to `registry.json`:**
   - Open `public/templates/registry.json`.
   - Add a new JSON object to the array following the schema.
   - Example addition:
   ```json
   {
     "id": "two_buttons",
     "name": "Two Buttons",
     "visual_description": "A superhero sweating, struggling to choose between two red buttons.",
     "usage_context": "Use when someone is faced with two difficult, contradictory, or equally bad choices.",
     "keywords": ["choice", "sweating", "two buttons", "hard decision"],
     "sentiment": "comparison",
     "image_width": 600,
     "image_height": 908,
     "example": {
       "left_button": "Sleep 8 hours",
       "right_button": "Fix one more bug",
       "guy": "Programmers"
     },
     "filename": "two_buttons.jpg",
     "text_areas": [
       {
         "id": "left_button",
         "description": "The first difficult choice",
         "x": 60, "y": 90, "width": 200, "height": 100,
         "fontSize": 24, "color": "black",
         "uppercase": true, "textAlign": "center"
       },
       {
         "id": "right_button",
         "description": "The second difficult choice",
         "x": 300, "y": 60, "width": 200, "height": 100,
         "fontSize": 24, "color": "black",
         "uppercase": true, "textAlign": "center"
       }
     ]
   }
   ```
4. **Test it!** Run the app and supply a context that matches your new template to see the LLM select it automatically!
