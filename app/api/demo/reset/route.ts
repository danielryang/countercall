// POST /api/demo/reset: archive live cases, keep seeded history, clear call limits. Idempotent. Session + DEMO_ENABLED, else 404.
import { requireDemo } from '@/lib/auth';
import { resetDemo } from '@/lib/demo';

export const maxDuration = 30;

export async function POST(req: Request) {
  const gate = requireDemo(req);
  if (gate instanceof Response) return gate;
  return Response.json(await resetDemo());
}
