# Glance Page

A glance page shows what an agent's reply (or a plan, a decision, a handoff) says, so the reader takes it in by looking instead of reading. It's one self-contained HTML file. `/glance` and the glance hook both follow this guide.

## Content

Keep it short: the page holds less text than its source, not more.
- **Header**: a small eyebrow (project · context), a title that says what this is, one sentence of summary, and three or four status tags (for example "4 fixed · 3,863 tests pass", "1 needs your call").
- **One row per item**, in the source's order. Left: a number and heading, the cause or point in one sentence, then two to four bullets of a few words each. Right: one visual, only if it shows something the words don't. Usually that's before and after side by side, labelled, with what changed outlined.
- **Decisions last**: items that need the reader's decision get three columns (Build, Leave out, Decide), then one line each of reasoning, then the question in one sentence.
- **Footer**: one line for the paths, commands or commits the reader needs.
- Don't add sections, visuals or explanations the source doesn't have, and don't repeat a fact.

## Visuals

- A visual is a drawing, not a sentence in a box. When the source is about this project's interface, draw the part that changed as it appears on screen: a dialog with its title, message and buttons; a sidebar with its rows, icons, badges and avatars; a status bar with its items; a pane with its header and contents. Words inside a mockup are only the interface's own labels.
- Get the look from the project, briefly: search for the exact strings the source mentions (an error message, a label, a setting) to find the views that changed, read those, and find the app's theme colours. At most about eight reads or searches; don't explore beyond that.
- Draw only what you know. Where a mockup needs content the source and the code don't give you (other rows, file names, commit messages, numbers), use neutral placeholder bars instead of made-up text.
- When the source isn't about an interface, use a simple diagram: a short flow, a small table, or a before and after of a file or command.

## Rules

- Keep every fact, number, decision and open question. Don't invent anything.
- Inline CSS only. No scripts, external fonts, images or network requests. System font stack. Put `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">` first in `<head>`.
- Light and dark themes via `prefers-color-scheme` (mockups may keep the app's own theme), readable contrast. Rows stack at phone width; max width about 1040px.
- Calm: neutral greys, one accent, green for after and red for before, subtle borders, no gradients or emoji.
- A `<title>` of a few words: it names the file and the browser tab.
