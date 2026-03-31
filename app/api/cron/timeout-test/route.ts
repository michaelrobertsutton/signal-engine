export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 120_000));
  const elapsed = Date.now() - start;

  return Response.json({ ok: true, slept_ms: elapsed });
}
