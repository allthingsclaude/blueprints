---
description: Extract UI interaction specs from video mockups
argument-hint: <video-file-path> [optional: additional context]
author: "@markoradak"
---

# Video Storyboard Analysis

I'll extract key frames from your video mockup and produce a structured interaction spec.

## Video to Analyze

$ARGUMENTS

## Current Context

**Working Directory**: !`pwd`

**ffmpeg available**: !`which ffmpeg 2>/dev/null || echo "NOT FOUND"`

---

## What Happens

This command extracts key frames from a screen recording or prototype demo by sampling evenly across the whole video with ffmpeg (up to 30 frames), then analyzes each frame sequentially to identify UI states, user actions, and transitions. The output is a structured `INTERACTION_SPEC_{NAME}.md` you can turn into a plan with `/blueprint`, then build with `/implement` or `/autopilot`.

### Pipeline

1. Validate ffmpeg is installed and video file exists
2. Extract key frames evenly across the whole video (up to 30 frames, at most 10 per second)
3. Read and analyze each frame to identify UI elements, states, and layout
4. Compare consecutive frames to detect transitions and user actions
5. Write structured interaction spec to `{{SESSIONS_DIR}}/`

### Output

A `INTERACTION_SPEC_{NAME}.md` file in `{{SESSIONS_DIR}}/` containing:
- All detected UI states with element descriptions
- Transitions between states with user actions and animation notes
- Implementation checklist ready to turn into a plan with `/blueprint`

---

Use the `Agent` tool to launch the storyboard agent (subagent_type="storyboard") with the video file path and any additional context from arguments. The agent needs the full path to the video file to process it.
