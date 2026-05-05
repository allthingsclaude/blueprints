---
description: Generate images using Nano Banana 2 (Gemini/fal.ai)
argument-hint: <what you want to see> [optional: path/to/reference.png]
author: "@markoradak"
---

# Image Generation

$ARGUMENTS

## API Keys (agent will check GEMINI_API_KEY and FAL_KEY availability at runtime)

---

## Instructions

1. **API key check.** If no API key is available, stop and tell the user to set `GEMINI_API_KEY` or `FAL_KEY`.

2. **Determine `model`** — one of `nano-banana-2`, `gpt-image-2`, or `both`. Resolve in this order; first match wins:
   1. **Explicit flag** in `$ARGUMENTS`: `--model=nano-banana-2`, `--model=gpt-image-2`, or `--model=both`. Strip the flag from the prompt.
   2. **Prefix**: `nano:`, `gpt:`, or `both:` at the start. Strip it.
   3. **Natural language mention**: phrases like "with gpt-image-2", "use gpt image", "using gpt", "with nano banana", "using nano", "with both models", "compare both", "render with both". Map to the right model and remove the directive cleanly from the prompt.
   4. **Auto-heuristic** — only if none of the above matched. Bias conservatively toward `nano-banana-2` since gpt-image-2 is materially more expensive on fal:
      - **Strong text-rendering signals** → `gpt-image-2`. Only triggers when the user clearly wants legible text rendered: quoted strings the prompt asks to render (`"..."`, `'...'` paired with verbs like "that says", "with the words", "reading", "labeled"), or explicit "render this text", "billboard that reads", "sign that says", "headline:", "caption:", "infographic with text". Soft typography hints alone ("logo", "poster", "book cover", "magazine cover") do **not** trigger gpt — those go to nano.
      - **Otherwise** → `nano-banana-2` (default — covers people, scenes, products, soft typography, and ambiguous cases).

3. **Determine `api`** based on `model`:
   - `gpt-image-2` or `both` → `fal` (requires `FAL_KEY`; if missing, stop and tell the user).
   - `nano-banana-2` → `gemini` if `GEMINI_API_KEY` is available, else `fal`.

4. **Mode**: if the user included any image file paths, `mode` is `edit`. Otherwise `generate`.

5. **Determine `aspect_ratio` and `resolution`** (used by nano-banana-2; mapped to `image_size` preset by the agent for gpt-image-2):
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

6. Enhance the user's description into a detailed prompt (~100 words max). Add lighting, composition, camera angle, style, mood — stay faithful to the original request. Do NOT strip out text the user wants rendered in the image (quoted strings, headlines, etc.) — preserve it verbatim.

7. Derive a short snake_case name (e.g., `mountain_cabin`).

8. Launch the imagine agent via Task tool with `subagent_type="imagine"` passing:
   - `prompt`: the enhanced prompt text
   - `model`: `nano-banana-2`, `gpt-image-2`, or `both`
   - `api`: `gemini` or `fal`
   - `mode`: `generate` or `edit`
   - `name`: the snake_case name
   - `aspect_ratio`: e.g., `16:9`
   - `resolution`: e.g., `2K`
   - `reference_images`: list of absolute file paths (if edit mode)

9. After the agent returns, display the output(s) inline with the Read tool:
   - `model=nano-banana-2` or `gpt-image-2` → `generated/imagine_{name}.png`
   - `model=both` → `generated/imagine_{name}_nano.png` AND `generated/imagine_{name}_gpt.png`
   Show the path(s).
