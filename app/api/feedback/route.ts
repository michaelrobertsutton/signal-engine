import { upsertFeedback } from '@/lib/db/queries';

export async function POST(request: Request) {
  const { artifactId, rating } = await request.json() as { artifactId: string; rating: 'up' | 'down' };
  if (!artifactId || !['up', 'down'].includes(rating)) {
    return new Response('Bad request', { status: 400 });
  }
  await upsertFeedback(artifactId, rating);
  return Response.json({ ok: true });
}
