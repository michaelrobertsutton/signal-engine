'use client';

import { useState } from 'react';

export default function RunNowButton() {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleClick() {
    setState('running');
    try {
      const res = await fetch('/api/admin/trigger-analysis', {
        method: 'POST',
        // Session cookie sent automatically — proxy.ts handles auth
      });
      const data = await res.json();
      setMessage(data.message ?? `Processed ${data.processed} items`);
      setState('done');
    } catch (err) {
      setMessage(String(err));
      setState('error');
    }
    setTimeout(() => setState('idle'), 4000);
  }

  return (
    <div className="flex items-center gap-3">
      {(state === 'done' || state === 'error') && (
        <span className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-zinc-400'}`}>
          {message}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={state === 'running'}
        className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'running' ? 'Running...' : 'Run Now'}
      </button>
    </div>
  );
}
