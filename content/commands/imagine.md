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

4. Enhance the user's description into a detailed prompt (~100 words max). Add lighting, composition, camera angle, style, mood — stay faithful to the original request.

5. Derive a short snake_case name (e.g., `mountain_cabin`).

6. Launch the imagine agent via Task tool with `subagent_type="imagine"` passing:
   - `prompt`: the enhanced prompt text
   - `api`: "gemini" or "fal"
   - `mode`: "generate" or "edit"
   - `name`: the snake_case name
   - `reference_images`: list of absolute file paths (if edit mode)

7. After the agent returns, use the Read tool to display `generated/imagine_{name}.png` inline. Show the path.
