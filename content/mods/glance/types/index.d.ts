/** One page the glance hook makes, as it records it in {tasks}/pages/.jobs/<session>.<hash>.json */
export type GlanceJob = {
  /** The record's file name */
  id: string;
  state: 'making' | 'ready' | 'failed';
  startedAt: number;
  finishedAt?: number;
  /** The page's title and path, once ready */
  title?: string;
  page?: string;
  /** Why no page came, when it failed */
  reason?: string;
};

declare module 'claude-code' {
  interface PluginState {
    'blueprints-glance': { jobs: GlanceJob[]; now: number; hidden: string[] };
  }
}
