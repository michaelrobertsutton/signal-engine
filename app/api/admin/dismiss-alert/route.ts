import { resolveAlertsByType } from '@/lib/db/queries';

export async function POST(request: Request) {
  const { eventType } = await request.json() as { eventType: string };
  if (!eventType) return new Response('Missing eventType', { status: 400 });
  await resolveAlertsByType(eventType);
  return Response.json({ ok: true });
}
