// scripts/db-apply.ts  (npm run db:apply [prefix...]): applies db/*.sql in filename order against DATABASE_URL.
// 001 is NOT idempotent (create type/table). Reset = run `drop schema public cascade; create schema public;` in the Supabase SQL editor, then re-apply.
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = postgres(url, { prepare: false, max: 1 });
const only = process.argv.slice(2);
const dir = new URL('../db/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.sql') && (!only.length || only.some((o) => f.startsWith(o)))).sort();
for (const f of files) { console.log('apply', f); await sql.unsafe(readFileSync(new URL(f, dir), 'utf8')); }
await sql.end();
