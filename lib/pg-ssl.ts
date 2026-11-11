// lib/pg-ssl.ts: the TLS setting for every postgres.js client (lib/store.ts, scripts/db-apply.ts). The connection is encrypted by default, like
// libpq's sslmode=require (TLS on, certificate not checked), so database traffic never crosses the network in plain text. The URL still decides
// when it says so (?sslmode=disable, verify-full, ...), and a database on this machine (the tests' fake pooler, a local Postgres) is left alone.

const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** 'require' for a remote database whose URL does not choose an sslmode itself; undefined otherwise (let postgres.js read the URL). */
export function sslFor(url: string | undefined): 'require' | undefined {
  if (!url || /[?&](sslmode|ssl)=/i.test(url)) return undefined;
  const start = url.indexOf('://');
  if (start < 0) return undefined;
  const authority = url.slice(start + 3).split(/[/?#]/)[0];
  const hostPort = authority.slice(authority.lastIndexOf('@') + 1);
  const host = (hostPort.startsWith('[') ? hostPort.slice(0, hostPort.indexOf(']') + 1) : hostPort.split(':')[0]).toLowerCase();
  return host && !LOCAL.has(host) ? 'require' : undefined;
}
