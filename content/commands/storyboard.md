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

This command extracts key frames from a screen recording or prototype demo using ffmpeg's scene-change detection, then analyzes each frame sequentially to identify UI states, user actions, and transitions. The output is a structured `INTERACTION_SPEC_{NAME}.md` that can be fed directly into `/implement`.

### Pipeline

1. Validate ffmpeg is installed and video file exists
2. Extract key frames using scene-change detection (captures actual UI state changes)
3. Read and analyze each frame to identify UI elements, states, and layout
4. Compare consecutive frames to detect transitions and user actions
5. Write structured interaction spec to `plans/`

### Output

A `INTERACTION_SPEC_{NAME}.md` file in `plans/` containing:
- All detected UI states with element descriptions
- Transitions between states with user actions and animation notes
- Implementation checklist ready for `/implement`

---

Use the Task tool to launch the storyboard agent (subagent_type="storyboard") with the video file path and any additional context from arguments. The agent needs the full path to the video file to process it.
