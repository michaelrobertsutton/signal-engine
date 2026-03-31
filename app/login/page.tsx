import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function login(formData: FormData) {
  'use server';
  const passphrase = formData.get('passphrase')?.toString() ?? '';
  if (passphrase !== process.env.DASHBOARD_PASSPHRASE) {
    redirect('/login?error=1');
  }
  const cookieStore = await cookies();
  cookieStore.set('session', process.env.SESSION_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  redirect('/');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Signal Engine</h1>
          <p className="mt-1 text-sm text-zinc-400">Enter passphrase to continue</p>
        </div>

        <form action={login} className="space-y-4">
          <input
            type="password"
            name="passphrase"
            placeholder="Passphrase"
            autoFocus
            required
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          {error && (
            <p className="text-xs text-red-400">Incorrect passphrase.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
