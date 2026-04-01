'use client';

import { useState } from 'react';

export default function FeedbackButtons({ artifactId }: { artifactId: string }) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  async function vote(rating: 'up' | 'down') {
    const next = voted === rating ? null : rating;
    setVoted(next);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artifactId, rating: next }),
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => vote('up')}
        title="Useful"
        className={`rounded p-1 text-sm transition-colors ${
          voted === 'up' ? 'text-green-400' : 'text-zinc-600 hover:text-zinc-300'
        }`}
      >
        ▲
      </button>
      <button
        onClick={() => vote('down')}
        title="Not useful"
        className={`rounded p-1 text-sm transition-colors ${
          voted === 'down' ? 'text-red-400' : 'text-zinc-600 hover:text-zinc-300'
        }`}
      >
        ▼
      </button>
    </div>
  );
}
