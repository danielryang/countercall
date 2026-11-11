// lib/testing/fake-pooler.ts: a tiny Postgres wire server on localhost that behaves like Supabase's transaction pooler did on the wire:
// when one TCP write carries several statements (postgres.js pipelining), only the FIRST is answered. Enough protocol for postgres.js:
// trust auth, simple Query, unnamed extended Parse/Describe/Bind/Execute/Sync, BEGIN/COMMIT. Statements look like `select <v> as <name>`.
import net from 'node:net';

const msg = (type: string, body: Buffer) => { const h = Buffer.alloc(5); h.write(type, 0, 'latin1'); h.writeUInt32BE(body.length + 4, 1); return Buffer.concat([h, body]); };
const cstr = (s: string) => Buffer.concat([Buffer.from(s, 'utf8'), Buffer.from([0])]);
const i32 = (n: number) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
const i16 = (n: number) => { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; };
const rowDesc = (cols: [string, number][]) => msg('T', Buffer.concat([i16(cols.length), ...cols.map(([n, oid]) => Buffer.concat([cstr(n), i32(0), i16(0), i32(oid), i16(-1), i32(-1), i16(0)]))]));
const dataRow = (vals: string[]) => msg('D', Buffer.concat([i16(vals.length), ...vals.map((v) => { const b = Buffer.from(v); return Buffer.concat([i32(b.length), b]); })]));

export interface FakePooler { url: string; answered: string[]; dropped: string[]; close(): Promise<void> }

export async function startFakePooler(): Promise<FakePooler> {
  const answered: string[] = [], dropped: string[] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer((sock) => {
    sockets.add(sock); sock.on('close', () => sockets.delete(sock));
    let started = false, inTx = false;
    const reply = (text: string, extended: boolean) => {
      const t = text.trim();
      const tx = /^(begin|commit|rollback)\b/i.exec(t)?.[1].toUpperCase();
      const types = /pg_catalog\.pg_type/.test(t);
      const m = /^select\s+(.+?)\s+as\s+(\w+)\s*$/i.exec(t);
      const out: Buffer[] = [];
      if (extended) out.push(msg('1', Buffer.alloc(0)), msg('t', i16(0)));
      if (tx) { if (extended) out.push(msg('n', Buffer.alloc(0)), msg('2', Buffer.alloc(0))); inTx = tx === 'BEGIN'; out.push(msg('C', cstr(tx))); }
      else if (types) { out.push(rowDesc([['oid', 26], ['typarray', 26]])); if (extended) out.push(msg('2', Buffer.alloc(0))); out.push(msg('C', cstr('SELECT 0'))); }
      else if (m) { out.push(rowDesc([[m[2], 25]])); if (extended) out.push(msg('2', Buffer.alloc(0))); out.push(dataRow([m[1].replace(/^'|'$/g, '')]), msg('C', cstr('SELECT 1'))); }
      else throw new Error(`fake pooler: unsupported statement ${t}`);
      out.push(msg('Z', Buffer.from(inTx ? 'T' : 'I')));
      sock.write(Buffer.concat(out));
    };
    sock.on('data', (chunk: Buffer) => {
      let i = 0;
      if (!started) {   // StartupMessage: no type byte. Trust auth.
        i = chunk.readUInt32BE(0); started = true;
        sock.write(Buffer.concat([msg('R', i32(0)), msg('K', Buffer.concat([i32(1), i32(2)])), msg('Z', Buffer.from('I'))]));
      }
      // Group this write into statements (a simple Query, or Parse..Sync); answer the first, drop the rest (the observed pooler behavior).
      const units: { text: string; extended: boolean }[] = [];
      let parseText: string | null = null;
      while (i < chunk.length) {
        const type = String.fromCharCode(chunk[i]); const len = chunk.readUInt32BE(i + 1); const body = chunk.subarray(i + 5, i + 1 + len); i += 1 + len;
        if (type === 'Q') units.push({ text: body.toString('utf8', 0, body.indexOf(0)), extended: false });
        else if (type === 'P') { const nameEnd = body.indexOf(0); parseText = body.toString('utf8', nameEnd + 1, body.indexOf(0, nameEnd + 1)); }
        else if (type === 'S' && parseText !== null) { units.push({ text: parseText, extended: true }); parseText = null; }
        else if (type === 'X') { sock.end(); return; }
      }
      units.forEach((u, k) => { if (k === 0) { answered.push(u.text.trim()); reply(u.text, u.extended); } else dropped.push(u.text.trim()); });
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as net.AddressInfo;
  return {
    url: `postgres://test@127.0.0.1:${port}/test`, answered, dropped,
    close: () => new Promise<void>((r) => { for (const s of sockets) s.destroy(); server.close(() => r()); }),
  };
}
