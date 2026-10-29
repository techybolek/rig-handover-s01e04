import type { Night } from '../digest/types.js';

export function DigestPage({ night, data }: { night: string; data: Night }) {
  return (
    <>
      <h1>digest · {night}</h1>
      {data.badLines > 0 && <p class="warn">{data.badLines} unreadable line{data.badLines === 1 ? '' : 's'} skipped</p>}
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr><th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th><th>last error</th><th>first</th><th>last</th></tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const flagged = r.retries >= 3 || r.lastStatus === 'fail';
              return (
                <tr class={flagged ? 'warn' : undefined}>
                  <td>{r.job}</td>
                  <td>{r.owner ?? '—'}</td>
                  <td>{r.runs}</td>
                  <td>{r.retries}{r.retries >= 3 ? ' ⚠' : ''}</td>
                  <td>{r.lastStatus}{r.lastStatus === 'fail' ? ' ✗' : ''}</td>
                  <td>{r.lastError ?? '—'}</td>
                  <td>{r.first}</td>
                  <td>{r.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
