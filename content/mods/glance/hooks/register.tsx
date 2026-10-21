// Blueprints glance mod: shows, above the prompt, that the glance hook is making a page of the last reply,
// and offers to open the page once it's ready (the hook opens it behind the terminal).
//
// The hook (blueprints/hooks/glance.mjs) records each page it makes in a small file in the user's own
// ~/.claude/blueprints/glance-jobs/, named after the session: `making`, then `ready` (with the page) or `failed`.
// After each reply this mod watches that folder for a little while, for as long as a page is being made,
// and until a failure has been shown. Elsewhere (no glance hook, or Codex) it never finds anything.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GlanceJob } from '../types'

const POLL_MS = 1500
// The hook starts a page right after the reply; the writer gives up after 10 minutes
const WATCH_AFTER_REPLY_MS = 20_000
const MAKING_GIVES_UP_MS = 11 * 60_000
const SHOW_FAILED_MS = 30_000
const SPINNER = ['◐', '◓', '◑', '◒']

const jobs = atom({ plugin: 'blueprints-glance', key: 'jobs' } as const, [])
const now = atom({ plugin: 'blueprints-glance', key: 'now' } as const, 0)
const hidden = atom({ plugin: 'blueprints-glance', key: 'hidden' } as const, [])

type Engine = EngineInterface

/** The records folder: where the hook writes, under Claude Code's own config folder */
async function recordsDir($: Engine): Promise<string | undefined> {
  const config = await $.env.get('CLAUDE_CONFIG_DIR')
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
  const base = config || (home ? `${home.replace(/[\\/]+$/, '')}/.claude` : undefined)
  return base === undefined ? undefined : `${base}/blueprints/glance-jobs`
}

/**
 * This session's pages, as the hook recorded them: the ones worth showing now. A page finished before this
 * run began (a resumed session) isn't news, unless this run saw it being made.
 */
async function look($: Engine, since: number, seen: Set<string>): Promise<GlanceJob[]> {
  const at = await $.clock.now()
  const dir = await recordsDir($)
  if (dir === undefined) return []
  const session = await $.session.id()
  const gone = new Set(await read($, hidden))
  const found: GlanceJob[] = []
  for (const entry of await $.fs.list(dir).catch(() => [])) {
    if (entry.kind !== 'file' || !entry.name.startsWith(`${session}.`) || !entry.name.endsWith('.json')) continue
    const job = await $.fs.read(`${dir}/${entry.name}`)
      .then(text => ({ ...(JSON.parse(text) as GlanceJob), id: entry.name }))
      .catch(() => undefined)
    if (!job || typeof job.startedAt !== 'number' || gone.has(job.id)) continue
    if (job.state === 'making') seen.add(job.id)
    else if ((job.finishedAt ?? job.startedAt) < since && !seen.has(job.id)) continue
    const isShown = job.state === 'making'
      ? at - job.startedAt < MAKING_GIVES_UP_MS
      : job.state === 'ready'
        ? typeof job.page === 'string'
        : at - (job.finishedAt ?? job.startedAt) < SHOW_FAILED_MS
    if (isShown) found.push(job)
  }
  return found.sort((a, b) => a.startedAt - b.startedAt)
}

/** Brings a ready page to the front: an .html file that is there (the record is the user's own, never a project's) */
async function openPage($: Engine, job: GlanceJob): Promise<void> {
  const stat = job.page ? await $.fs.stat(job.page, { resolve: true }).catch(() => undefined) : undefined
  const page = stat?.kind === 'file' ? stat.realPath : undefined
  if (page === undefined || !page.toLowerCase().endsWith('.html')) {
    $.ui.toast('That glance page is no longer there')
    return
  }
  const opener = await $.env.get('BLUEPRINTS_GLANCE_OPENER')
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const tries = isWindows
    ? [['cmd', '/c', 'start', '', page]]
    : opener
      ? [['/bin/sh', '-c', `${opener} "$1"`, 'glance', page]]
      : [['open', page], ['xdg-open', page]]
  for (const argv of tries) {
    const ran = await $.process.run(argv, { timeoutMs: 10_000 }).catch(() => undefined)
    if (ran?.exitCode === 0) return
  }
  $.ui.toast(`Couldn't open ${page}`)
}

/** A row that needs looking at again: still being made, or a failure still on show */
const isLive = (job: GlanceJob, at: number) => job.state === 'making'
  || (job.state === 'failed' && at - (job.finishedAt ?? job.startedAt) < SHOW_FAILED_MS + POLL_MS)

export const register: Register = on => {
  let watchUntil = 0
  let since = 0
  const seen = new Set<string>()

  // One timer for the session: it looks at the folder only while there's reason to
  on('session.start', async ($, e, next) => {
    since = await $.clock.now()
    watchUntil = since + WATCH_AFTER_REPLY_MS
    $.clock.every(POLL_MS, async () => {
      const at = await $.clock.now()
      const shown = await read($, jobs)
      if (at > watchUntil && !shown.some(job => isLive(job, at))) return
      const found = await look($, since, seen)
      await update($, jobs, () => found)
      if (found.some(job => job.state === 'making')) await update($, now, () => at)
    })
    return next(e)
  })

  // A reply on the main thread is when the hook may start a page
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) watchUntil = (await $.clock.now()) + WATCH_AFTER_REPLY_MS
    return next(e)
  })

  // Moving on puts away what's done
  on('prompt.submit', async ($, e, next) => {
    const done = (await read($, jobs)).filter(job => job.state !== 'making').map(job => job.id)
    if (done.length) {
      await update($, hidden, ids => [...(ids ?? []), ...done])
      await update($, jobs, list => (list ?? []).filter(job => job.state === 'making'))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, jobs)
    if (e.props.hasSurvey || list.length === 0) return next(e)
    const at = await read($, now)
    const { Box, Button, Text } = $.ui.resolve(e)
    const hide = (job: GlanceJob) => async () => {
      await update($, hidden, ids => [...(ids ?? []), job.id])
      await update($, jobs, rows => (rows ?? []).filter(row => row.id !== job.id))
    }

    return (
      <Box flexDirection="column">
        {list.map(job => {
          if (job.state === 'making') {
            const seconds = Math.max(0, Math.round((at - job.startedAt) / 1000))
            return (
              <Box key={job.id}>
                <Text color="claude">{SPINNER[Math.floor(at / POLL_MS) % SPINNER.length]} </Text>
                <Text dimColor>Making a glance page of the last reply… {seconds}s</Text>
              </Box>
            )
          }
          if (job.state === 'ready') {
            return (
              <Box key={job.id}>
                <Text color="success">✓ </Text>
                <Text>Glance page ready: {job.title || 'your last reply'} </Text>
                <Button key={`open:${job.id}`} label="Open" onPress={() => openPage($, job)} />
                <Text> </Text>
                <Button key={`hide:${job.id}`} label="Hide" onPress={hide(job)} />
              </Box>
            )
          }
          return (
            <Box key={job.id}>
              <Text color="error">✗ </Text>
              <Text dimColor>No glance page this time: {job.reason || 'see the .glance.log in the pages folder'}</Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
