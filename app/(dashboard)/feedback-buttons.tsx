'use client';

import { useState } from 'react';

export default function FeedbackButtons({ artifactId }: { artifactId: string }) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  async function vote(rating: 'up' | 'down') {
    setVoted(rating);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artifactId, rating }),
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => vote('up')}
        disabled={voted !== null}
        title="Useful"
        className={`rounded p-1 text-sm transition-colors disabled:cursor-default ${
          voted === 'up'
            ? 'text-green-400'
            : 'text-zinc-600 hover:text-zinc-300'
        }`}
      >
        ▲
      </button>
      <button
        onClick={() => vote('down')}
        disabled={voted !== null}
        title="Not useful"
        className={`rounded p-1 text-sm transition-colors disabled:cursor-default ${
          voted === 'down'
            ? 'text-red-400'
            : 'text-zinc-600 hover:text-zinc-300'
        }`}
      >
        ▼
      </button>
    </div>
  );
}
