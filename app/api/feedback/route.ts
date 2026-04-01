import { upsertFeedback, clearFeedback } from '@/lib/db/queries';

export async function POST(request: Request) {
  const { artifactId, rating } = await request.json() as { artifactId: string; rating: 'up' | 'down' | null };
  if (!artifactId) return new Response('Bad request', { status: 400 });
  if (rating === null) {
    await clearFeedback(artifactId);
  } else if (['up', 'down'].includes(rating)) {
    await upsertFeedback(artifactId, rating);
  } else {
    return new Response('Bad request', { status: 400 });
  }
  return Response.json({ ok: true });
}
