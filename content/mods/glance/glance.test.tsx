// Run with `claude plugin test <this mod's folder>`. Not shipped: the installer leaves *.test.* files out.

import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const ROOT = '/proj'
const PAGES = `${ROOT}/tasks/pages`
const RECORDS = '/home/me/.claude/blueprints/glance-jobs'
/** What sits beneath the plugin in a session: the engine draws the band, shows toasts and takes prompts */
function engine(on: On, toasts: string[]) {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', (_, e) => ({ text: e.text }))
}

const BAND = {
  plugin: 'blueprints-glance',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('shows a page being made, then offers to open it, for this session only', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.env(on, { HOME: '/home/me' })
  const listed: string[] = []
  const records: Record<string, object> = {
    'sess-1.aaa.json': { state: 'making', startedAt: 1_000_000 },
    'other.bbb.json': { state: 'making', startedAt: 1_000_000 },
  }
  const opened: (readonly string[])[] = []
  const toasts: string[] = []
  engine(on, toasts)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: ROOT }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('fs.list', (_, e) => {
    listed.push(e.path)
    return { value: Object.keys(records).map(name => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })) }
  })
  on('fs.read', (_, e) => ({ value: JSON.stringify(records[e.path.split('/').pop() ?? '']) }))
  on('fs.stat', (_, e) => ({ value: { kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false, realPath: e.path } }))
  on('process.run', (_, e) => {
    opened.push(e.argv)
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await clock.advance(3_000)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await band.find({ type: 'Text', text: /Making a glance page/ }))?.text).toBe('Making a glance page of the last reply… 3s')
  expect(await band.findAll({ type: 'Text', text: /Making a glance page/ })).toHaveLength(1) // not the other session's
  expect(listed[0]).toBe(RECORDS) // the user's own folder, never a project's

  records['sess-1.aaa.json'] = { state: 'ready', startedAt: 1_000_000, finishedAt: 1_004_000, page: `${PAGES}/2026-10-21-1400-fixes.html`, title: 'Fixes & next steps' }
  await clock.advance(1_500)
  expect(await band.find({ type: 'Text', text: /Glance page ready: Fixes & next steps/ })).toBeTruthy()

  await band.press({ key: 'open:sess-1.aaa.json' })
  expect(opened).toEqual([['open', `${PAGES}/2026-10-21-1400-fixes.html`]])

  await band.press({ key: 'hide:sess-1.aaa.json' })
  expect(await band.find({ type: 'Text', text: /Glance page ready/ })).toBeUndefined()
  await band.unmount()
})

test('opens only an .html file, and stays out of the way with nothing to show', async ($, on) => {
  const clock = mock.clock(on, { now: 2_000_000 })
  mock.env(on, { HOME: '/home/me' })
  const opened: (readonly string[])[] = []
  const toasts: string[] = []
  engine(on, toasts)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: ROOT }))
  on('session.id', () => ({ value: 'sess-2' }))
  on('fs.list', () => ({ value: [{ name: 'sess-2.ccc.json', kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false }] }))
  on('fs.read', () => ({ value: JSON.stringify({ state: 'ready', startedAt: 2_000_000, finishedAt: 2_001_000, page: '/etc/passwd', title: 'x' }) }))
  on('fs.stat', (_, e) => ({ value: { kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false, realPath: e.path } }))
  on('process.run', (_, e) => {
    opened.push(e.argv)
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await clock.advance(1_500)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await band.press({ key: 'open:sess-2.ccc.json' })
  expect(opened).toEqual([])
  expect(toasts).toEqual(['That glance page is no longer there'])

  // After the next prompt the finished page is put away, and the engine draws the band
  await $.prompt.submit({ text: 'next', wait: false, origin: { kind: 'composer' } })
  await clock.advance(1_500)
  await band.redraw()
  expect((await band.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await band.unmount()
})

test('a resumed session doesn\'t bring back pages it finished before', async ($, on) => {
  const clock = mock.clock(on, { now: 5_000_000 })
  mock.env(on, { CLAUDE_CONFIG_DIR: '/cfg' })
  const toasts: string[] = []
  engine(on, toasts)
  const records: Record<string, object> = {
    'sess-3.old.json': { state: 'ready', startedAt: 1_000_000, finishedAt: 1_040_000, page: `${PAGES}/old.html`, title: 'Old' },
    'sess-3.bad.json': { state: 'failed', startedAt: 4_990_000, finishedAt: 4_995_000, reason: 'x' },
  }
  const listed: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: ROOT }))
  on('session.id', () => ({ value: 'sess-3' }))
  on('fs.list', (_, e) => {
    listed.push(e.path)
    return { value: Object.keys(records).map(name => ({ name, kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })) }
  })
  on('fs.read', (_, e) => ({ value: JSON.stringify(records[e.path.split('/').pop() ?? '']) }))

  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await clock.advance(1_500)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(listed[0]).toBe('/cfg/blueprints/glance-jobs')
  expect((await band.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')

  // A page made in this run that fails shows its failure, then clears by itself
  records['sess-3.new.json'] = { state: 'making', startedAt: 5_001_500 }
  await clock.advance(1_500)
  records['sess-3.new.json'] = { state: 'failed', startedAt: 5_001_500, finishedAt: 5_004_000, reason: 'claude wrote no page' }
  await clock.advance(1_500)
  expect(await band.find({ type: 'Text', text: /No glance page this time: claude wrote no page/ })).toBeTruthy()
  await clock.advance(40_000)
  await band.redraw()
  expect((await band.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await band.unmount()
})
