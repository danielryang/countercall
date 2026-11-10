// app/api/webhooks/resend/route.ts  (FALLBACK ingestion: Resend receiving, free <id>.resend.app address, no DNS)
import { after, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getDeps } from '@/lib/detect/deps';
import { ingestEmail } from '@/lib/detect/ingest';
import { normalizeResend } from '@/lib/detect/resend';

export const runtime = 'nodejs';
export const maxDuration = 60;
let client: Resend | undefined;
const resend = () => (client ??= new Resend(process.env.RESEND_API_KEY));   // lazy: see 08 section 0.5

export async function POST(req: NextRequest) {
  const payload = await req.text();
  let event: any;
  try {
    resend().webhooks.verify({ payload, headers: { id: req.headers.get('svix-id')!, timestamp: req.headers.get('svix-timestamp')!, signature: req.headers.get('svix-signature')! }, webhookSecret: process.env.RESEND_WEBHOOK_SECRET! });
    event = JSON.parse(payload);
  } catch { return new Response('invalid signature', { status: 400 }); }
  if (event.type !== 'email.received') return new Response(null, { status: 204 });
  after(async () => {
    const { data, error } = await resend().emails.receiving.get(event.data.email_id); // webhook has metadata only
    if (error || !data) return console.error('resend fetch failed', error);
    await ingestEmail(normalizeResend(data as any), await getDeps({ provider: 'resend', payload: event }));
  });
  return new Response(null, { status: 204 });
}
