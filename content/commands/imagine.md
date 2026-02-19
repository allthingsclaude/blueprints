---
description: Generate images using Nano Banana Pro (Gemini/fal.ai)
argument-hint: <what you want to see> [optional: path/to/reference.png]
author: "@markoradak"
---

# Image Generation

$ARGUMENTS

## API Keys

- GEMINI_API_KEY: !`node -e "console.log(process.env.GEMINI_API_KEY ? 'AVAILABLE' : 'NOT SET')"`
- FAL_KEY: !`node -e "console.log(process.env.FAL_KEY ? 'AVAILABLE' : 'NOT SET')"`

---

## Instructions

1. If no API key is available, stop and tell the user to set `GEMINI_API_KEY` or `FAL_KEY`.

2. Determine `api`: "gemini" if GEMINI_API_KEY is available, "fal" otherwise.

3. Check if the user included any image file paths. If yes, mode is "edit". If no, mode is "generate".

4. Determine `aspect_ratio` and `resolution`:
   - If the user explicitly requests a size or ratio (e.g., "16:9", "square", "4K"), use that.
   - If the user describes where the image will be used, infer the best fit:
     - Hero banner / website header → `16:9`, `2K`
     - Social media post / Instagram → `1:1`, `2K`
     - Story / mobile wallpaper / portrait → `9:16`, `2K`
     - Thumbnail / avatar / icon → `1:1`, `1K`
     - Movie poster / book cover → `2:3`, `2K`
     - Desktop wallpaper → `16:9`, `4K`
     - Print / poster → `3:4`, `4K`
   - Default if nothing is specified or inferable: `1:1`, `1K`
   - Valid aspect ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`
   - Valid resolutions: `1K`, `2K`, `4K`

5. Enhance the user's description into a detailed prompt (~100 words max). Add lighting, composition, camera angle, style, mood — stay faithful to the original request.

6. Derive a short snake_case name (e.g., `mountain_cabin`).

7. Launch the imagine agent via Task tool with `subagent_type="imagine"` passing:
   - `prompt`: the enhanced prompt text
   - `api`: "gemini" or "fal"
   - `mode`: "generate" or "edit"
   - `name`: the snake_case name
   - `aspect_ratio`: e.g., "16:9"
   - `resolution`: e.g., "2K"
   - `reference_images`: list of absolute file paths (if edit mode)

8. After the agent returns, use the Read tool to display `generated/imagine_{name}.png` inline. Show the path.
