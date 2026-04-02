import { cookies } from 'next/headers';
import { getRecentLog } from '@/lib/db/queries';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  if (!session || session.value !== process.env.SESSION_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const log = await getRecentLog(50);
  return Response.json({ ok: true, log });
}
