# Meme Template Guide

This guide explains the schema we use to add new meme templates to the generator. By giving the LLM rich metadata, we guarantee that the AI will understand the nuance of the meme and generate highly relevant text.

## 1. Directory Structure

Each meme template lives in its own dedicated folder inside `public/templates/`. The name of the folder is the unique ID for the meme. Inside the folder, there must be two files:
- `config.json`: The metadata for the meme template.
- `image.jpg`: The blank base image of the meme template.

```text
public/
  templates/
    drake/
      config.json
      image.jpg
    distracted_boyfriend/
      config.json
      image.jpg
    two_buttons/
      config.json
      image.jpg
```

## 2. The Configuration Schema (`config.json`)

The `config.json` inside a template folder must adhere to the following structure:

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
    "right_button": "Fix one more bug"
  },
  "text_areas": [
    {
      "id": "left_button",
      "description": "The first difficult choice",
      "x": 60,
      "y": 90,
      "width": 200,
      "height": 100,
      "fontSize": 24,
      "color": "black",
      "maxLength": 40,
      "uppercase": true,
      "textAlign": "center",
      "fontFamily": "Impact"
    },
    {
      "id": "right_button",
      "description": "The second difficult choice",
      "x": 300,
      "y": 60,
      "width": 200,
      "height": 100,
      "fontSize": 24,
      "color": "black",
      "maxLength": 40,
      "uppercase": true,
      "textAlign": "center",
      "fontFamily": "Impact"
    }
  ]
}
```

### Text Area Properties:
- `id`: A unique programmatic ID for this specific text box.
- `description`: **Critical** Tells the LLM exactly what type of joke or phrase belongs here.
- `x`, `y`, `width`, `height`: The bounding box coordinates (measured from top-left of the image).
- `fontSize`, `color`: Text styling (e.g., `48`, `"white"`).
- `stroke`: Optional outline color (e.g., `"black"` for classic memes).
- `maxLength`: Soft character limit to guide the LLM's response length.
- `uppercase`: Set to `true` to force text into ALL CAPS.
- `textAlign`: `'left'`, `'center'`, or `'right'`.
- `fontFamily`: Defaults to `'Arial'`. Use `'Impact'` for classic internet memes.

## 3. How to find the Coordinates (`x, y, width, height`)

To map out a new template, you need to define the "bounding boxes" where text is allowed to be drawn. 

1. **Open your image in a tool:** You can use Figma, Photoshop, Photopea, or even MacOS Preview.
2. **Draw a rectangle:** Draw a rectangle exactly where you want the text to sit.
3. **Write down the values:**
   - `x`: Distance from the left edge of the image to the left edge of your rectangle.
   - `y`: Distance from the top edge of the image to the top edge of your rectangle.
   - `width`: Width of the rectangle.
   - `height`: Height of the rectangle.

The system will automatically align the text and wrap words that exceed the `width` inside this box.

## 4. Adding a new Meme (Step-by-Step)

1. **Create the Folder:**
   - Create a new directory under `public/templates/` (e.g., `public/templates/my_new_meme`).
   
2. **Add the Image:**
   - Find a high-quality, blank version of the meme template.
   - Save it EXACTLY as `image.jpg` into your new folder (`public/templates/my_new_meme/image.jpg`).
   
3. **Add the Config:**
   - Create a file named `config.json` next to the image (`public/templates/my_new_meme/config.json`).
   - Define the dimensions (`image_width`, `image_height`), the LLM instructions, and the `text_areas` bounding boxes.

4. **Test it!** Run the app (`npm run dev`) and supply a chat context that matches your new template to see the LLM select it automatically!
