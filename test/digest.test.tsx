import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

function appWith(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return createApp({ ...base, runsDir: dir });
}

const line = (job: string, status: string, at = '2026-10-29T01:00:00+01:00') =>
  JSON.stringify({ at, job, status, owner: 'rook' });

describe('digest routes', () => {
  it('page and JSON list the same jobs in the same order', async () => {
    const app = createApp({ ...base, runsDir: 'runs' });
    const page = await app.request('/digest/2026-10-28');
    const api = await app.request('/api/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const jobs = ((await api.json()) as { job: string }[]).map((r) => r.job);
    const html = await page.text();
    const positions = jobs.map((j) => html.indexOf(`<td>${j}</td>`));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('404 for a night with no file', async () => {
    const app = appWith({});
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const app = appWith({ '2026-01-02.jsonl': '' });
    expect(await (await app.request('/digest/2026-01-02')).text()).toContain('nothing ran');
    expect(await (await app.request('/api/digest/2026-01-02')).json()).toEqual([]);
  });

  it('a bad line is skipped, the night still renders', async () => {
    const app = appWith({ '2026-01-03.jsonl': `${line('a/b', 'ok')}\nnot json\n` });
    const res = await app.request('/digest/2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/b');
    expect(html).toContain('1 unreadable line skipped');
  });

  it('marks 3+ retries and fails; shows — for a null owner', async () => {
    const app = appWith({
      '2026-01-04.jsonl': [line('r', 'retry'), line('r', 'retry'), line('r', 'retry'), line('f', 'fail'), JSON.stringify({ at: 'x', job: 'n', status: 'ok', owner: null })].join('\n'),
    });
    const html = await (await app.request('/digest/2026-01-04')).text();
    expect(html).toContain('3 ⚠');
    expect(html).toContain('fail ✗');
    expect(html).toContain('<td>—</td>');
  });
});

describe('board links', () => {
  it('links each night to its digest with counts', async () => {
    const html = await (await createApp({ ...base, runsDir: 'runs' }).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
  });
});
