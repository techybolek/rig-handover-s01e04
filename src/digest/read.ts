import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, Status } from './types.js';

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

type Line = { at: string; job: string; status: Status; owner: string | null; error: string | null };

function parseLine(text: string): Line | null {
  try {
    const o: unknown = JSON.parse(text);
    if (typeof o !== 'object' || o === null) return null;
    const r = o as Record<string, unknown>;
    if (typeof r.at !== 'string' || typeof r.job !== 'string') return null;
    if (typeof r.status !== 'string' || !STATUSES.includes(r.status)) return null;
    return {
      at: r.at,
      job: r.job,
      status: r.status as Status,
      owner: typeof r.owner === 'string' ? r.owner : null,
      error: typeof r.error === 'string' ? r.error : null,
    };
  } catch {
    return null;
  }
}

export function readNight(runsDir: string, night: string): Night | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;
  const counts: Record<Status, number> = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const l = parseLine(raw);
    if (!l) {
      badLines++;
      continue;
    }
    counts[l.status]++;
    const row = byJob.get(l.job);
    if (!row) {
      byJob.set(l.job, {
        job: l.job,
        owner: l.owner,
        runs: 1,
        retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status,
        lastError: l.error,
        first: l.at,
        last: l.at,
      });
    } else {
      row.runs++;
      if (l.status === 'retry') row.retries++;
      row.lastStatus = l.status;
      row.lastError = l.error;
      row.last = l.at;
      row.owner = l.owner ?? row.owner;
    }
  }
  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { rows, badLines, counts };
}
