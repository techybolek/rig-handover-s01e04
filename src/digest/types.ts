export type Status = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: Status;
  lastError: string | null;
  first: string;
  last: string;
};

export type Night = { rows: DigestRow[]; badLines: number };

// null: no runs/<night>.jsonl on disk. Rows are sorted by job.
export type ReadNight = (runsDir: string, night: string) => Night | null;
